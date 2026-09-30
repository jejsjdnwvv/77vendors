import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Headphones,
  Heart,
  History,
  LogOut,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Index });

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice: number;
  icon: string;
  tone: string;
  tag: string;
  image?: string;
  providers: string[];
};

const defaultProducts: Product[] = [
  {
    id: "p1",
    name: "Vintage Washed Hoodie",
    category: "Hoodies",
    price: 1299,
    oldPrice: 1800,
    icon: "H",
    tone: "from-zinc-500 to-zinc-900",
    tag: "Trending",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    providers: ["LitBuy", "KakoBuy"],
  },
  {
    id: "p2",
    name: "Heavyweight Graphic Tee",
    category: "T-Shirts",
    price: 699,
    oldPrice: 950,
    icon: "T",
    tone: "from-stone-400 to-neutral-900",
    tag: "Popular",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    providers: ["OopBuy", "KakoBuy"],
  },
  {
    id: "p3",
    name: "Relaxed Cargo Pants",
    category: "Bottoms",
    price: 1599,
    oldPrice: 2200,
    icon: "C",
    tone: "from-slate-500 to-slate-950",
    tag: "Best seller",
    image:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80",
    providers: ["LitBuy", "OopBuy"],
  },
  {
    id: "p4",
    name: "Retro Runner Sneakers",
    category: "Shoes",
    price: 2499,
    oldPrice: 3200,
    icon: "R",
    tone: "from-neutral-300 to-stone-800",
    tag: "New",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    providers: ["KakoBuy"],
  },
  {
    id: "p5",
    name: "Minimal Zip Jacket",
    category: "Outerwear",
    price: 1899,
    oldPrice: 2600,
    icon: "J",
    tone: "from-gray-400 to-gray-900",
    tag: "Staff pick",
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",
    providers: ["LitBuy", "KakoBuy", "OopBuy"],
  },
  {
    id: "p6",
    name: "Everyday Crossbody Bag",
    category: "Accessories",
    price: 899,
    oldPrice: 1200,
    icon: "B",
    tone: "from-violet-500 to-neutral-950",
    tag: "Top value",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    providers: ["OopBuy"],
  },
];

const categories = ["All", "Hoodies", "T-Shirts", "Bottoms", "Shoes", "Outerwear", "Accessories"];

