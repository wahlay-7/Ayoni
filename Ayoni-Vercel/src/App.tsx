import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Edit3,
  ImagePlus,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  UserRound,
  X
} from 'lucide-react';
import { hasSupabase, supabase } from './supabase';
import { seedProducts } from '../lib/products';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  description: string;
  sizes: string[];
  colors: string[];
  stock: Record<string, number>;
  image_urls?: string[] | null;
  created_at?: string;
};

type CartItem = Product & {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
};

type Order = {
  id: string;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  items: CartItem[];
  total: number;
  status: string;
  payment_status?: string;
  created_at?: string;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);

async function api(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  let token = '';

  if (supabase) {
    const sessionResult = await supabase.auth.getSession();
    token =
      sessionResult.data.session?.access_token || '';
  }

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set(
      'Authorization',
      'Bearer ' + token
    );
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const contentType =
    response.headers.get('content-type') || '';

  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data?.error
        ? data.error
        : 'Request failed (' +
          response.status +
          ')';

    throw new Error(message);
  }

  return data;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      // Auth state is handled by the admin/account components.
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProducts() {
    setLoading(true);

    try {
      const result = await api('/api/products');

      if (Array.isArray(result?.products)) {
        setProducts(result.products);
      } else {
        setProducts(seedProducts as Product[]);
      }
    } catch {
      setProducts(
        seedProducts.map((product, i) => ({
          ...product,
          id: 'demo-' + (i + 1)
        })) as Product[]
      );
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const values = products.map(
      (product) => product.category
    );

    return [
      'All',
      ...Array.from(new Set(values))
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === 'All' ||
        product.category === category;

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.description
          ?.toLowerCase()
          .includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1
        }
      ];
    });

    setToast(
      product.name + ' added to cart'
    );

    setTimeout(() => setToast(''), 2500);
  }

  function removeFromCart(id: string) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function updateQuantity(
    id: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity }
          : item
      )
    );
  }

  async function submitOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    const customer = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      address: String(
        form.get('address') || ''
      ),
      city: String(form.get('city') || '')
    };

    if (!cart.length) {
      setToast('Your cart is empty.');
      return;
    }

    try {
      const shipping = await api(
        '/api/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            customer,
            items: cart,
            total: cartTotal
          })
        }
      );

      setCart([]);
      setShowCheckout(false);
      setShowCart(false);

      if (shipping?.paymentUrl) {
        window.location.href =
          shipping.paymentUrl;
        return;
      }

      const whatsappNumber =
        import.meta.env
          .VITE_AYONI_WHATSAPP_NUMBER || '';

      if (whatsappNumber) {
        const message = [
          'Hello Ayoni, I would like to place an order.',
          '',
          'Name: ' + customer.name,
          'Phone: ' + customer.phone,
          'City: ' + customer.city,
          '',
          ...cart.map(
            (item) =>
              item.name +
              ' x' +
              item.quantity +
              ' — ' +
              formatPrice(
                item.price * item.quantity
              )
          ),
          '',
          'Total: ' +
            formatPrice(cartTotal)
        ].join('\n');

        const cleanNumber =
          whatsappNumber.replace(/\D/g, '');

        const whatsappUrl =
          'https://wa.me/' +
          cleanNumber +
          '?text=' +
          encodeURIComponent(message);

        window.open(
          whatsappUrl,
          '_blank',
          'noopener,noreferrer'
        );
      }

      setToast(
        'Order received successfully.'
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : 'Unable to place order.'
      );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              })
            }
            className="text-2xl font-bold tracking-[0.2em]"
          >
            AYONI
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#shop"
              className="text-sm text-white/70 hover:text-white"
            >
              Shop
            </a>

            <a
              href="#manifesto"
              className="text-sm text-white/70 hover:text-white"
            >
              Manifesto
            </a>

            <button
              onClick={() => setShowAdmin(true)}
              className="text-sm text-white/70 hover:text-white"
            >
              Admin
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowAccount(true)
              }
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="Account"
            >
              <UserRound size={20} />
            </button>

            <button
              onClick={() => setShowCart(true)}
              className="relative rounded-full p-2 hover:bg-white/10"
              aria-label="Shopping bag"
            >
              <ShoppingBag size={20} />

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6">
            <div>
              <p className="mb-5 text-sm uppercase tracking-[0.4em] text-white/50">
                Ilorin · Kwara · Nigeria
              </p>

              <h1 className="max-w-3xl text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
                Everyday style.
                <br />
                Elevated.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-white/60">
                Contemporary unisex fashion
                designed for movement,
                expression and everyday
                confidence.
              </p>

              <a
                href="#shop"
                className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-white/80"
              >
                Explore collection
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="aspect-[4/5] flex items-center justify-center">
                <ShoppingBag
                  size={80}
                  className="text-white/20"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="shop"
          className="mx-auto max-w-7xl px-4 py-20 md:px-6"
        >
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                Collection
              </p>

              <h2 className="mt-2 text-4xl font-bold">
                Shop Ayoni
              </h2>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <Search
                  size={17}
                  className="text-white/40"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search products"
                  className="w-52 bg-transparent text-sm outline-none placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() =>
                      setCategory(item)
                    }
                    className={
                      'rounded-full px-4 py-2 text-xs ' +
                      (category === item
                        ? 'bg-white text-black'
                        : 'border border-white/10 text-white/60 hover:text-white')
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <RefreshCw
                className="animate-spin text-white/40"
              />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 p-12 text-center text-white/50">
              No products found.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={() =>
                      addToCart(product)
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section
          id="manifesto"
          className="border-y border-white/10 bg-white/[0.03]"
        >
          <div className="mx-auto max-w-5xl px-4 py-24 text-center md:px-6">
            <ShieldCheck
              className="mx-auto mb-6 text-white/40"
              size={32}
            />

            <h2 className="text-4xl font-bold md:text-6xl">
              Wear your identity.
            </h2>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/50">
              Ayoni brings together modern
              clothing, footwear and eyewear
              for people who want simple pieces
              with strong character.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-sm text-white/40 md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            © {new Date().getFullYear()} Ayoni.
            Ilorin, Kwara.
          </p>

          <div className="flex gap-5">
            <button
              onClick={() => setShowAdmin(true)}
            >
              Admin
            </button>

            <button
              onClick={() =>
                setShowAccount(true)
              }
            >
              Account
            </button>
          </div>
        </div>
      </footer>

      {showCart && (
        <CartDrawer
          cart={cart}
          total={cartTotal}
          onClose={() => setShowCart(false)}
          onRemove={removeFromCart}
          onQuantity={updateQuantity}
          onCheckout={() => {
            if (!cart.length) return;

            setShowCart(false);
            setShowCheckout(true);
          }}
        />
      )}

      {showCheckout && (
        <Checkout
          cart={cart}
          total={cartTotal}
          onClose={() =>
            setShowCheckout(false)
          }
          onSubmit={submitOrder}
        />
      )}

      {showAdmin && (
        <Admin
          products={products}
          onClose={() => setShowAdmin(false)}
          onProductsChanged={loadProducts}
        />
      )}

      {showAccount && (
        <Account
          onClose={() =>
            setShowAccount(false)
          }
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAdd
}: {
  product: Product;
  onAdd: () => void;
}) {
  const image =
    product.image ||
    product.image_urls?.[0] ||
    '';

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImagePlus
              size={42}
              className="text-white/15"
            />
          </div>
        )}

        <button
          onClick={onAdd}
          className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-black opacity-0 transition group-hover:opacity-100"
        >
          <Plus size={17} />
          Add to bag
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
          {product.category}
        </p>

        <h3 className="mt-2 font-medium">
          {product.name}
        </h3>

        <p className="mt-2 font-semibold">
          {formatPrice(product.price)}
        </p>
      </div>
    </article>
  );
}

