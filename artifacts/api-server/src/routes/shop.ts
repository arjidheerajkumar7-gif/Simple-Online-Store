import {
  Router,
  type IRouter,
  type Request,
  type Response as ExpressResponse,
} from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  ListProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type SupabaseProduct = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  image: string;
  description: string;
  badge: string | null;
  tint: string;
};

class SupabaseRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super("Supabase request failed");
    this.name = "SupabaseRequestError";
  }
}

function getSupabaseConfig(): { restUrl: string; serviceRoleKey: string } {
  const rawUrl = process.env.SUPER_BASE_URL;
  const serviceRoleKey = process.env.SERVICE_ROLE_API;
  if (!rawUrl || !serviceRoleKey) {
    throw new SupabaseRequestError(503);
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawUrl);
  } catch {
    throw new SupabaseRequestError(503);
  }

  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
  if (
    (baseUrl.protocol !== "https:" && !(isLocalHost && baseUrl.protocol === "http:")) ||
    baseUrl.pathname !== "/"
  ) {
    throw new SupabaseRequestError(503);
  }

  return {
    restUrl: `${baseUrl.origin}/rest/v1`,
    serviceRoleKey,
  };
}

async function supabaseRequest<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const { restUrl, serviceRoleKey } = getSupabaseConfig();
  let response: globalThis.Response;
  try {
    response = await fetch(`${restUrl}${endpoint}`, {
      ...init,
      signal: AbortSignal.timeout(10_000),
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        accept: "application/json",
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new SupabaseRequestError(503);
  }

  const responseText = await response.text();
  if (!response.ok) {
    let code: string | undefined;
    try {
      const payload = JSON.parse(responseText) as { code?: unknown };
      if (typeof payload.code === "string") code = payload.code;
    } catch {
      // Keep upstream error content and credentials out of logs and responses.
    }
    throw new SupabaseRequestError(response.status, code);
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new SupabaseRequestError(502);
  }
}

function reportDatabaseUnavailable(
  req: Request,
  res: ExpressResponse,
  error: unknown,
): void {
  if (error instanceof SupabaseRequestError) {
    req.log.error(
      { status: error.status, code: error.code },
      "Supabase request failed",
    );
  } else {
    req.log.error({ err: error }, "Unexpected store database error");
  }

  if (
    error instanceof SupabaseRequestError &&
    ["PGRST202", "PGRST205", "42P01"].includes(error.code ?? "")
  ) {
    res.status(503).json({
      error: "The Supabase store schema is missing. Run the setup script in the Supabase SQL Editor.",
    });
    return;
  }

  if (
    error instanceof SupabaseRequestError &&
    error.status === 400 &&
    error.code !== "PGRST202" &&
    error.code !== "PGRST205"
  ) {
    res.status(400).json({
      error: "One or more products are no longer available. Refresh the shop and try again.",
    });
    return;
  }

  res.status(503).json({
    error: "The store database is not ready or is temporarily unavailable.",
  });
}

router.get("/products", async (req, res): Promise<void> => {
  const query = new URLSearchParams({
    select: "id,name,category,price_cents,image,description,badge,tint",
    is_active: "eq.true",
    order: "sort_order.asc",
  });

  try {
    const rows = await supabaseRequest<SupabaseProduct[]>(
      `/products?${query.toString()}`,
    );
    const products = rows.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price_cents / 100,
      image: product.image,
      description: product.description,
      badge: product.badge,
      tint: product.tint,
    }));
    res.json(ListProductsResponse.parse(products));
  } catch (error) {
    reportDatabaseUnavailable(req, res, error);
  }
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues.length }, "Invalid order request");
    res.status(400).json({ error: "Please check the order details and try again." });
    return;
  }

  try {
    const result = await supabaseRequest<unknown>(
      "/rpc/create_little_market_order",
      {
        method: "POST",
        body: JSON.stringify({
          p_customer_name: parsed.data.customerName,
          p_customer_email: parsed.data.customerEmail,
          p_shipping_address: parsed.data.shippingAddress,
          p_items: parsed.data.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        }),
      },
    );
    res.status(201).json(CreateOrderResponse.parse(result));
  } catch (error) {
    reportDatabaseUnavailable(req, res, error);
  }
});

export default router;
