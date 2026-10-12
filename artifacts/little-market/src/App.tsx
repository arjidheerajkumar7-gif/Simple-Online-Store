import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useCreateOrder, useListProducts, type Product } from '@workspace/api-client-react';

type Cart = Record<string, number>;
type Customer = { name: string; email: string; address: string };
const CART_KEY = 'little-market-cart-v1';
const money = (amount: number) => `$${amount.toFixed(2)}`;
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function getSavedCart(): Cart {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) as Cart : {};
  } catch {
    return {};
  }
}

function ProductPhoto({ product, testId }: { product: Product; testId: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="product-image" style={{ '--product-bg': product.tint } as CSSProperties}>
      {!failed && <img data-testid={testId} src={product.image} alt={product.name} loading="lazy" onError={() => setFailed(true)} />}
      {failed && <div className="image-fallback" aria-hidden="true">{product.name.slice(0, 1)}</div>}
    </div>
  );
}

function requestErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  }
  return fallback;
}

function Storefront() {
  const {
    data: products,
    error: productsQueryError,
    isLoading: productsLoading,
    isError: productsError,
    refetch,
  } = useListProducts();
  const createOrder = useCreateOrder();
  const productList = products ?? [];
  const [cart, setCart] = useState<Cart>(getSavedCart);
  const [category, setCategory] = useState('Everything');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: '', email: '', address: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [orderId, setOrderId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);
  const categories = useMemo(
    () => ['Everything', ...Array.from(new Set(productList.map((product) => product.category)))],
    [productList],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () => category === 'Everything' ? productList : productList.filter((item) => item.category === category),
    [category, productList],
  );
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = productList.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0);
  const cartProducts = productList.filter((product) => (cart[product.id] ?? 0) > 0);

  const addToCart = (product: Product) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    setToast(`${product.name} added to your bag`);
  };
  const updateQuantity = (id: string, delta: number) => {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[id] ?? 0) + delta;
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  };
  const closeCheckout = () => {
    setCheckoutOpen(false);
    setConfirmed(false);
    createOrder.reset();
  };
  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createOrder.mutate(
      {
        data: {
          customerName: customer.name,
          customerEmail: customer.email,
          shippingAddress: customer.address,
          items: cartProducts.map((product) => ({
            productId: product.id,
            quantity: cart[product.id],
          })),
        },
      },
      {
        onSuccess: (order) => {
          setLastTotal(order.totalCents / 100);
          setOrderId(order.id);
          setCart({});
          setConfirmed(true);
        },
      },
    );
  };

  return (
    <div className="shop-shell">
      <div className="announcement" data-testid="text-shop-announcement">A little shop for everyday living · Packed with care</div>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Little Market home" data-testid="link-home">
          <span className="brand-mark"><ShoppingBag size={19} strokeWidth={2} /></span>
          <span className="brand-name">little market</span>
        </a>
        <span className="nav-note">Good things for your everyday.</span>
        <button className="cart-trigger" onClick={() => setCartOpen(true)} data-testid="button-open-cart" aria-label={`Open bag, ${itemCount} items`}>
          <ShoppingBag size={16} /><span>Your bag</span><span className="cart-count" data-testid="text-cart-count">{itemCount}</span>
        </button>
      </header>

      <section className="hero" aria-label="Welcome to Little Market">
        <div className="hero-copy">
          <span className="eyebrow">Thoughtful things, close at hand</span>
          <h1>The little things make <em>the day.</em></h1>
          <p>Useful, lovely things for the everyday. A small collection, picked with care and ready for wherever home is.</p>
          <button className="hero-cta" onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-shop-collection">
            Take a look <ArrowDown size={15} />
          </button>
        </div>
        <div className="hero-art" role="img" aria-label="A colorful market display of fresh everyday produce">
          <div className="hero-caption"><span>From our shelves to yours</span>Good things, no big fuss.</div>
        </div>
      </section>

      <main className="shop-main" id="shop">
        <div className="section-heading">
          <div>
            <h2>Find your everyday</h2>
            <p>A few things we think you'll love having around.</p>
          </div>
          <span className="product-count" data-testid="text-product-count">{filtered.length} little finds</span>
        </div>
        <div className="category-row" role="tablist" aria-label="Shop by category">
          {categories.map((item) => (
            <button key={item} role="tab" aria-selected={category === item} className={`category-chip${category === item ? ' active' : ''}`}
              onClick={() => setCategory(item)} data-testid={`button-category-${item.toLowerCase().replaceAll(' ', '-')}`}>
              {item}
            </button>
          ))}
        </div>
        {productsLoading ? (
          <div className="catalog-message" role="status" data-testid="status-products-loading">Gathering the good things...</div>
        ) : productsError ? (
          <div className="catalog-message catalog-error" role="alert" data-testid="status-products-error">
            <p>{requestErrorMessage(productsQueryError, 'The shop catalog is unavailable right now.')}</p>
            <button onClick={() => void refetch()} data-testid="button-retry-products">Try again</button>
          </div>
        ) : filtered.length ? (
          <div className="product-grid" data-testid="list-products">
            {filtered.map((product, index) => (
              <article className="product-card" key={product.id} data-testid={`card-product-${product.id}`} style={{ animationDelay: `${index * 45}ms` }}>
                <div className="product-image" style={{ '--product-bg': product.tint } as CSSProperties}>
                  <ProductPhoto product={product} testId={`img-product-${product.id}`} />
                  {product.badge && <span className="product-badge" data-testid={`badge-product-${product.id}`}>{product.badge}</span>}
                  <button className="add-button" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to bag`} data-testid={`button-add-${product.id}`}>
                    <Plus size={19} />
                  </button>
                </div>
                <div className="product-info">
                  <div className="product-category">{product.category}</div>
                  <div className="product-name-row">
                    <span className="product-name" data-testid={`text-product-name-${product.id}`}>{product.name}</span>
                    <span className="product-price" data-testid={`text-product-price-${product.id}`}>{money(product.price)}</span>
                  </div>
                  <p className="product-description">{product.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results"><h3>Nothing on this shelf just yet.</h3><p>Try another category to see what we have.</p></div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner"><strong>little market</strong><span>Small things. Good days. Thanks for stopping by.</span></div>
      </footer>

      {cartOpen && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <aside className="drawer" aria-label="Your shopping bag" data-testid="panel-cart">
            <div className="drawer-head"><h2>Your bag <span style={{ fontSize: 14, color: '#849087' }}>({itemCount})</span></h2>
              <button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag" data-testid="button-close-cart"><X size={20} /></button>
            </div>
            {cartProducts.length ? (
              <>
                <div className="cart-lines" data-testid="list-cart-items">
                  {cartProducts.map((product) => (
                    <div className="cart-line" key={product.id} data-testid={`row-cart-${product.id}`}>
                      <div className="cart-thumb" style={{ '--product-bg': product.tint } as CSSProperties}>
                        <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                      </div>
                      <div>
                        <div className="cart-item-name">{product.name}</div>
                        <div className="cart-item-price">{money(product.price)} each</div>
                        <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                          <button onClick={() => updateQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`} data-testid={`button-decrease-${product.id}`}><Minus size={13} /></button>
                          <span data-testid={`text-quantity-${product.id}`}>{cart[product.id]}</span>
                          <button onClick={() => updateQuantity(product.id, 1)} aria-label={`Add one ${product.name}`} data-testid={`button-increase-${product.id}`}><Plus size={13} /></button>
                        </div>
                      </div>
                      <span className="line-total" data-testid={`text-line-total-${product.id}`}>{money(product.price * cart[product.id])}</span>
                    </div>
                  ))}
                </div>
                <div className="cart-bottom">
                  <div className="subtotal-row"><span>Subtotal</span><span data-testid="text-cart-subtotal">{money(subtotal)}</span></div>
                  <p className="demo-note">We’ll save this order in the shop database. No payment is collected.</p>
                  <button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} data-testid="button-checkout">Continue to checkout <ArrowRight size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button>
                </div>
              </>
            ) : (
              <div className="cart-empty" data-testid="empty-cart">
                <div className="cart-empty-mark"><ShoppingBag size={27} /></div>
                <h3>Your bag is taking a little break.</h3>
                <p>When something catches your eye, it'll be waiting right here.</p>
                <button className="checkout-button" onClick={() => setCartOpen(false)} data-testid="button-back-to-shop">Back to the shelves</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="modal-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCheckout(); }}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" data-testid="panel-checkout">
            {!confirmed ? (
              <>
                <div className="modal-top"><div><h2 id="checkout-title">A few details</h2><p>Your order will be saved for this demo. No payment is collected.</p></div>
                  <button className="icon-button" onClick={closeCheckout} aria-label="Close checkout" data-testid="button-close-checkout"><X size={20} /></button>
                </div>
                <form className="checkout-form" onSubmit={submitOrder} data-testid="form-checkout">
                  <div className="field"><label htmlFor="customer-name">YOUR NAME</label><input id="customer-name" name="name" autoComplete="name" placeholder="First and last name" required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} data-testid="input-customer-name" /></div>
                  <div className="field"><label htmlFor="customer-email">EMAIL ADDRESS</label><input id="customer-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} data-testid="input-customer-email" /></div>
                  <div className="field"><label htmlFor="customer-address">DELIVERY ADDRESS</label><input id="customer-address" name="address" autoComplete="street-address" placeholder="Where should we send the good things?" required value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} data-testid="input-customer-address" /></div>
                  <div className="checkout-summary"><span>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your bag</span><strong data-testid="text-checkout-total">{money(subtotal)}</strong></div>
                  {createOrder.isError && <p className="form-error" role="alert" data-testid="status-order-error">{requestErrorMessage(createOrder.error, 'We could not save your order. Please try again.')}</p>}
                  <button className="submit-button" type="submit" disabled={createOrder.isPending || cartProducts.length === 0} data-testid="button-place-demo-order">
                    {createOrder.isPending ? 'Saving your order...' : 'Save demo order'}
                  </button>
                </form>
              </>
            ) : (
              <div className="confirmation" data-testid="status-order-confirmation">
                <div className="confirmation-mark"><Check size={30} /></div>
                <span className="eyebrow">All set, {customer.name.split(' ')[0]}.</span>
                <h2>That was easy.</h2>
                <p>Your order has been saved in the shop database. No payment has been collected and nothing has shipped.</p>
                <div className="order-total" data-testid="text-order-id">Order · {orderId.slice(0, 8)}</div>
                <div className="order-total" data-testid="text-confirmation-total">Order total · {money(lastTotal)}</div>
                <button className="submit-button" onClick={closeCheckout} data-testid="button-finish-shopping">Back to the market</button>
              </div>
            )}
          </section>
        </div>
      )}
      {toast && <div className="toast-pop" role="status" data-testid="status-cart-feedback">{toast}</div>}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Storefront />
    </QueryClientProvider>
  );
}

export default App;