function CartDrawer({
  cart,
  total,
  onClose,
  onRemove,
  onQuantity,
  onCheckout
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onQuantity: (
    id: string,
    quantity: number
  ) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-neutral-950">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Shopping
            </p>

            <h2 className="text-xl font-semibold">
              Your bag
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag
                size={45}
                className="text-white/20"
              />

              <p className="mt-4 text-white/50">
                Your bag is empty.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-white/10 pb-5"
                >
                  <div className="h-24 w-20 overflow-hidden rounded-xl bg-white/5">
                    {item.image ||
                    item.image_urls?.[0] ? (
                      <img
                        src={
                          item.image ||
                          item.image_urls?.[0] ||
                          ''
                        }
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-medium">
                        {item.name}
                      </h3>

                      <button
                        onClick={() =>
                          onRemove(item.id)
                        }
                        className="text-white/30 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="mt-1 text-sm text-white/50">
                      {formatPrice(item.price)}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() =>
                          onQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                        className="h-7 w-7 rounded-full border border-white/10"
                      >
                        −
                      </button>

                      <span className="text-sm">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          onQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                        className="h-7 w-7 rounded-full border border-white/10"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/10 p-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-white/50">
                Total
              </span>

              <span className="text-xl font-bold">
                {formatPrice(total)}
              </span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full rounded-full bg-white py-3 font-medium text-black hover:bg-white/80"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Checkout({
  cart,
  total,
  onClose,
  onSubmit
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950">
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:px-6">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Ayoni
            </p>

            <h1 className="text-3xl font-bold">
              Checkout
            </h1>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X />
          </button>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_300px]">
          <form
            onSubmit={onSubmit}
            className="space-y-5"
          >
            <input
              name="name"
              required
              placeholder="Full name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="Email address"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <input
              name="phone"
              required
              placeholder="Phone number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <input
              name="city"
              required
              placeholder="City"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <textarea
              name="address"
              required
              rows={4}
              placeholder="Delivery address"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
            />

            <button
              type="submit"
              className="w-full rounded-full bg-white py-4 font-semibold text-black hover:bg-white/80"
            >
              Place order ·{' '}
              {formatPrice(total)}
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-semibold">
              Order summary
            </h2>

            <div className="mt-5 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-white/60">
                    {item.name} × {item.quantity}
                  </span>

                  <span>
                    {formatPrice(
                      item.price *
                        item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex justify-between font-semibold">
                <span>Total</span>

                <span>
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Admin({
  products,
  onClose,
  onProductsChanged
}: {
  products: Product[];
  onClose: () => void;
  onProductsChanged: () => Promise<void>;
}) {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    if (!supabase) {
      setChecking(false);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    setUser(user);
    setChecking(false);
  }

  if (checking) {
    return (
      <Modal onClose={onClose}>
        <RefreshCw className="animate-spin" />
      </Modal>
    );
  }

  if (!hasSupabase || !supabase) {
    return (
      <Modal onClose={onClose}>
        <h2 className="text-2xl font-bold">
          Supabase not connected
        </h2>

        <p className="mt-3 text-white/50">
          Configure the Supabase environment
          variables in Vercel.
        </p>
      </Modal>
    );
  }

  if (!user) {
    return (
      <AdminLogin
        onClose={onClose}
        onLogin={checkUser}
      />
    );
  }

  return (
    <AdminPanel
      products={products}
      onClose={onClose}
      onProductsChanged={onProductsChanged}
    />
  );
}

function AdminLogin({
  onClose,
  onLogin
}: {
  onClose: () => void;
  onLogin: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] =
    useState(false);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!supabase) return;

    setLoading(true);
    setError('');

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await onLogin();
    setLoading(false);
  }

  return (
    <Modal onClose={onClose}>
      <div className="mx-auto max-w-md">
        <LogIn className="mb-5" />

        <h2 className="text-3xl font-bold">
          Admin login
        </h2>

        <p className="mt-2 text-white/50">
          Sign in to manage Ayoni products
          and orders.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Admin email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-medium text-black disabled:opacity-50"
          >
            {loading && (
              <RefreshCw
                size={16}
                className="animate-spin"
              />
            )}

            Sign in
          </button>
        </form>
      </div>
    </Modal>
  );
}

function AdminPanel({
  products,
  onClose,
  onProductsChanged
}: {
  products: Product[];
  onClose: () => void;
  onProductsChanged: () => Promise<void>;
}) {
  const [editing, setEditing] =
    useState<Product | null>(null);
  const [creating, setCreating] =
    useState(false);
  const [orders, setOrders] =
    useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] =
    useState(false);

  async function loadOrders() {
    setLoadingOrders(true);

    try {
      const result = await api(
        '/api/orders'
      );

      setOrders(result.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function logout() {
    await supabase?.auth.signOut();
    onClose();
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Ayoni dashboard
            </p>

            <h2 className="text-3xl font-bold">
              Store management
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadOrders}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"
            >
              <RefreshCw
                size={15}
                className={
                  loadingOrders
                    ? 'animate-spin'
                    : ''
                }
              />

              Refresh
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"
            >
              <LogOut size={15} />

              Logout
            </button>
          </div>
        </div>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                Products
              </h3>

              <p className="text-sm text-white/40">
                Add, edit or remove products.
              </p>
            </div>

            <button
              onClick={() =>
                setCreating(true)
              }
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
            >
              <Plus size={16} />
              Add product
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <div className="flex h-48 items-center justify-center bg-white/5">
                  {product.image ||
                  product.image_urls?.[0] ? (
                    <img
                      src={
                        product.image ||
                        product.image_urls?.[0] ||
                        ''
                      }
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus
                      size={40}
                      className="text-white/20"
                    />
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs uppercase tracking-wider text-white/35">
                    {product.category}
                  </p>

                  <h4 className="mt-1 font-semibold">
                    {product.name}
                  </h4>

                  <p className="mt-2">
                    {formatPrice(
                      product.price
                    )}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        setEditing(product)
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 py-2 text-sm"
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>

                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            'Delete ' +
                              product.name +
                              '?'
                          )
                        ) {
                          return;
                        }

                        try {
                          await api(
                            '/api/products/' +
                              product.id,
                            {
                              method: 'DELETE'
                            }
                          );

                          await onProductsChanged();
                        } catch (error) {
                          alert(
                            error instanceof
                            Error
                              ? error.message
                              : 'Unable to delete product.'
                          );
                        }
                      }}
                      className="rounded-full border border-red-400/20 px-4 py-2 text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 pt-8">
          <div className="mb-5">
            <h3 className="text-xl font-semibold">
              Orders
            </h3>

            <p className="text-sm text-white/40">
              Recent customer orders.
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-8 text-center text-white/40">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <p className="font-semibold">
                        {order.customer?.name ||
                          'Customer'}
                      </p>

                      <p className="text-sm text-white/40">
                        {order.customer?.phone}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="font-bold">
                        {formatPrice(
                          order.total
                        )}
                      </p>

                      <p className="text-xs uppercase text-white/40">
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {(creating || editing) && (
        <ProductEditor
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await onProductsChanged();
          }}
        />
      )}
    </Modal>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(
    product?.name || ''
  );

  const [category, setCategory] =
    useState(
      product?.category || 'Clothing'
    );

  const [price, setPrice] = useState(
    product?.price?.toString() || ''
  );

  const [description, setDescription] =
    useState(
      product?.description || ''
    );

  const [sizes, setSizes] = useState(
    product?.sizes?.join(', ') || ''
  );

  const [colors, setColors] = useState(
    product?.colors?.join(', ') || ''
  );

  const [file, setFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [preview, setPreview] =
    useState<string>(
      product?.image ||
        product?.image_urls?.[0] ||
        ''
    );

  useEffect(() => {
    if (!file) {
      setPreview(
        product?.image ||
          product?.image_urls?.[0] ||
          ''
      );

      return;
    }

    const url =
      URL.createObjectURL(file);

    setPreview(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [file, product]);

  async function saveProduct(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!supabase) {
      alert(
        'Supabase is not connected.'
      );
      return;
    }

    setSaving(true);

    try {
      let image =
        product?.image || null;

      /*
       * Upload directly from the browser
       * to Supabase Storage.
       */
      if (file) {
        if (
          file.size >
          5 * 1024 * 1024
        ) {
          throw new Error(
            'Image must be 5MB or smaller.'
          );
        }

        if (
          !file.type.startsWith(
            'image/'
          )
        ) {
          throw new Error(
            'Please select a valid image file.'
          );
        }

        const extension =
          file.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg';

        const filePath =
          'products/' +
          crypto.randomUUID() +
          '.' +
          extension;

        const {
          error: uploadError
        } =
          await supabase.storage
            .from('product-images')
            .upload(
              filePath,
              file,
              {
                contentType:
                  file.type,
                cacheControl:
                  '3600',
                upsert: false
              }
            );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        const {
          data: publicUrlData
        } =
          supabase.storage
            .from('product-images')
            .getPublicUrl(
              filePath
            );

        image =
          publicUrlData.publicUrl;
      }

      const payload = {
        name,
        category,
        price: Number(price),
        image,
        description,
        sizes: sizes
          .split(',')
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
        colors: colors
          .split(',')
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
        stock: product?.stock || {},
        imageUrls:
          product?.image_urls || []
      };

      if (product) {
        await api(
          '/api/products/' +
            product.id,
          {
            method: 'PUT',
            body: JSON.stringify(
              payload
            )
          }
        );
      } else {
        await api(
          '/api/products',
          {
            method: 'POST',
            body: JSON.stringify(
              payload
            )
          }
        );
      }

      await onSaved();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to save product.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-neutral-950 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Product
            </p>

            <h3 className="text-2xl font-bold">
              {product
                ? 'Edit product'
                : 'Add product'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X />
          </button>
        </div>

        <form
          onSubmit={saveProduct}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm text-white/50">
              Product image
            </label>

            <label className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03]">
              {preview ? (
                <img
                  src={preview}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center text-white/40">
                  <Upload
                    className="mx-auto mb-2"
                    size={30}
                  />

                  <span className="text-sm">
                    Click to upload image
                  </span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  setFile(
                    event.target.files?.[0] ||
                      null
                  )
                }
              />
            </label>

            <p className="mt-2 text-xs text-white/30">
              JPG, PNG or WebP · Maximum
              5MB
            </p>
          </div>

          <input
            required
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Product name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none"
          >
            <option>Clothing</option>
            <option>Shoes</option>
            <option>Eyewear</option>
          </select>

          <input
            required
            type="number"
            min="0"
            value={price}
            onChange={(event) =>
              setPrice(
                event.target.value
              )
            }
            placeholder="Price"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            rows={4}
            placeholder="Product description"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <input
            value={sizes}
            onChange={(event) =>
              setSizes(
                event.target.value
              )
            }
            placeholder="Sizes — e.g. S, M, L, XL"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <input
            value={colors}
            onChange={(event) =>
              setColors(
                event.target.value
              )
            }
            placeholder="Colors — e.g. Black, White"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 font-semibold text-black disabled:opacity-50"
          >
            {saving && (
              <RefreshCw
                size={17}
                className="animate-spin"
              />
            )}

            {saving
              ? 'Saving...'
              : product
                ? 'Save changes'
                : 'Create product'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Account({
  onClose
}: {
  onClose: () => void;
}) {
  const [user, setUser] =
    useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    if (!supabase) return;

    const {
      data: { user }
    } =
      await supabase.auth.getUser();

    setUser(user);
  }

  async function logout() {
    await supabase?.auth.signOut();
    setUser(null);
  }

  return (
    <Modal onClose={onClose}>
      <UserRound size={30} />

      <h2 className="mt-5 text-3xl font-bold">
        Account
      </h2>

      {user ? (
        <div className="mt-6">
          <p className="text-white/50">
            Signed in as
          </p>

          <p className="mt-1">
            {user.email}
          </p>

          <button
            onClick={logout}
            className="mt-6 flex items-center gap-2 rounded-full border border-white/10 px-5 py-3"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      ) : (
        <p className="mt-4 text-white/50">
          You are currently browsing as a
          guest.
        </p>
      )}
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  wide = false
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-4">
      <div
        className={
          'relative mx-auto my-8 rounded-3xl border border-white/10 bg-neutral-950 p-6 ' +
          (wide
            ? 'max-w-6xl'
            : 'max-w-xl')
        }
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 hover:bg-white/10"
        >
          <X size={20} />
        </button>

        {children}
      </div>
    </div>
  );
}
