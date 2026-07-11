import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Search, ShoppingCart, Sparkles } from "lucide-react";

type Category = {
  id: string;
  key: string;
  title: string;
  sub: string;
  badge: string;
  img: string;
  sort_order: number;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Selam Cake Shop — Handcrafted Cakes Baked Fresh Daily" },
      {
        name: "description",
        content:
          "Browse Selam Cake Shop's collection of handcrafted cakes, cupcakes and pastries. Order fresh cakes for weddings, birthdays and every celebration.",
      },
      { property: "og:title", content: "Selam Cake Shop" },
      {
        property: "og:description",
        content: "Handcrafted cakes, cupcakes & pastries baked fresh daily.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: async () => {
    const { data: catData } = await supabase
      .from("shop_categories" as any)
      .select("id,key,title,sub,badge,img,sort_order")
      .order("sort_order", { ascending: true });
    return { cats: ((catData ?? []) as any[]) as Category[] };
  },
  component: Home,
});

function Home() {
  const { cats } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cats;
    return cats.filter(
      (c: Category) =>
        c.title?.toLowerCase().includes(q) ||
        c.sub?.toLowerCase().includes(q) ||
        c.key?.toLowerCase().includes(q),
    );
  }, [cats, query]);

  return (
    <main className="min-h-dvh bg-[#fdf6f0]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fbd6e0] via-[#fadfe6] to-[#fdf6f0]">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#f8c1d1] opacity-60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#fce4b8] opacity-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-24">
          {/* Top row: search + cart */}
          <div className="flex items-center gap-3">
            <label className="flex flex-1 items-center gap-3 rounded-full bg-white/95 px-5 py-3.5 shadow-[0_10px_30px_-15px_rgba(216,120,153,0.45)] ring-1 ring-white/60 backdrop-blur transition focus-within:ring-2 focus-within:ring-pink-300">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Search categories"
              />
            </label>
            <button
              type="button"
              className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e75480] text-white shadow-[0_12px_25px_-10px_rgba(231,84,128,0.7)] transition hover:scale-[1.04] hover:bg-[#d84574] active:scale-95"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#3c1d2b] text-[10px] font-bold text-white ring-2 ring-[#fbd6e0]">
                0
              </span>
            </button>
          </div>

          {/* Brand + headline */}
          <div className="mt-10 sm:mt-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c04872] ring-1 ring-white/60 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Selam Cake &amp; Arts
            </span>
            <h1 className="mt-4 font-serif text-[44px] leading-[1.05] tracking-tight text-[#2a1520] sm:text-6xl md:text-7xl">
              Baked with love,
              <br />
              <span className="italic text-[#c04872]">made for you.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-600 sm:text-base">
              Handcrafted cakes, delicate pastries and sweet everyday treats — freshly baked and beautifully delivered.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-5xl px-5 pt-10 pb-24 sm:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl text-[#2a1520] sm:text-3xl">Categories</h2>
            <p className="mt-1 text-sm text-slate-500">Pick a collection to explore</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-16 text-center">
            <p className="text-lg font-medium text-slate-700">
              {query ? "No categories match your search." : "Check back soon for our new cakes!"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {query ? "Try a different keyword." : "We're baking something special."}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((c: Category) => {
              const cover = c.img || "";
              return (
                <li key={c.id}>
                  <Link
                    to="/categories/$slug"
                    params={{ slug: c.key }}
                    className="group flex items-stretch gap-4 overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_10px_30px_-18px_rgba(216,120,153,0.35)] ring-1 ring-pink-100/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(216,120,153,0.55)] hover:ring-pink-200"
                  >
                    <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-2xl bg-[#fbe6ec] sm:h-32 sm:w-40">
                      {cover ? (
                        <img
                          src={cover}
                          alt={c.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl">🎂</div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fce4ec] text-[#c04872] ring-1 ring-pink-100"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <h3 className="truncate font-serif text-lg text-[#2a1520] sm:text-xl">
                            {c.title}
                          </h3>
                          {c.badge ? (
                            <span className="hidden shrink-0 rounded-full bg-[#fce4ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#c04872] sm:inline">
                              {c.badge}
                            </span>
                          ) : null}
                        </div>
                        {c.sub ? (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                            {c.sub}
                          </p>
                        ) : null}
                      </div>
                      <span
                        aria-hidden
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition group-hover:translate-x-0.5 group-hover:bg-[#fce4ec] group-hover:text-[#c04872]"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
