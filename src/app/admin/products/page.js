"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

const BUCKET = "product-images";
const PRESETS = [
  ["Shirts and tops", "S, M, L, XL"],
  ["Trousers", "30, 32, 34, 36"],
  ["Footwear", "41, 42, 43, 44, 45"],
  ["One size", "One size"],
];
const EMPTY = {
  name: "", price: "", category: "", sizes: "S, M, L, XL",
  colours: "", badge: "", sold_out: false, image: "",
};

const money = (n) => "₦" + Number(n).toLocaleString("en-NG");
const toList = (s) =>
  [...new Set(String(s).split(",").map((x) => x.trim()).filter(Boolean))];
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product";

// Shrink big phone photos before uploading, so the shop stays fast on mobile data
async function shrink(file, maxSide = 1400, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", quality)
  );
}

export default function AdminProducts() {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null); // null = form closed
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const loadRequest = useRef(0);
  const active = useRef(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    const request = ++loadRequest.current;
    try {
      const { data, error: err } = await supabase.from("products").select("*").order("id");
      if (!active.current || request !== loadRequest.current) return false;
      if (err) {
        setMsg("Couldn't load products: " + err.message);
        return false;
      }
      setProducts(data || []);
      return true;
    } catch (err) {
      if (!active.current || request !== loadRequest.current) return false;
      setMsg("Couldn't load products: " + (err.message || "Check your connection and try again."));
      return false;
    }
  }

  useEffect(() => {
    active.current = true;
    async function init() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active.current) return;
        if (sessionError) throw sessionError;
        if (!data.session) {
          router.replace("/login");
          return;
        }

        const { data: staff, error: staffError } = await supabase
          .from("staff")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (!active.current) return;
        if (staffError) throw staffError;
        if (!staff || staff.role !== "admin") {
          setState("denied");
          return;
        }

        await load();
        if (active.current) setState("ready");
      } catch (err) {
        if (!active.current) return;
        setPageError(err.message || "Couldn't verify admin access. Please try again.");
        setState("error");
      }
    }

    void init();
    return () => {
      active.current = false;
      loadRequest.current += 1;
    };
  }, [router]);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  function openNew() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setFile(null);
    setPreview("");
    setError("");
    setMsg("");
  }

  function openEdit(p) {
    setForm({
      name: p.name,
      price: String(p.price),
      category: p.category || "",
      sizes: (p.sizes || []).join(", "),
      colours: (p.colours || []).join(", "),
      badge: p.badge || "",
      sold_out: !!p.sold_out,
      image: p.image || "",
    });
    setEditingId(p.id);
    setFile(null);
    setPreview(p.image || "");
    setError("");
    setMsg("");
  }

  function pickFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setFile(null);
      setPreview(form.image || "");
      return setError("Please choose a JPG, PNG or WebP photo.");
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setError("");
    const name = form.name.trim();
    const price = Number(String(form.price).replace(/[,\s₦]/g, ""));
    const category = form.category.trim();
    const sizes = toList(form.sizes);
    const colours = toList(form.colours);
    const badge = form.badge.trim();
    if (name.length < 2) return setError("Enter the product name.");
    if (!Number.isInteger(price) || price < 0) return setError("Enter the price as a whole number, like 22000.");
    if (!category) return setError("Enter a category, like Shirts.");
    if (sizes.length === 0) return setError("Add at least one size, or type One size.");
    if (!file && !form.image.trim()) return setError("Add a photo.");

    setSaving(true);
    let uploadedPath = null;
    try {
      let image = form.image.trim();
      if (file) {
        const blob = await shrink(file);
        const path = `${Date.now()}-${slug(name)}.jpg`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        uploadedPath = path;
        image = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const row = { name, price, category, image, sizes, colours, badge: badge || null, sold_out: form.sold_out };
      const res = editingId
        ? await supabase.from("products").update(row).eq("id", editingId).select()
        : await supabase.from("products").insert(row).select();
      if (res.error) throw res.error;
      if (!res.data || res.data.length === 0) throw new Error("No product was returned after saving.");
      const savedProduct = res.data[0];
      setProducts((prev) => {
        const next = editingId
          ? prev.map((product) => (product.id === editingId ? savedProduct : product))
          : [...prev, savedProduct];
        return next.sort((a, b) => a.id - b.id);
      });
      setForm(null);
      setMsg(editingId ? "Changes saved." : "Product added. It shows on the shop within moments.");
    } catch (e) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedPath]);
        if (cleanupError) {
          console.error("Could not remove unused product image:", cleanupError.message);
        }
      }
      setError(e.message || "Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function quick(p, patch) {
    if (busyId !== null) return;
    setBusyId(p.id);
    setMsg("");
    try {
      const { data, error: err } = await supabase.from("products").update(patch).eq("id", p.id).select();
      if (err || !data || data.length === 0) {
        setMsg(err?.message || "That change wasn't saved. Try again.");
        return;
      }
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data[0] : x)));
    } catch (err) {
      setMsg(err.message || "That change wasn't saved. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p) {
    if (busyId !== null || !window.confirm(`Delete "${p.name}"? Past orders keep their record of it.`)) return;
    setBusyId(p.id);
    setMsg("");
    try {
      const { error: err } = await supabase.from("products").delete().eq("id", p.id);
      if (err) {
        setMsg("Couldn't delete it: " + err.message);
        return;
      }
      setProducts((prev) => prev.filter((product) => product.id !== p.id));
      setMsg("Deleted.");
    } catch (err) {
      setMsg("Couldn't delete it: " + (err.message || "Check your connection and try again."));
    } finally {
      setBusyId(null);
    }
  }

  if (state === "loading") return null;
  if (state === "error") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <p role="alert" className="font-bold text-red-700">{pageError}</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-brand underline">
          Return to staff login
        </Link>
      </main>
    );
  }
  if (state === "denied") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <p className="font-bold">This page is for Zonix admins only.</p>
        <Link href="/dashboard" className="mt-4 inline-block font-semibold text-brand underline">
          Back to the dashboard
        </Link>
      </main>
    );
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const input = "mt-1 w-full rounded-lg border border-line bg-bg p-2.5";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Products</h1>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-bold text-white">
          <Plus size={18} /> Add product
        </button>
      </div>
      <p className="mt-1 text-slate-600">
        Changes show on the shop when customers open or refresh it.
      </p>
      <p className="min-h-6 pt-2 text-sm font-semibold text-brand">{msg}</p>

      <div className="mt-2 space-y-3">
        {products.length === 0 && <p className="text-slate-500">No products yet. Add your first one.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-xl border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="h-24 w-20 shrink-0 rounded-lg bg-bg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              <p className="text-sm text-slate-600">
                {money(p.price)} · {p.category}
              </p>
              <p className="text-xs text-slate-500">
                Sizes: {(p.sizes || []).join(", ") || "none"}
                {p.colours && p.colours.length > 0 && ` · Colours: ${p.colours.join(", ")}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  disabled={busyId === p.id}
                  aria-pressed={!!p.sold_out}
                  onClick={() => quick(p, { sold_out: !p.sold_out })}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-50 " +
                    (p.sold_out ? "border-red-300 bg-red-50 text-red-700" : "border-line")
                  }
                >
                  {p.sold_out ? "Sold out (tap to restock)" : "In stock (tap for sold out)"}
                </button>
                <button
                  disabled={busyId === p.id}
                  aria-pressed={p.badge === "New"}
                  onClick={() => quick(p, { badge: p.badge === "New" ? null : "New" })}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-50 " +
                    (p.badge === "New" ? "border-brand bg-brand/10 text-brand" : "border-line")
                  }
                >
                  {p.badge === "New" ? "New (tap to remove)" : p.badge ? `Tag: ${p.badge}` : "Mark as New"}
                </button>
                <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-bold">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => remove(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => !saving && setForm(null)}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editingId ? "Edit product" : "Add product"}</h2>
              <button onClick={() => setForm(null)} disabled={saving} aria-label="Close"><X /></button>
            </div>

            <label className="mt-4 block text-sm font-semibold">
              Name
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Price in naira (numbers only)
              <input className={input} inputMode="numeric" placeholder="22000" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Category
              <input className={input} list="cats" placeholder="Shirts" value={form.category} onChange={(e) => set("category", e.target.value)} />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>

            <label className="mt-3 block text-sm font-semibold">
              Sizes (separate with commas)
              <input className={input} value={form.sizes} onChange={(e) => set("sizes", e.target.value)} />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map(([label, value]) => (
                <button key={label} type="button" onClick={() => set("sizes", value)} className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm font-semibold">
              Colours (optional, separate with commas)
              <input className={input} placeholder="White, Ash" value={form.colours} onChange={(e) => set("colours", e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Tag (optional, for example New)
              <input className={input} value={form.badge} onChange={(e) => set("badge", e.target.value)} />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.sold_out} onChange={(e) => set("sold_out", e.target.checked)} />
              Sold out
            </label>

            <p className="mt-4 text-sm font-semibold">Photo</p>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="mt-2 h-40 w-32 rounded-lg bg-bg object-cover" />
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="mt-2 block w-full text-sm" />
            <p className="mt-1 text-xs text-slate-500">
              Portrait photos on a plain background look best. Big photos are shrunk automatically.
            </p>

            <p className="min-h-5 pt-2 text-sm text-red-600">{error}</p>
            <button disabled={saving} onClick={save} className="w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}