export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  badge?: string;
  tint: string;
};

export const products: Product[] = [
  { id: 'olive-oil', name: 'Everyday olive oil', category: 'Pantry', price: 14, image: 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=700', description: 'A good little bottle for almost everything.', badge: 'Shop favorite', tint: '#d8ddbd' },
  { id: 'hand-soap', name: 'Citrus hand soap', category: 'Home & care', price: 9, image: 'https://images.pexels.com/photos/6621462/pexels-photo-6621462.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'Bright, clean hands. No fuss.', tint: '#f2d9ba' },
  { id: 'market-bag', name: 'Canvas market tote', category: 'On the go', price: 18, image: 'https://images.pexels.com/photos/5706277/pexels-photo-5706277.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'Room for the good stuff, again and again.', badge: 'Made to last', tint: '#e8d9bd' },
  { id: 'ceramic-mug', name: 'Sunday morning mug', category: 'Kitchen', price: 22, image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'A comfortable favorite for slow starts.', tint: '#d8e2d3' },
  { id: 'dish-brush', name: 'Beechwood dish brush', category: 'Home & care', price: 8, image: 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'A small upgrade for the sink side.', tint: '#ead8c3' },
  { id: 'linen-towel', name: 'Soft linen tea towel', category: 'Kitchen', price: 16, image: 'https://images.pexels.com/photos/6044224/pexels-photo-6044224.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'Washes beautifully. Gets better with time.', tint: '#d9e1d5' },
  { id: 'granola', name: 'Toasted oat granola', category: 'Pantry', price: 11, image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'Crunchy clusters for an unhurried breakfast.', badge: 'Small batch', tint: '#e7d7b9' },
  { id: 'beeswax-wraps', name: 'Beeswax food wraps', category: 'Kitchen', price: 15, image: 'https://images.pexels.com/photos/4099354/pexels-photo-4099354.jpeg?auto=compress&cs=tinysrgb&w=700', description: 'A handy little swap for leftovers.', tint: '#e5d5a7' },
];