function Index() {
  const cart = useCart();
  const { user, profile, isAdmin, isLoading } = useAuth();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [adminOpen, setAdminOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      order_number: string;
      created_at: string;
      total_cents: number;
      order_items: Array<{
        id: string;
        product_name: string;
        product_image: string | null;
        provider_name: string | null;
        delivery_url: string | null;
      }>;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("77vendors.products");
    if (saved) setProducts(JSON.parse(saved) as Product[]);
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      const { data } = await supabase
        .from("products")
        .select("id,name,price_cents,compare_at_cents,image_url,images,published")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (!data?.length) return;
      setProducts(
        data.map((row) => {
          const gallery = Array.isArray(row.images)
            ? row.images.filter((item): item is string => typeof item === "string")
            : [];
          return {
            id: row.id,
            name: row.name,
            category: "Clothing",
            price: row.price_cents,
            oldPrice: row.compare_at_cents ?? row.price_cents,
            icon: row.name[0]?.toUpperCase() ?? "V",
            tone: "from-violet-500 to-zinc-950",
            tag: "Vendor",
            image: row.image_url ?? gallery[0],
            providers: ["LitBuy", "KakoBuy", "OopBuy"],
          };
        }),
      );
    }
    void loadCatalog();
  }, [user]);

  function saveProducts(next: Product[]) {
    setProducts(next);
    window.localStorage.setItem("77vendors.products", JSON.stringify(next));
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setUploading(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const providerValues = form.getAll("providers").map(String);
    const price = Math.round(Number(form.get("price") || 0) * 100);
    const files = form
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const imageUrls: string[] = [];
    for (const file of files) {
      const path = `${user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast.error(error.message);
        setUploading(false);
        return;
      }
      imageUrls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    const { data: categoryRow } = await supabase
      .from("categories")
      .select("id")
      .eq("name", String(form.get("category")))
      .maybeSingle();
    const { data: productRow, error: productError } = await supabase
      .from("products")
      .insert({
        name,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        price_cents: price,
        compare_at_cents: price,
        image_url: imageUrls[0] ?? null,
        images: imageUrls,
        category_id: categoryRow?.id ?? null,
        published: true,
        available: true,
      })
      .select("id")
      .single();
    if (productError || !productRow) {
      toast.error(productError?.message ?? "Could not publish item");
      setUploading(false);
      return;
    }
    const { data: providerRows } = await supabase
      .from("providers")
      .select("id,name")
      .in("name", providerValues.length ? providerValues : ["LitBuy"]);
    if (providerRows?.length) {
      await supabase.from("product_providers").insert(
        providerRows.map((provider) => ({
          product_id: productRow.id,
          provider_id: provider.id,
          enabled: true,
        })),
      );
      const links = providerRows
        .map((provider) => ({
          product_id: productRow.id,
          provider_id: provider.id,
          url: String(form.get(`link-${provider.name}`) || ""),
        }))
        .filter((link) => link.url);
      if (links.length) await supabase.from("product_provider_links").insert(links);
    }
    const next: Product = {
      id: productRow.id,
      name,
      category: String(form.get("category") || "Other"),
      price,
      oldPrice: price,
      icon: name[0]?.toUpperCase() || "V",
      tone: "from-violet-500 to-zinc-950",
      tag: "New",
      image: imageUrls[0],
      providers: providerValues.length ? providerValues : ["LitBuy"],
    };
    saveProducts([next, ...products]);
    event.currentTarget.reset();
    setUploading(false);
    toast.success("Item published to the marketplace");
  }

  async function removeProduct(id: string) {
    if (!isAdmin) return;
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    saveProducts(products.filter((product) => product.id !== id));
    toast.success("Item removed");
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSendingLink(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the secure sign-in link");
  }

  async function openHistory() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,order_number,created_at,total_cents,order_items(id,product_name,product_image,provider_name,delivery_url)",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setOrders(data ?? []);
    setHistoryOpen(true);
  }

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (!normalized || `${product.name} ${product.category}`.toLowerCase().includes(normalized)),
    );
  }, [category, products, query]);

  function addToCart(product: Product) {
    cart.addLine({
      productId: product.id,
      slug: product.id,
      name: product.name,
      image: product.image ?? null,
      priceCents: product.price,
      providerId: "verified",
      providerName: "77 Verified",
    });
    toast.success(`${product.name} added to your cart`);
  }

  function toggleFavorite(id: string) {
    setFavorites((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }

  function scrollToCatalog() {
    document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo size={44} />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 text-foreground">
        <img
          src={hero}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-20 saturate-50"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,color-mix(in_oklab,var(--primary)_25%,transparent),transparent_35%),linear-gradient(0deg,var(--background),color-mix(in_oklab,var(--background)_75%,transparent))]" />
        <div className="glass-panel relative w-full max-w-md rounded-3xl p-8 text-center sm:p-10">
          <Logo className="justify-center" size={48} />
          <h1 className="mt-10 font-display text-4xl font-medium">Your vendor marketplace.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Sign in to browse clothing vendors, save purchases, and access your vendor links.
          </p>
          <button
            onClick={() => void signIn()}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <UserRound className="size-4" /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">
              or use email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              required
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="you@gmail.com"
              className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm outline-none transition focus:border-primary"
            />
            <button
              disabled={sendingLink}
              type="submit"
              className="brand-gradient flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {sendingLink ? "Sending secure link…" : "Email me a sign-in link"}
            </button>
          </form>
          <p className="mt-5 text-[10px] leading-5 text-muted-foreground">
            By continuing, you agree to the marketplace terms and privacy policy.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/6 bg-background/65 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-7 px-5 lg:px-8">
          <a href="#top" aria-label="77 Vendors home">
            <Logo size={36} />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#catalog" className="transition hover:text-white">
              Marketplace
            </a>
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            {isAdmin && (
              <button onClick={() => setAdminOpen(true)} className="transition hover:text-white">
                Manage items
              </button>
            )}
          </nav>
          <div className="ml-auto hidden w-full max-w-xs items-center rounded-full border border-border bg-surface/80 px-4 md:flex">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={scrollToCatalog}
              placeholder="Search clothing vendors"
              className="h-10 w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => void openHistory()}
            className="hidden size-10 items-center justify-center rounded-full border border-border bg-surface transition hover:border-primary/50 md:flex"
            aria-label="Purchase history"
          >
            <History className="size-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setAdminOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold transition hover:border-primary/50 md:flex"
            >
              <Settings2 className="size-3.5" /> Admin
            </button>
          )}
          <button
            onClick={() => void supabase.auth.signOut()}
            className="hidden size-10 items-center justify-center rounded-full border border-border bg-surface transition hover:border-primary/50 md:flex"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex size-10 items-center justify-center rounded-full border border-border bg-surface transition hover:border-primary/60 hover:bg-accent"
            aria-label="Open cart"
          >
            <ShoppingBag className="size-4.5" />
            {cart.count > 0 && (
              <span className="brand-gradient absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                {cart.count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-10 items-center justify-center rounded-full border border-border md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-4 text-sm">
              <button onClick={scrollToCatalog} className="text-left">
                Marketplace
              </button>
              <a href="#how" onClick={() => setMenuOpen(false)}>
                How it works
              </a>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void openHistory();
                }}
                className="text-left"
              >
                Purchase history
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setAdminOpen(true);
                  }}
                  className="text-left"
                >
                  Manage items
                </button>
              )}
              <button
                onClick={() => void supabase.auth.signOut()}
                className="text-left text-muted-foreground"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative flex min-h-[820px] items-center overflow-hidden pt-18">
          <img
            src={hero}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25 saturate-50"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_60%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_33%),linear-gradient(90deg,var(--background)_5%,color-mix(in_oklab,var(--background)_88%,transparent)_48%,color-mix(in_oklab,var(--background)_55%,transparent)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--background),transparent_38%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center px-5 py-24 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary-glow">
                <Sparkles className="size-3.5" /> Curated clothing vendor links
              </div>
              <h1 className="font-display text-5xl font-medium leading-[1.03] tracking-[-.065em] sm:text-6xl lg:text-7xl">
                Find your next
                <br />
                <span className="text-white">winning product.</span>
              </h1>
              <p className="mt-7 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                Shop curated clothing finds and get the vendor link for your preferred agent.
                Compare providers, save products, and source with confidence.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <button
                  onClick={scrollToCatalog}
                  className="brand-gradient inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-glow transition hover:brightness-110"
                >
                  Explore marketplace <ArrowRight className="size-4" />
                </button>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center rounded-xl border border-border bg-surface/75 px-6 text-sm font-semibold backdrop-blur transition hover:bg-accent"
                >
                  How it works
                </a>
              </div>
              <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" /> Secure checkout
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-300" /> Instant vendor links
                </span>
                <span className="flex items-center gap-2">
                  <Headphones className="size-4 text-sky-400" /> Human support
                </span>
              </div>
            </div>
            <div className="relative mt-20 hidden lg:block">
              <div className="glass-panel ml-auto w-80 rotate-2 rounded-2xl border-white/10 bg-black/35 p-5 shadow-glow">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Vendor ready
                  </span>
                  <BadgeCheck className="size-5 text-primary-glow" />
                </div>
                <div className="mt-16 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 font-display text-3xl font-bold">
                  77
                </div>
                <p className="mt-5 text-xs text-muted-foreground">Three providers available</p>
                <h3 className="mt-1 font-display text-xl font-bold">Minimal Zip Jacket</h3>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Vendor access</span>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <Clock3 className="size-3.5 text-emerald-400" /> Instant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-surface/35">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4 lg:px-8">
            {[
              ["12K+", "happy customers"],
              ["250+", "curated vendors"],
              ["3", "supported agents"],
              ["24/7", "marketplace access"],
            ].map(([value, label]) => (
              <div key={label} className="px-3 py-3 text-center">
                <div className="font-display text-2xl font-bold sm:text-3xl">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-primary-glow">
                Curated for you
              </p>
              <h2 className="font-display text-3xl font-bold sm:text-5xl">Trending right now</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Clothing finds with vendor links for the agents you already use.
              </p>
            </div>
            <div className="relative flex items-center rounded-xl border border-border bg-surface px-3 md:hidden">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="h-11 bg-transparent px-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="mt-8 flex gap-2 overflow-auto pb-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${category === item ? "brand-gradient text-white" : "border border-border bg-surface text-muted-foreground hover:text-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          {visibleProducts.length ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-white/7 bg-card/70 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
                >
                  <div
                    className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${product.tone} opacity-80`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.22),transparent_42%)]" />
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-7xl font-bold text-white/90 drop-shadow-xl">
                        {product.icon}
                      </span>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                      {product.tag}
                    </span>
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/35 backdrop-blur transition hover:bg-black/55"
                      aria-label="Favorite product"
                    >
                      <Heart
                        className={`size-4 ${favorites.includes(product.id) ? "fill-rose-400 text-rose-400" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="p-5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-glow">
                        {product.category}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{product.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {product.providers.map((provider) => (
                        <span
                          key={provider}
                          className="rounded-md border border-border bg-background/50 px-2 py-1 text-[10px] text-muted-foreground"
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <span className="font-display text-xl font-bold">
                          {formatMoney(product.price)}
                        </span>
                        {product.oldPrice > product.price && (
                          <span className="ml-2 text-xs text-muted-foreground line-through">
                            {formatMoney(product.oldPrice)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        className="flex size-10 items-center justify-center rounded-xl bg-secondary transition hover:bg-primary"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-border py-20 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-4 font-display text-xl font-bold">No products found</h3>
              <button
                onClick={() => {
                  setCategory("All");
                  setQuery("");
                }}
                className="mt-3 text-sm text-primary-glow"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section id="how" className="border-y border-border/70 bg-surface/35 py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-primary-glow">
                Simple by design
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
                From find to vendor in seconds
              </h2>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {[
                [
                  Search,
                  "01",
                  "Find your product",
                  "Browse hand-picked clothing pieces and proven finds.",
                ],
                [
                  ShieldCheck,
                  "02",
                  "Checkout securely",
                  "Your payment and personal details stay protected.",
                ],
                [
                  PackageCheck,
                  "03",
                  "Choose your provider",
                  "Get the matching LitBuy, KakoBuy, or OopBuy vendor link.",
                ],
              ].map(([Icon, number, title, copy]) => {
                const StepIcon = Icon as typeof Search;
                return (
                  <div
                    key={String(number)}
                    className="rounded-2xl border border-border bg-card p-7"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary-glow">
                        <StepIcon className="size-5" />
                      </span>
                      <span className="font-display text-4xl font-bold text-white/5">
                        {String(number)}
                      </span>
                    </div>
                    <h3 className="mt-8 font-display text-xl font-bold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(copy)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-primary/10 px-6 py-14 text-center sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,color-mix(in_oklab,var(--primary)_40%,transparent),transparent_55%)]" />
            <div className="relative">
              <Shirt className="mx-auto size-9 text-primary-glow" />
              <h2 className="mt-5 font-display text-3xl font-bold sm:text-5xl">
                Ready when you are.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
                Find your next clothing vendor and choose the provider that works for you.
              </p>
              <button
                onClick={scrollToCatalog}
                className="brand-gradient mt-7 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-glow"
              >
                Shop the marketplace <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-center lg:px-8">
          <Logo />
          <p className="text-xs text-muted-foreground sm:ml-auto">
            © {new Date().getFullYear()} 77 Vendors. Curated clothing vendors.
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#how" className="hover:text-white">
              Support
            </a>
            <a href="#top" className="hover:text-white">
              Terms
            </a>
            <a href="#top" className="hover:text-white">
              Privacy
            </a>
          </div>
        </div>
      </footer>

      {historyOpen && (
        <>
          <button
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close purchase history"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary-glow">
                  Your account
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">Purchase history</h2>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-secondary"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {orders.length ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <section
                      key={order.id}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold">Order {order.order_number}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <strong className="text-sm">{formatMoney(order.total_cents)}</strong>
                      </div>
                      <div className="mt-4 space-y-2">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl bg-background/50 p-3"
                          >
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt=""
                                className="size-11 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="brand-gradient flex size-11 items-center justify-center rounded-lg text-xs font-bold">
                                77
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.product_name}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {item.provider_name ?? "Selected provider"}
                              </p>
                            </div>
                            {item.delivery_url ? (
                              <a
                                href={item.delivery_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold"
                              >
                                Open vendor
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Processing</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <History className="size-9 text-muted-foreground" />
                  <h3 className="mt-4 font-display text-xl font-bold">No purchases yet</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    After checkout, your vendor links will appear here automatically.
                  </p>
                  <button
                    onClick={() => {
                      setHistoryOpen(false);
                      scrollToCatalog();
                    }}
                    className="brand-gradient mt-6 rounded-xl px-5 py-2.5 text-sm font-bold"
                  >
                    Browse marketplace
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {adminOpen && (
        <>
          <button
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setAdminOpen(false)}
            aria-label="Close item manager"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary-glow">
                  Admin
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">Manage marketplace items</h2>
              </div>
              <button
                onClick={() => setAdminOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-secondary"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <form
                onSubmit={createProduct}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <h3 className="font-display text-lg font-bold">Add a new item</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Item name
                    <input
                      required
                      name="name"
                      placeholder="Oversized hoodie"
                      className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Price (USD)
                    <input
                      required
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="12.99"
                      className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Category
                    <select
                      name="category"
                      className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
                    >
                      {categories.slice(1).map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground sm:col-span-2">
                    Product pictures
                    <span className="mt-1.5 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center transition hover:border-primary/60">
                      <Upload className="size-5 text-primary-glow" />
                      <span className="mt-2 text-xs text-foreground">Choose multiple images</span>
                      <span className="mt-1 text-[10px]">
                        JPG, PNG, WEBP or GIF · up to 10 MB each
                      </span>
                      <input
                        required
                        multiple
                        name="images"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                      />
                    </span>
                  </label>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-xs text-muted-foreground">Available providers</legend>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {["LitBuy", "KakoBuy", "OopBuy"].map((provider) => (
                      <label key={provider} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          name="providers"
                          value={provider}
                          className="accent-primary"
                        />{" "}
                        {provider}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {["LitBuy", "KakoBuy", "OopBuy"].map((provider) => (
                    <label key={provider} className="text-xs text-muted-foreground">
                      {provider} link
                      <input
                        name={`link-${provider}`}
                        type="url"
                        placeholder="https://..."
                        className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="brand-gradient mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Upload className="size-4 animate-pulse" /> Uploading images…
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Publish item
                    </>
                  )}
                </button>
              </form>
              <div className="mt-7 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Current items</h3>
                <span className="text-xs text-muted-foreground">{products.length} listed</span>
              </div>
              <div className="mt-3 space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    {product.image ? (
                      <img src={product.image} alt="" className="size-12 rounded-lg object-cover" />
                    ) : (
                      <div className="brand-gradient flex size-12 items-center justify-center rounded-lg font-bold">
                        {product.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {product.category} · {formatMoney(product.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  saveProducts(defaultProducts);
                  toast.success("Demo items restored");
                }}
                className="mt-5 text-xs text-muted-foreground underline-offset-4 hover:text-white hover:underline"
              >
                Restore demo items
              </button>
            </div>
          </aside>
        </>
      )}

      {cartOpen && (
        <>
          <button
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart overlay"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-bold">Your cart</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cart.count} {cart.count === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {cart.lines.length ? (
                <div className="space-y-3">
                  {cart.lines.map((line) => (
                    <div
                      key={line.productId}
                      className="flex gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="brand-gradient flex size-14 shrink-0 items-center justify-center rounded-lg font-display text-xl font-bold">
                        {line.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{line.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Vendor link delivery</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-border">
                            <button
                              onClick={() => cart.setQuantity(line.productId, line.quantity - 1)}
                              className="p-1.5"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-7 text-center text-xs">{line.quantity}</span>
                            <button
                              onClick={() => cart.setQuantity(line.productId, line.quantity + 1)}
                              className="p-1.5"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <strong className="text-sm">
                            {formatMoney(line.priceCents * line.quantity)}
                          </strong>
                        </div>
                      </div>
                      <button
                        onClick={() => cart.removeLine(line.productId)}
                        className="text-muted-foreground hover:text-rose-400"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingCart className="size-10 text-muted-foreground" />
                  <h3 className="mt-4 font-display text-xl font-bold">Your cart is empty</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add something good. It won’t take long.
                  </p>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      scrollToCatalog();
                    }}
                    className="brand-gradient mt-6 rounded-xl px-5 py-2.5 text-sm font-bold"
                  >
                    Browse products
                  </button>
                </div>
              )}
            </div>
            {cart.lines.length > 0 && (
              <div className="border-t border-border p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <strong className="font-display text-xl">
                    {formatMoney(cart.subtotalCents)}
                  </strong>
                </div>
                <button
                  onClick={() =>
                    toast.info("Checkout is ready to connect to your payment provider.")
                  }
                  className="brand-gradient mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold"
                >
                  Secure checkout <ArrowRight className="size-4" />
                </button>
                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  Secure payment · Instant delivery
                </p>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
