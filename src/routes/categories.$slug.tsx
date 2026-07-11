import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, X, Loader2, CheckCircle2, ShoppingBag, SlidersHorizontal, Plus, Minus } from "lucide-react";

type Category = { id: string; key: string; title: string; sub: string; img: string };
type Item = {
  id: string;
  name: string;
  sub: string;
  cat: string;
  price: number;
  img: string;
  available: boolean;
};
type CheckoutEntry = { item: Item; qty: number };

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Selam Cake Shop` },
      {
        name: "description",
        content: `Browse cakes in our ${params.slug} collection at Selam Cake Shop.`,
      },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center bg-[#fdf6f0] px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl text-[#2a1520]">Category not found</h1>
        <Link to="/" className="mt-4 inline-block text-[#c04872] hover:underline">
          Back to categories
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-red-600">{error.message}</div>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [cat, setCat] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<Item | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [multiCheckout, setMultiCheckout] = useState<CheckoutEntry[] | null>(null);

  function addToCart(it: Item) {
    setCart((c) => ({ ...c, [it.id]: (c[it.id] ?? 0) + 1 }));
  }
  function decFromCart(it: Item) {
    setCart((c) => {
      const next = { ...c };
      const q = (next[it.id] ?? 0) - 1;
      if (q <= 0) delete next[it.id];
      else next[it.id] = q;
      return next;
    });
  }

  const cartEntries: CheckoutEntry[] = items
    .filter((it) => cart[it.id] > 0)
    .map((it) => ({ item: it, qty: cart[it.id] }));
  const cartCount = cartEntries.reduce((n, e) => n + e.qty, 0);
  const cartTotal = cartEntries.reduce((n, e) => n + (Number(e.item.price) || 0) * e.qty, 0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("shop_categories" as any)
        .select("id,key,title,sub,img")
        .eq("key", slug)
        .maybeSingle();
      if (!alive) return;
      if (!c) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setCat(c as any);
      const { data: its } = await supabase
        .from("shop_items" as any)
        .select("id,name,sub,cat,price,img,available")
        .eq("cat", (c as any).key)
        .order("sort_order", { ascending: true });
      if (!alive) return;
      setItems(((its ?? []) as any[]) as Item[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (missing) throw notFound();

  return (
    <main className="min-h-dvh bg-[#fdf6f0]">
      <div className="mx-auto max-w-6xl px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
        {/* Top nav bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Back to categories"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2a1520] shadow-[0_8px_20px_-12px_rgba(216,120,153,0.4)] ring-1 ring-pink-100/70 transition hover:-translate-x-0.5 hover:text-[#c04872]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-serif text-xl text-[#2a1520] sm:text-2xl">
            {cat?.title ?? slug}
          </h1>
          <button
            type="button"
            aria-label="Filter"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2a1520] shadow-[0_8px_20px_-12px_rgba(216,120,153,0.4)] ring-1 ring-pink-100/70 transition hover:text-[#c04872]"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {cat?.sub ? (
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-slate-500">
            {cat.sub}
          </p>
        ) : null}

        <section className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-[28px] bg-white shadow-sm ring-1 ring-pink-100/60"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-16 text-center">
              <p className="text-lg font-medium text-slate-700">No cakes in this collection yet.</p>
              <p className="mt-2 text-sm text-slate-500">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {items.map((it) => (
                <article
                  key={it.id}
                  className="group flex flex-col overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_10px_30px_-18px_rgba(216,120,153,0.35)] ring-1 ring-pink-100/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(216,120,153,0.55)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#fbe6ec]">
                    {it.img ? (
                      <img
                        src={it.img}
                        alt={it.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl">🎂</div>
                    )}
                    {!it.available ? (
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                        Sold out
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                    <h3 className="line-clamp-1 text-sm font-semibold text-[#2a1520] sm:text-base">
                      {it.name}
                    </h3>
                    {it.sub ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{it.sub}</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#2a1520] sm:text-base">
                        ETB {Number(it.price ?? 0).toFixed(0)}
                      </span>
                      {it.available ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {cart[it.id] > 0 ? (
                            <div className="flex items-center gap-1 rounded-full bg-pink-50 p-0.5 ring-1 ring-pink-100">
                              <button
                                type="button"
                                onClick={() => decFromCart(it)}
                                aria-label={`Remove one ${it.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#c04872] shadow-sm transition hover:bg-pink-100"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-4 text-center text-xs font-bold text-[#2a1520]">
                                {cart[it.id]}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(it)}
                                aria-label={`Add one ${it.name}`}
                                className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#c04872] shadow-sm transition hover:bg-pink-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(it)}
                              aria-label={`Add ${it.name} to selection`}
                              className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#c04872] ring-1 ring-pink-200 transition hover:scale-105 hover:bg-pink-50 active:scale-95"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCheckoutItem(it)}
                            aria-label={`Order ${it.name}`}
                            className="grid h-9 w-9 place-items-center rounded-full bg-[#e75480] text-white shadow-[0_8px_18px_-8px_rgba(231,84,128,0.7)] transition hover:scale-105 hover:bg-[#d84574] active:scale-95"
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-label="Unavailable"
                          className="grid h-9 w-9 shrink-0 cursor-not-allowed place-items-center rounded-full bg-slate-100 text-slate-400"
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {cartCount > 0 && !checkoutItem && !multiCheckout ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-8">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-[#2a1520] px-5 py-3 text-white shadow-[0_18px_40px_-12px_rgba(42,21,32,0.6)]">
            <div className="min-w-0">
              <div className="text-xs text-white/60">{cartCount} item{cartCount > 1 ? "s" : ""} selected</div>
              <div className="font-serif text-lg">ETB {cartTotal.toFixed(0)}</div>
            </div>
            <button
              type="button"
              onClick={() => setMultiCheckout(cartEntries)}
              className="inline-flex items-center gap-2 rounded-full bg-[#e75480] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(231,84,128,0.7)] transition hover:bg-[#d84574]"
            >
              <ShoppingBag className="h-4 w-4" />
              Order selected
            </button>
          </div>
        </div>
      ) : null}

      {checkoutItem ? (
        <CheckoutModal
          entries={[{ item: checkoutItem, qty: 1 }]}
          categoryId={cat?.id ?? null}
          categoryName={cat?.title ?? null}
          onClose={() => setCheckoutItem(null)}
        />
      ) : null}

      {multiCheckout ? (
        <CheckoutModal
          entries={multiCheckout}
          categoryId={cat?.id ?? null}
          categoryName={cat?.title ?? null}
          onClose={() => setMultiCheckout(null)}
          onSuccess={() => setCart({})}
        />
      ) : null}
    </main>
  );
}

