import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Cake, LayoutGrid, ShoppingBag, LogOut, Store,
  Boxes, CheckCircle2, XCircle, Tag, Plus, Pencil, Trash2, Upload, X, FolderOpen,
  GripVertical, Camera, Loader2, Settings as SettingsIcon, Send, UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "@/components/sweet-bloom/menu-admin.css";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Menu Management — Selam Cake & Arts" }] }),
  component: AdminDashboard,
});

const fmtBirr = (n: number) =>
  `Birr ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const MAX_IMAGE_UPLOAD_MB = 5;
const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const IMAGE_UPLOAD_HELP = `JPG, PNG, WebP, or GIF only — maximum ${MAX_IMAGE_UPLOAD_MB} MB.`;

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

function validateImageUpload(file: File) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const typeIsAllowed = file.type ? ALLOWED_IMAGE_TYPES.includes(file.type) : true;
  const extensionIsAllowed = ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  if (!typeIsAllowed || !extensionIsAllowed) {
    return `Please upload a real image file. Supported formats: JPG, PNG, WebP, or GIF.`;
  }
  if (file.size <= 0) return "This image file is empty. Please choose another photo.";
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return `This image is too large (${formatBytes(file.size)}). Please upload an image up to ${MAX_IMAGE_UPLOAD_MB} MB.`;
  }
  return "";
}

function getImageExtension(file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function uploadFailureMessage(message: string) {
  if (/row-level security|permission|not authorized|unauthorized/i.test(message)) {
    return "Upload blocked: this account does not have image upload permission. Please sign in with the manager account.";
  }
  if (/payload|too large|size|limit/i.test(message)) {
    return `Upload failed because the image is too large. Please use an image up to ${MAX_IMAGE_UPLOAD_MB} MB.`;
  }
  return `Upload failed: ${message}`;
}

type Section = "overview" | "orders" | "menu" | "categories" | "settings";

type ShopItem = {
  id: string;
  name: string;
  sub: string;
  cat: string;
  price: number;
  img: string;
  available: boolean;
  available_today: boolean;
  sort_order: number;
};

type ShopCategory = {
  id: string;
  key: string;
  title: string;
  sub: string;
  badge: string;
  img: string;
  sort_order: number;
};

const FALLBACK_CATEGORIES = [
  "bridal-shower","baby-shower","christening","engagement","six-month","cake-package",
  "graduation-kids","nikah","mini-cake","torta","graduation","birthday-girls",
  "birthday-boys","birthday-women","birthday-men","proposal","anniversary","wedding","evangelina",
];

type OrderRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: { name: string; qty: number; price: number; img?: string | null }[];
  total: number;
  status: string;
  delivery_date: string | null;
  created_at: string;
};

function AdminDashboard() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [section, setSection] = useState<Section>("overview");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [editingCat, setEditingCat] = useState<ShopCategory | null>(null);
  const [viewingCat, setViewingCat] = useState<ShopCategory | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [filterCat, setFilterCat] = useState<string>("All");
  const [filterAvail, setFilterAvail] = useState<"all" | "in" | "out">("all");
  const [editing, setEditing] = useState<ShopItem | null>(null);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_address, items, total, status, delivery_date, created_at")
      .order("created_at", { ascending: false });
    if (error) { console.error("Load orders failed", error); return; }
    setOrders((data ?? []) as OrderRow[]);
  }, []);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop_items" as any)
      .select("id, name, sub, cat, price, img, available, available_today, sort_order")
      .order("cat", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) { console.error("Load shop items failed", error); return; }
    setItems(((data ?? []) as unknown) as ShopItem[]);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop_categories" as any)
      .select("id, key, title, sub, badge, img, sort_order")
      .order("sort_order", { ascending: true });
    if (error) { console.error("Load categories failed", error); return; }
    setCategories(((data ?? []) as unknown) as ShopCategory[]);
  }, []);

  async function deleteCategory(c: ShopCategory) {
    if (!confirm(`Delete category "${c.title}"? Items in this category will stay but won't show on the storefront.`)) return;
    const prev = categories;
    setCategories((arr) => arr.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("shop_categories" as any).delete().eq("id", c.id);
    if (error) { alert("Delete failed: " + error.message); setCategories(prev); }
  }

  async function toggleAvail(it: ShopItem) {
    setBusy((b) => ({ ...b, [it.id]: true }));
    setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, available: !it.available } : x));
    const { error } = await supabase
      .from("shop_items" as any)
      .update({ available: !it.available })
      .eq("id", it.id);
    if (error) {
      alert("Update failed: " + error.message);
      setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, available: it.available } : x));
    }
    setBusy((b) => ({ ...b, [it.id]: false }));
  }

  async function deleteItem(it: ShopItem) {
    if (!confirm(`Delete "${it.name}"? This cannot be undone.`)) return;
    const prev = items;
    setItems((arr) => arr.filter((x) => x.id !== it.id));
    const { error } = await supabase.from("shop_items" as any).delete().eq("id", it.id);
    if (error) { alert("Delete failed: " + error.message); setItems(prev); }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = !!roles?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      setReady(true);
      if (admin) { loadOrders(); loadItems(); loadCategories(); }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav({ to: "/admin/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav, loadOrders, loadItems, loadCategories]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("shop_items_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_items" }, () => loadItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_categories" }, () => loadCategories())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, loadItems, loadCategories]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, loadOrders]);

  if (!ready) return null;

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/admin/login" });
  }

  if (!isAdmin) {
    return (
      <div className="ma-denied">
        <div className="box">
          <h1>Access denied</h1>
          <p>This account is read-only. Only the owner / manager can edit the menu.</p>
          <button className="ma-edit-btn" onClick={logout}>Sign out</button>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const available = items.filter((i) => i.available).length;
  const soldOut = totalItems - available;
  const newOrders = orders.filter((o) => o.status === "pending").length;

  const filteredItems = items.filter((it) => {
    if (filterCat !== "All" && it.cat !== filterCat) return false;
    if (filterAvail === "in" && !it.available) return false;
    if (filterAvail === "out" && it.available) return false;
    return true;
  });

  async function setOrderStatus(id: string, status: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { alert("Could not update status: " + error.message); loadOrders(); }
  }

  const catOptions = categories.length ? categories.map((c) => c.key) : FALLBACK_CATEGORIES;

  const navItems: { id: Section; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "categories", label: "Categories", icon: FolderOpen },
    { id: "menu", label: "Shop Items", icon: Tag },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="ma-shell">
      <aside className="ma-sidebar">
        <div className="ma-logo">
          <span className="ma-logo-icon"><Cake size={22} /></span>
          <span>
            <b>Selam Cake</b>
            <span>&amp; Arts</span>
          </span>
        </div>

        <nav className="ma-nav">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                className={"ma-nav-item" + (section === it.id ? " active" : "")}
                type="button"
                onClick={() => setSection(it.id)}
              >
                <Icon size={19} /> {it.label}
              </button>
            );
          })}
        </nav>

        <div className="ma-sidebar-foot">
          <Link to="/" className="ma-nav-item">
            <Store size={19} /> View Shop
          </Link>
          <button className="ma-nav-item" type="button" onClick={logout}>
            <LogOut size={19} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="ma-main">
        {section === "overview" && (
          <>
            <h1 className="ma-page-title">Overview</h1>
            <p className="ma-page-sub">A quick snapshot of your shop today. Financial KPIs cover the last 30 days.</p>

            {/* Inventory & order overview */}
            <div className="ma-stats">
              <div className="ma-stat">
                <span className="ma-stat-icon"><Boxes size={22} /></span>
                <span className="ma-stat-val">{totalItems}</span>
                <span className="ma-stat-label">Total Items</span>
              </div>
              <div className="ma-stat">
                <span className="ma-stat-icon green"><CheckCircle2 size={22} /></span>
                <span className="ma-stat-val">{available}</span>
                <span className="ma-stat-label">Available</span>
              </div>
              <div className="ma-stat">
                <span className="ma-stat-icon red"><XCircle size={22} /></span>
                <span className="ma-stat-val">{soldOut}</span>
                <span className="ma-stat-label">Sold Out</span>
              </div>
              <div className="ma-stat">
                <span className="ma-stat-icon"><ShoppingBag size={22} /></span>
                <span className="ma-stat-val">{orders.length}</span>
                <span className="ma-stat-label">Total Orders</span>
              </div>
              <div className="ma-stat">
                <span className="ma-stat-icon green"><ShoppingBag size={22} /></span>
                <span className="ma-stat-val">{newOrders}</span>
                <span className="ma-stat-label">New Orders</span>
              </div>
            </div>

            <section className="ma-card">
              <div className="ma-card-head">
                <h2>Recent Orders</h2>
                <button className="ma-add-btn" type="button" onClick={() => setSection("orders")}>
                  View all
                </button>
              </div>
              <div className="ma-table-wrap">
                {orders.length === 0 ? (
                  <div className="ma-empty-state">No orders yet.</div>
                ) : (
                  <table className="ma-table">
                    <thead>
                      <tr><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id}>
                          <td><span className="ma-cake-name">{o.customer_name || "—"}</span></td>
                          <td>{o.items.reduce((s, i) => s + i.qty, 0)} item(s)</td>
                          <td><span className="ma-price">{fmtBirr(o.total)}</span></td>
                          <td><span className={"ma-order-status " + o.status}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {section === "orders" && (
          <>
            <h1 className="ma-page-title">Orders</h1>
            <p className="ma-page-sub">Every order customers send from the shop.</p>
            <section className="ma-card">
              <div className="ma-card-head">
                <h2>All Orders ({orders.length})</h2>
                <button className="ma-add-btn" type="button" onClick={loadOrders}>Refresh</button>
              </div>
              <div className="ma-table-wrap">
                {orders.length === 0 ? (
                  <div className="ma-empty-state">No orders yet. They'll appear here in real time.</div>
                ) : (
                  <table className="ma-table">
                    <thead>
                      <tr>
                        <th>Order ID</th><th>Customer</th><th>Items</th><th>Delivery</th><th>Total</th><th>Placed</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                            #{o.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td>
                            <div className="ma-cake-name">{o.customer_name || "—"}</div>
                            <div style={{ fontSize: 13, color: "#9a8b7c" }}>{o.customer_phone || ""}</div>
                            {o.customer_address && (
                              <div style={{ fontSize: 12, color: "#9a8b7c" }}>📍 {o.customer_address}</div>
                            )}
                          </td>
                          <td>
                            <ul className="ma-order-items">
                              {o.items.map((it, i) => (
                                <li key={i}>{it.name} × {it.qty}</li>
                              ))}
                            </ul>
                          </td>
                          <td style={{ fontSize: 13, color: "#5a4a3c" }}>
                            {o.delivery_date
                              ? new Date(o.delivery_date + "T00:00:00").toLocaleDateString()
                              : "—"}
                          </td>
                          <td><span className="ma-price">{fmtBirr(o.total)}</span></td>
                          <td style={{ fontSize: 13, color: "#9a8b7c" }}>
                            {new Date(o.created_at).toLocaleString()}
                          </td>
                          <td>
                            <select
                              className="ma-status-select"
                              value={o.status}
                              onChange={(e) => setOrderStatus(o.id, e.target.value)}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {section === "categories" && !viewingCat && (
          <>
            <h1 className="ma-page-title">Categories</h1>
            <p className="ma-page-sub">Add, edit, upload photos, and reorder the categories shown on the storefront homepage.</p>

            <section className="ma-card">
              <div className="ma-card-head" style={{ flexWrap: "wrap", gap: 10 }}>
                <h2>Storefront categories ({categories.length})</h2>
                <button className="ma-add-btn" type="button" onClick={() => setEditingCat({
                  id: "", key: "", title: "", sub: "", badge: "", img: "", sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
                })}>
                  <Plus size={16} style={{ marginRight: 4 }} /> New Category
                </button>
              </div>
              <div style={{ padding: 20 }}>
                {categories.length === 0 ? (
                  <div className="ma-empty-state">No categories yet. Add one to start showing items on the storefront.</div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 20,
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    }}
                  >
                    {categories.map((c) => (
                      <CategoryCard
                        key={c.id}
                        cat={c}
                        itemCount={items.filter((i) => i.cat === c.key).length}
                        onEdit={() => setEditingCat(c)}
                        onDelete={() => deleteCategory(c)}
                        onOpen={() => setViewingCat(c)}
                        onImageUpdated={(url) => {
                          setCategories((arr) => arr.map((x) => x.id === c.id ? { ...x, img: url } : x));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {section === "categories" && viewingCat && (
          <CategoryDetail
            cat={viewingCat}
            items={items.filter((i) => i.cat === viewingCat.key)}
            busy={busy}
            onBack={() => setViewingCat(null)}
            onNewItem={() => setEditing({
              id: "", name: "", sub: "", cat: viewingCat.key, price: 0,
              img: "", available: true, available_today: false, sort_order: 100,
            })}
            onEditItem={(it) => setEditing(it)}
            onDeleteItem={(it) => deleteItem(it)}
            onToggle={(it) => toggleAvail(it)}
          />
        )}

        {section === "menu" && (
          <>
            <h1 className="ma-page-title">Shop Items</h1>
            <p className="ma-page-sub">Add, edit, upload photos, and toggle availability. Changes appear instantly on the shop.</p>

            <section className="ma-card">
              <div className="ma-card-head" style={{ flexWrap: "wrap", gap: 10 }}>
                <h2>Inventory ({filteredItems.length}/{items.length})</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                    className="ma-status-select" style={{ minWidth: 140 }}>
                    <option value="All">All categories</option>
                    {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filterAvail} onChange={(e) => setFilterAvail(e.target.value as any)}
                    className="ma-status-select" style={{ minWidth: 130 }}>
                    <option value="all">All status</option>
                    <option value="in">Available</option>
                    <option value="out">Sold Out</option>
                  </select>
                   <button
                     className="ma-add-btn"
                     type="button"
                     disabled={categories.length === 0}
                     title={categories.length === 0 ? "Add a category first" : "Add a new item"}
                     onClick={() => {
                       if (categories.length === 0) {
                         alert("Please add at least one category before creating items.");
                         setSection("categories");
                         return;
                       }
                       setEditing({
                         id: "", name: "", sub: "", cat: categories[0].key, price: 0,
                         img: "", available: true, available_today: false, sort_order: 100,
                       });
                     }}
                   >
                     <Plus size={16} style={{ marginRight: 4 }} /> New Item
                   </button>
                </div>
              </div>
              <div className="ma-table-wrap">
                <table className="ma-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((it) => {
                      const on = it.available;
                      const b = !!busy[it.id];
                      return (
                        <tr key={it.id}>
                          <td>
                            <div className="ma-cake-cell">
                              <img className="ma-thumb" src={it.img || "https://via.placeholder.com/60?text=%3F"} alt={it.name} loading="lazy" />
                              <div>
                                <div className="ma-cake-name">{it.name}</div>
                                <div style={{ fontSize: 12, color: "#9a8b7c", maxWidth: 320 }}>{it.sub}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="ma-cat-tag">{it.cat}</span></td>
                          <td><span className="ma-price">{fmtBirr(it.price)}</span></td>
                          <td>
                            <span style={{
                              display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                              textTransform: "uppercase", padding: "4px 10px", borderRadius: 999,
                              background: on ? "#dcfce7" : "#fee2e2", color: on ? "#047857" : "#b91c1c",
                            }}>
                              {on ? "Available" : "Sold Out"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button
                                type="button"
                                className={"ma-switch" + (on ? " on" : "")}
                                role="switch"
                                aria-checked={on}
                                disabled={b}
                                aria-label={`Toggle availability for ${it.name}`}
                                onClick={() => toggleAvail(it)}
                              />
                              <button className="ma-add-btn" style={{ padding: "6px 10px" }} onClick={() => setEditing(it)} title="Edit">
                                <Pencil size={14} />
                              </button>
                              <button className="ma-add-btn" style={{ padding: "6px 10px", background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => deleteItem(it)} title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === "settings" && <SettingsPanel />}



      </main>

      {editing && (
        <ItemEditor
          initial={editing}
          existingIds={items.map(i => i.id)}
          categories={categories.map((c) => ({ key: c.key, title: c.title }))}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadItems(); }}
        />
      )}

      {editingCat && (
        <CategoryEditor
          initial={editingCat}
          existingKeys={categories.map((c) => c.key)}
          onClose={() => setEditingCat(null)}
          onSaved={() => { setEditingCat(null); loadCategories(); }}
        />
      )}
    </div>
  );
}

function CategoryCard({
  cat, itemCount, onEdit, onDelete, onOpen, onImageUpdated,
}: {
  cat: ShopCategory;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onImageUpdated: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hovered, setHovered] = useState(false);

  async function handleFile(file: File) {
    setUploadError("");
    const validationError = validateImageUpload(file);
    if (validationError) { setUploadError(validationError); return; }
    if (!cat.id) { setUploadError("Save the category first, then upload an image."); return; }
    setUploading(true);
    try {
      const ext = getImageExtension(file);
      const baseKey = (cat.key || `cat-${Date.now()}`).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const path = `categories/${baseKey}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cake-images").upload(path, file, {
        upsert: true, contentType: file.type || "image/jpeg",
      });
      if (upErr) { setUploadError(uploadFailureMessage(upErr.message)); return; }
      const { data, error: sErr } = await supabase.storage.from("cake-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) { setUploadError("Upload succeeded but the image URL could not be created."); return; }
      const url = data.signedUrl;
      const { error: dbErr } = await supabase.from("shop_categories" as any).update({ img: url }).eq("id", cat.id);
      if (dbErr) { setUploadError("Saved image, but couldn't update category: " + dbErr.message); return; }
      onImageUpdated(url);
    } catch (err) {
      setUploadError(uploadFailureMessage(err instanceof Error ? err.message : "Unexpected upload error"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 10px 30px -18px rgba(74, 44, 29, 0.35)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          cursor: uploading ? "wait" : "pointer",
          background: "#F4FBF7",
        }}
        title="Click to upload/change image"
      >
        {cat.img ? (
          <img
            src={cat.img}
            alt={cat.title}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "grid", placeItems: "center",
            color: "#88D4B0",
          }}>
            <Camera size={38} />
          </div>
        )}

        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
          opacity: hovered || uploading ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
          padding: 12, textAlign: "center",
        }}>
          {uploading ? <Loader2 size={30} className="animate-spin" /> : <Camera size={30} />}
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {uploading ? "Uploading…" : "Click to Upload/Change Image"}
          </span>
        </div>

        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(255,255,255,0.9)",
          display: "grid", placeItems: "center",
          color: "#4a5d54", cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }} title="Drag to reorder (coming soon)" onClick={(e) => e.stopPropagation()}>
          <GripVertical size={16} />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            onClick={onOpen}
            title="Manage items in this category"
            style={{
              minWidth: 0, flex: 1, background: "transparent", border: 0,
              padding: 0, textAlign: "left", cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: "#2a3d35", fontSize: 15, lineHeight: 1.3 }}>{cat.title}</div>
            {cat.sub && (
              <div style={{ fontSize: 12, color: "#7a8a82", marginTop: 3, lineHeight: 1.4 }}>{cat.sub}</div>
            )}
          </button>
          <span className="ma-cat-tag" style={{ flexShrink: 0, fontSize: 11 }}>{itemCount}</span>
        </div>

        {uploadError && (
          <div className="ma-upload-error" style={{ width: "auto", margin: 0 }}>{uploadError}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 6 }}>
          <span style={{ fontSize: 11, color: "#9a8b7c" }}>{cat.key}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onEdit}
              title="Edit"
              style={{
                width: 34, height: 34, borderRadius: "50%", border: 0, cursor: "pointer",
                background: "#88D4B0", color: "#1F3A33",
                display: "grid", placeItems: "center",
                boxShadow: "0 6px 14px -8px rgba(136,212,176,0.7)",
              }}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              style={{
                width: 34, height: 34, borderRadius: "50%", border: 0, cursor: "pointer",
                background: "#ef4444", color: "#fff",
                display: "grid", placeItems: "center",
                boxShadow: "0 6px 14px -8px rgba(239,68,68,0.7)",
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryDetail({
  cat, items, busy, onBack, onNewItem, onEditItem, onDeleteItem, onToggle,
}: {
  cat: ShopCategory;
  items: ShopItem[];
  busy: Record<string, boolean>;
  onBack: () => void;
  onNewItem: () => void;
  onEditItem: (it: ShopItem) => void;
  onDeleteItem: (it: ShopItem) => void;
  onToggle: (it: ShopItem) => void;
}) {
  return (
    <>
      <nav aria-label="breadcrumb" style={{ fontSize: 13, color: "#7a8a82", marginBottom: 8 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "transparent", border: 0, padding: 0, color: "#88D4B0", fontWeight: 700, cursor: "pointer" }}
        >
          Categories
        </button>
        <span style={{ margin: "0 6px" }}>/</span>
        <span style={{ color: "#2a3d35", fontWeight: 600 }}>{cat.title}</span>
      </nav>
      <h1 className="ma-page-title">{cat.title}</h1>
      <p className="ma-page-sub">Manage the cakes shown in this category on the storefront.</p>

      <section className="ma-card">
        <div className="ma-card-head">
          <h2>Cakes in {cat.title} ({items.length})</h2>
        </div>
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            <button
              type="button"
              onClick={onNewItem}
              style={{
                minHeight: 280,
                background: "#F4FBF7",
                border: "2px dashed #88D4B0",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                color: "#1F3A33",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#E6F6EE")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#F4FBF7")}
            >
              <span style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#88D4B0", color: "#fff",
                display: "grid", placeItems: "center",
                boxShadow: "0 8px 20px -8px rgba(136,212,176,0.8)",
              }}>
                <Plus size={28} />
              </span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>Upload New Cake</span>
              <span style={{ fontSize: 12, color: "#7a8a82" }}>Add a cake to {cat.title}</span>
            </button>

            {items.map((it) => {
              const on = it.available;
              const b = !!busy[it.id];
              return (
                <div
                  key={it.id}
                  style={{
                    position: "relative",
                    background: "#fff",
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 10px 30px -18px rgba(74, 44, 29, 0.35)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#F4FBF7" }}>
                    {it.img ? (
                      <img src={it.img} alt={it.name} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#88D4B0" }}>
                        <Cake size={38} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#2a3d35", fontSize: 15, lineHeight: 1.3 }}>{it.name}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className="ma-price">{fmtBirr(it.price)}</span>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: ".06em",
                        textTransform: "uppercase", padding: "3px 8px", borderRadius: 999,
                        background: on ? "#dcfce7" : "#fee2e2", color: on ? "#047857" : "#b91c1c",
                      }}>
                        {on ? "Active" : "Sold Out"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 6 }}>
                      <button
                        type="button"
                        className={"ma-switch" + (on ? " on" : "")}
                        role="switch"
                        aria-checked={on}
                        disabled={b}
                        aria-label={`Toggle availability for ${it.name}`}
                        onClick={() => onToggle(it)}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => onEditItem(it)}
                          title="Edit"
                          style={{
                            width: 34, height: 34, borderRadius: "50%", border: 0, cursor: "pointer",
                            background: "#88D4B0", color: "#1F3A33",
                            display: "grid", placeItems: "center",
                            boxShadow: "0 6px 14px -8px rgba(136,212,176,0.7)",
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(it)}
                          title="Delete"
                          style={{
                            width: 34, height: 34, borderRadius: "50%", border: 0, cursor: "pointer",
                            background: "#ef4444", color: "#fff",
                            display: "grid", placeItems: "center",
                            boxShadow: "0 6px 14px -8px rgba(239,68,68,0.7)",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function ItemEditor({ initial, existingIds, categories, onClose, onSaved }: {
  initial: ShopItem;
  existingIds: string[];
  categories: { key: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !initial.id;
  const [form, setForm] = useState<ShopItem>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof ShopItem>(k: K, v: ShopItem[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(file: File) {
    setUploadError("");
    const validationError = validateImageUpload(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    try {
      const ext = getImageExtension(file);
      const baseId = form.id || `item-${Date.now()}`;
      const path = `items/${baseId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cake-images").upload(path, file, {
        upsert: true, contentType: file.type || "image/jpeg",
      });
      if (upErr) { setUploadError(uploadFailureMessage(upErr.message)); return; }
      // Bucket is private — use a long-lived signed URL (10 years)
      const { data, error: sErr } = await supabase.storage.from("cake-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) { setUploadError("The image uploaded, but the storefront URL could not be created. Please try again."); return; }
      update("img", data.signedUrl);
      setUploadError("");
    } catch (error) {
      setUploadError(uploadFailureMessage(error instanceof Error ? error.message : "Unexpected upload error"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) { alert("Name is required"); return; }
    if (!form.cat) { alert("Category is required"); return; }
    if (!categories.some((c) => c.key === form.cat)) {
      alert(`"${form.cat}" is not a valid category. Pick one from the list — items with unknown categories won't show on the storefront.`);
      return;
    }
    let id = form.id.trim();
    if (isNew) {
      if (!id) id = `itm-${Date.now()}`;
      if (existingIds.includes(id)) { alert("ID already exists, pick another"); return; }
    }
    setSaving(true);
    const payload = {
      id, name: form.name.trim(), sub: form.sub, cat: form.cat,
      price: Number(form.price) || 0, img: form.img,
      available: !!form.available, available_today: !!form.available_today,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = isNew
      ? await supabase.from("shop_items" as any).insert(payload)
      : await supabase.from("shop_items" as any).update(payload).eq("id", initial.id);
    setSaving(false);
    if (error) { alert("Save failed: " + error.message); return; }
    onSaved();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(46,21,3,.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FDF6EE", borderRadius: 22, width: "100%", maxWidth: 560,
          maxHeight: "90dvh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(240,184,174,.4)" }}>
          <h2 style={{ fontWeight: 800, color: "#2E1503", fontSize: "1.15rem", margin: 0 }}>
            {isNew ? "New Shop Item" : "Edit Item"}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "#F9D9D3", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{
                width: 120, height: 120, borderRadius: 16, overflow: "hidden",
                background: "#F9D9D3", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {form.img ? (
                  <img src={form.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#9a8b7c", fontSize: 12 }}>No image</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              <button type="button" className="ma-add-btn" disabled={uploading}
                onClick={() => fileRef.current?.click()}
                style={{ marginTop: 8, width: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
              </button>
              <p className="ma-upload-help">{IMAGE_UPLOAD_HELP}</p>
              {uploadError && <p className="ma-upload-error" role="alert">{uploadError}</p>}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Name">
                <input value={form.name} onChange={(e) => update("name", e.target.value)} style={inp} />
              </Field>
              <Field label="Subtitle / description">
                <input value={form.sub} onChange={(e) => update("sub", e.target.value)} style={inp} />
              </Field>
              <Field label="Image URL (or upload)">
                <input value={form.img} onChange={(e) => { update("img", e.target.value); setUploadError(""); }} placeholder="https://..." style={inp} />
              </Field>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="Category">
              <select value={form.cat} onChange={(e) => update("cat", e.target.value)} style={inp}>
                {categories.length === 0 && <option value="">— No categories —</option>}
                {categories.map((c) => <option key={c.key} value={c.key}>{c.title} ({c.key})</option>)}
              </select>
            </Field>
            <Field label="Price (Birr)">
              <input type="number" min={0} step="0.01" value={form.price}
                onChange={(e) => update("price", Number(e.target.value))} style={inp} />
            </Field>
            <Field label="Sort order">
              <input type="number" value={form.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value))} style={inp} />
            </Field>
          </div>

          {isNew && (
            <Field label="ID (optional — auto-generated if blank)">
              <input value={form.id} onChange={(e) => update("id", e.target.value)} placeholder="e.g. bday5" style={inp} />
            </Field>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, color: "#2E1503" }}>
            <input type="checkbox" checked={form.available}
              onChange={(e) => update("available", e.target.checked)} />
            Available on shop
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, color: "#2E1503" }}>
            <input type="checkbox" checked={!!form.available_today}
              onChange={(e) => update("available_today", e.target.checked)} />
            Feature in “Available Today” on the home page
          </label>
        </div>

        <div style={{ padding: 18, borderTop: "1px solid rgba(240,184,174,.4)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="ma-add-btn" onClick={onClose}
            style={{ background: "white", color: "#2E1503" }}>Cancel</button>
          <button type="button" className="ma-add-btn" disabled={saving} onClick={save}>
            {saving ? "Saving…" : (isNew ? "Create item" : "Save changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid rgba(240,184,174,.55)", fontFamily: "inherit",
  fontSize: ".88rem", outline: "none", background: "white", color: "#2E1503",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#9a8b7c", letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function CategoryEditor({ initial, existingKeys, onClose, onSaved }: {
  initial: ShopCategory;
  existingKeys: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !initial.id;
  const [form, setForm] = useState<ShopCategory>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof ShopCategory>(k: K, v: ShopCategory[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(file: File) {
    setUploadError("");
    const validationError = validateImageUpload(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    try {
      const ext = getImageExtension(file);
      const baseKey = (form.key || `cat-${Date.now()}`).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      const path = `categories/${baseKey}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cake-images").upload(path, file, {
        upsert: true, contentType: file.type || "image/jpeg",
      });
      if (upErr) { setUploadError(uploadFailureMessage(upErr.message)); return; }
      const { data, error: sErr } = await supabase.storage.from("cake-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data) { setUploadError("The image uploaded, but the storefront URL could not be created. Please try again."); return; }
      update("img", data.signedUrl);
      setUploadError("");
    } catch (error) {
      setUploadError(uploadFailureMessage(error instanceof Error ? error.message : "Unexpected upload error"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const title = form.title.trim();
    const key = (form.key || title).trim();
    if (!title) { alert("Title is required"); return; }
    if (!key) { alert("Key is required"); return; }
    if (isNew && existingKeys.includes(key)) { alert("Key already exists, pick another"); return; }
    setSaving(true);
    const payload = {
      key, title, sub: form.sub, badge: form.badge, img: form.img,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = isNew
      ? await supabase.from("shop_categories" as any).insert(payload)
      : await supabase.from("shop_categories" as any).update(payload).eq("id", initial.id);
    setSaving(false);
    if (error) { alert("Save failed: " + error.message); return; }
    onSaved();
  }

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(46,21,3,.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#FDF6EE", borderRadius: 22, width: "100%", maxWidth: 560, maxHeight: "90dvh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(240,184,174,.4)" }}>
          <h2 style={{ fontWeight: 800, color: "#2E1503", fontSize: "1.15rem", margin: 0 }}>
            {isNew ? "New Category" : "Edit Category"}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: "#F9D9D3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{ width: 120, height: 120, borderRadius: 16, overflow: "hidden", background: "#F9D9D3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.img ? (
                  <img src={form.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#9a8b7c", fontSize: 12 }}>No image</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              <button type="button" className="ma-add-btn" disabled={uploading}
                onClick={() => fileRef.current?.click()}
                style={{ marginTop: 8, width: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Upload size={14} /> {uploading ? "Uploading…" : "Upload"}
              </button>
              <p className="ma-upload-help">{IMAGE_UPLOAD_HELP}</p>
              {uploadError && <p className="ma-upload-error" role="alert">{uploadError}</p>}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Title">
                <input value={form.title} onChange={(e) => update("title", e.target.value)} style={inp} />
              </Field>
              <Field label="Subtitle">
                <input value={form.sub} onChange={(e) => update("sub", e.target.value)} style={inp} />
              </Field>
              <Field label="Image URL (or upload)">
                <input value={form.img} onChange={(e) => { update("img", e.target.value); setUploadError(""); }} placeholder="https://..." style={inp} />
              </Field>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="Key (matches item category)">
              <input value={form.key} disabled={!isNew} onChange={(e) => update("key", e.target.value)} placeholder="e.g. Fasting" style={inp} />
            </Field>
            <Field label="Badge">
              <input value={form.badge} onChange={(e) => update("badge", e.target.value)} placeholder="e.g. Holiday" style={inp} />
            </Field>
            <Field label="Sort order">
              <input type="number" value={form.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value))} style={inp} />
            </Field>
          </div>
        </div>
        <div style={{ padding: 18, borderTop: "1px solid rgba(240,184,174,.4)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="ma-add-btn" onClick={onClose} style={{ background: "white", color: "#2E1503" }}>Cancel</button>
          <button type="button" className="ma-add-btn" disabled={saving} onClick={save}>
            {saving ? "Saving…" : (isNew ? "Create category" : "Save changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Normalize a Telegram username or link into a bare username (no @, no URL). */
export function normalizeTelegramUsername(raw: string): string {
  let v = (raw || "").trim();
  v = v.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
  v = v.replace(/^@/, "");
  v = v.replace(/\/+$/, "");
  return v.trim();
}

const settingsInp: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 12,
  border: "1.5px solid var(--ma-line)", fontSize: 14, fontFamily: "inherit",
  color: "var(--ma-brown)", outline: "none",
};

function SettingsPanel() {
  // ---- Telegram settings ----
  const [tgUsername, setTgUsername] = useState("");
  const [tgLoading, setTgLoading] = useState(true);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgMsg, setTgMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ---- Admin account ----
  const [accEmail, setAccEmail] = useState("");
  const [username, setUsername] = useState("");
  const [accSaving, setAccSaving] = useState(false);
  const [accMsg, setAccMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ---- Password ----
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "telegram_username")
        .maybeSingle();
      setTgUsername(((data as any)?.value as string) ?? "");
      setTgLoading(false);

      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      if (u) {
        setAccEmail(u.email ?? "");
        setUsername((u.user_metadata?.username as string) ?? "");
      }
    })();
  }, []);

  async function saveTelegram(e: React.FormEvent) {
    e.preventDefault();
    setTgMsg(null);
    const normalized = normalizeTelegramUsername(tgUsername);
    if (!normalized) return setTgMsg({ type: "err", text: "Please enter a Telegram username." });
    if (!/^[A-Za-z0-9_]{3,64}$/.test(normalized)) {
      return setTgMsg({ type: "err", text: "Username may only contain letters, numbers, and underscores (3–64 chars)." });
    }
    setTgSaving(true);
    const { error } = await supabase
      .from("app_settings" as any)
      .upsert({ key: "telegram_username", value: normalized }, { onConflict: "key" });
    setTgSaving(false);
    if (error) { setTgMsg({ type: "err", text: "Could not save: " + error.message }); return; }
    setTgUsername(normalized);
    setTgMsg({ type: "ok", text: "Telegram username saved successfully." });
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccMsg(null);
    const uname = username.trim();
    if (uname.length > 60) return setAccMsg({ type: "err", text: "Username is too long." });
    const email = accEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setAccMsg({ type: "err", text: "Please enter a valid email address." });
    }
    setAccSaving(true);
    const { error } = await supabase.auth.updateUser({
      email,
      data: { username: uname },
    });
    setAccSaving(false);
    if (error) { setAccMsg({ type: "err", text: "Could not update account: " + error.message }); return; }
    setAccMsg({
      type: "ok",
      text: "Account updated successfully. If you changed your email, check your inbox to confirm the change.",
    });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!curPw) return setPwMsg({ type: "err", text: "Please enter your current password." });
    if (newPw.length < 8) return setPwMsg({ type: "err", text: "New password must be at least 8 characters." });
    if (newPw !== confirmPw) return setPwMsg({ type: "err", text: "New password and confirmation do not match." });

    setPwSaving(true);
    // Verify current password by re-authenticating.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (!email) { setPwSaving(false); return setPwMsg({ type: "err", text: "Could not determine your account email." }); }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: curPw });
    if (signInErr) {
      setPwSaving(false);
      return setPwMsg({ type: "err", text: "Current password is incorrect." });
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwMsg({ type: "err", text: "Could not change password: " + error.message }); return; }
    setCurPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg({ type: "ok", text: "Password changed successfully." });
  }

  const notice = (m: { type: "ok" | "err"; text: string } | null) =>
    m ? (
      <div style={{
        marginTop: 12, padding: "10px 14px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
        background: m.type === "ok" ? "#DCF4E8" : "#FBE0EA",
        color: m.type === "ok" ? "#1F8A5B" : "#9F1239",
      }}>
        {m.text}
      </div>
    ) : null;

  return (
    <>
      <h1 className="ma-page-title">Settings</h1>
      <p className="ma-page-sub">Manage your Telegram contact and admin account.</p>

      {/* ---- Telegram settings ---- */}
      <section className="ma-card" style={{ marginBottom: 26 }}>
        <div className="ma-card-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Send size={18} /> Telegram Settings
          </h2>
        </div>
        <div style={{ padding: 24, maxWidth: 520 }}>
          <p style={{ margin: "0 0 16px", color: "var(--ma-muted)", fontSize: 13.5 }}>
            The ordering system opens this Telegram profile so customers can send their order.
          </p>
          <form onSubmit={saveTelegram}>
            <div className="ma-field">
              <span>Telegram Username</span>
              <input
                type="text"
                value={tgUsername}
                onChange={(e) => setTgUsername(e.target.value)}
                placeholder="selamcake or https://t.me/selamcake"
                disabled={tgLoading}
                style={settingsInp}
              />
              <p style={{ margin: "6px 0 0", color: "var(--ma-muted)", fontSize: 12 }}>
                Opens as https://t.me/{normalizeTelegramUsername(tgUsername) || "…"}
              </p>
            </div>
            {notice(tgMsg)}
            <div style={{ marginTop: 16 }}>
              <button className="ma-add-btn" type="submit" disabled={tgSaving || tgLoading}>
                {tgSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---- Admin account ---- */}
      <section className="ma-card" style={{ marginBottom: 26 }}>
        <div className="ma-card-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UserCog size={18} /> Admin Account
          </h2>
        </div>
        <div style={{ padding: 24, maxWidth: 520 }}>
          <form onSubmit={saveAccount}>
            <div className="ma-field">
              <span>Username</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                maxLength={60} style={settingsInp} />
            </div>
            <div className="ma-field">
              <span>Email</span>
              <input type="email" value={accEmail} onChange={(e) => setAccEmail(e.target.value)}
                style={settingsInp} />
            </div>
            {notice(accMsg)}
            <div style={{ marginTop: 16 }}>
              <button className="ma-add-btn" type="submit" disabled={accSaving}>
                {accSaving ? "Saving…" : "Save Account"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---- Password ---- */}
      <section className="ma-card">
        <div className="ma-card-head">
          <h2>Change Password</h2>
        </div>
        <div style={{ padding: 24, maxWidth: 520 }}>
          <form onSubmit={savePassword}>
            <div className="ma-field">
              <span>Current Password</span>
              <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)}
                autoComplete="current-password" style={settingsInp} />
            </div>
            <div className="ma-field">
              <span>New Password</span>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password" style={settingsInp} />
            </div>
            <div className="ma-field">
              <span>Confirm New Password</span>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password" style={settingsInp} />
            </div>
            {notice(pwMsg)}
            <div style={{ marginTop: 16 }}>
              <button className="ma-add-btn" type="submit" disabled={pwSaving}>
                {pwSaving ? "Updating…" : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