function CheckoutModal({ entries, categoryId, categoryName, onClose, onSuccess }: { entries: CheckoutEntry[]; categoryId: string | null; categoryName: string | null; onClose: () => void; onSuccess?: () => void }) {
  const primary = entries[0]?.item;
  const total = entries.reduce((n, e) => n + (Number(e.item.price) || 0) * e.qty, 0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; delivery_date: string } | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState("selamcake");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "telegram_username")
        .maybeSingle();
      const val = ((data as any)?.value as string)?.trim();
      if (alive && val) setTelegramUsername(val);
    })();
    return () => { alive = false; };
  }, []);

  const TELEGRAM_URL = `https://t.me/${telegramUsername}`;

  function buildSummary(orderId: string, createdAt: string | null): string {
    const when = createdAt ? new Date(createdAt) : new Date();
    const orderTime =
      `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")} ` +
      when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    const lines: string[] = [];
    lines.push("🧁 NEW CAKE ORDER");
    lines.push("");
    lines.push(`Order ID: #${orderId.slice(0, 8).toUpperCase()}`);
    lines.push("");
    lines.push("Customer:");
    lines.push(name.trim());
    lines.push("");
    lines.push("Phone:");
    lines.push(phone.trim());
    lines.push("");
    lines.push("Products:");
    entries.forEach((e) => lines.push(`• ${e.item.name} × ${e.qty}`));
    lines.push("");
    lines.push("Category:");
    lines.push(categoryName || "—");
    lines.push("");
    lines.push("Subtotal:");
    lines.push(`ETB ${total.toLocaleString()}`);
    lines.push("");
    lines.push("Delivery Address:");
    lines.push(address.trim() || "—");
    lines.push("");
    lines.push("Special Instructions:");
    lines.push(instructions.trim() || "—");
    lines.push("");
    lines.push("Order Time:");
    lines.push(orderTime);
    lines.push("");
    lines.push("Thank you.");
    return lines.join("\n");
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      /* fall through to legacy copy */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      /* ignore — Telegram still opens */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (name.trim().length > 100) return setError("Name is too long.");
    if (!phone.trim()) return setError("Please enter a phone number.");
    if (phone.trim().length > 30) return setError("Phone number is too long.");
    if (!deliveryDate) return setError("Please choose a delivery/pickup date.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim(),
          delivery_date: deliveryDate,
          items: entries.map((e) => ({
            name: e.item.name,
            qty: e.qty,
            price: Number(e.item.price) || 0,
            img: e.item.img || undefined,
          })),
          total,
          cake_id: primary?.id ?? null,
          category_id: categoryId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not place order");
      }
      const body = await res.json();

      // Generate the structured order summary and copy it to the clipboard.
      const summary = buildSummary(body.id, body.created_at ?? null);
      await copyToClipboard(summary);

      // Open the Telegram profile in a new tab so the customer can paste & send.
      window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");

      setConfirmation(
        "Your order has been saved successfully. The order details have been copied to your clipboard. Telegram has been opened—simply paste the message into the chat and press Send.",
      );
      setSuccess({ id: body.id, delivery_date: body.delivery_date });
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a1520]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scale-in overflow-hidden rounded-t-[32px] bg-[#fdf6f0] shadow-2xl sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-pink-100/70 bg-white/60 px-6 py-4">
          <h2 className="font-serif text-lg text-[#2a1520]">
            {success ? "Order received" : "Complete your order"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-pink-50 hover:text-[#c04872]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <p className="mt-4 font-serif text-xl text-[#2a1520]">Thank you for your order!</p>
            <div className="mx-auto mt-4 max-w-xs space-y-2 rounded-2xl bg-white px-4 py-3 text-left text-sm ring-1 ring-pink-100/70">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono font-semibold text-[#2a1520]">
                  #{success.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">{entries.length > 1 ? "Items" : "Cake"}</span>
                <span className="truncate font-medium text-[#2a1520]">
                  {entries.length > 1
                    ? `${entries.reduce((n, e) => n + e.qty, 0)} items`
                    : primary?.name}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Delivery date</span>
                <span className="font-medium text-[#2a1520]">
                  {new Date(success.delivery_date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short", month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold text-[#c04872]">ETB {total.toFixed(0)}</span>
              </div>
            </div>
            {confirmation ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
                {confirmation}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                We'll call {phone} shortly to confirm.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-[#e75480] px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(231,84,128,0.7)] transition hover:bg-[#d84574]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5">
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-pink-100/70">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#fbe6ec]">
                    {e.item.img ? (
                      <img src={e.item.img} alt={e.item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🎂</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#2a1520]">
                      {e.item.name}
                      {e.qty > 1 ? <span className="text-slate-500"> × {e.qty}</span> : null}
                    </div>
                    {e.item.sub ? <div className="truncate text-xs text-slate-500">{e.item.sub}</div> : null}
                  </div>
                  <div className="text-sm font-bold text-[#c04872]">
                    ETB {((Number(e.item.price) || 0) * e.qty).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Full name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e75480] focus:ring-2 focus:ring-pink-100"
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={30}
                  className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e75480] focus:ring-2 focus:ring-pink-100"
                />
              </Field>
              <Field label="Delivery / pickup date">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e75480] focus:ring-2 focus:ring-pink-100"
                />
              </Field>
              <Field label="Delivery address (optional)">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={250}
                  rows={2}
                  className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e75480] focus:ring-2 focus:ring-pink-100"
                />
              </Field>
              <Field label="Special instructions (optional)">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e75480] focus:ring-2 focus:ring-pink-100"
                />
              </Field>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
            ) : null}

            <div className="mt-5 flex items-center justify-between border-t border-pink-100/70 pt-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Total</div>
                <div className="font-serif text-xl text-[#2a1520]">
                  ETB {total.toFixed(0)}
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#e75480] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(231,84,128,0.7)] transition hover:bg-[#d84574] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Placing…" : "Place order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
