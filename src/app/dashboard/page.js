"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

const money = (n) => "₦" + n.toLocaleString("en-NG");
const STATUSES = ["pending", "confirmed", "packed", "shipped", "ready_for_pickup", "collected", "cancelled"];
const LABELS = {
  pending: "Pending",
  confirmed: "Payment confirmed",
  packed: "Packed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
};
const NEXT = {
  pending: { label: "Mark paid and confirm", patch: { paid: true, status: "confirmed" } },
  confirmed: { label: "Mark as packed", patch: { status: "packed" } },
  packed: { label: "Handed to transport company", patch: { status: "shipped" } },
  shipped: { label: "Arrived: ready for pickup", patch: { status: "ready_for_pickup" } },
  ready_for_pickup: { label: "Mark as collected", patch: { status: "collected" } },
};
const DELIVERY_FIELDS = ["carrier_name", "carrier_phone", "waybill_number", "pickup_location"];

function waNumber(phone) {
  const d = String(phone).replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0")) return "234" + d.slice(1);
  return d;
}

function messageFor(o) {
  const name = (o.customer_name || "").split(" ")[0];
  const track = `\n\nTrack your order: ${window.location.origin}/track?${o.tracking_token ? "t=" + o.tracking_token : "order=" + o.id}`;
  const way = o.waybill_number ? ` Waybill number: ${o.waybill_number}.` : "";
  const phone = o.carrier_phone ? ` Their number: ${o.carrier_phone}.` : "";
  const park = o.pickup_location ? ` It will be available at ${o.pickup_location}.` : "";
    const fee = o.delivery_tbc
    ? " Your delivery fee will be confirmed with you."
    : o.delivery_paid_to !== "zonix" && o.delivery_fee > 0
    ? ` Please bring ${money(o.delivery_fee)} to pay the transport company when you collect.`
    : "";
  switch (o.status) {
    case "pending":
      return `Hi ${name}, we've received your order ${o.id} (${money(o.total)}). Please pay by bank transfer and send your receipt here.${track}`;
    case "confirmed":
      return `Hi ${name}, your payment for order ${o.id} is confirmed. We'll let you know when it's packed.${track}`;
    case "packed":
      return `Hi ${name}, your order ${o.id} has been packed and will be handed to the transport company soon.${track}`;
    case "shipped":
      return `Hi ${name}, your order ${o.id} has been handed to ${o.carrier_name || "the transport company"}.${way}${phone}${park}${fee}${track}`;
    case "ready_for_pickup":
            return `Hi ${name}, good news! Your order ${o.id} has arrived${o.pickup_location ? " at " + o.pickup_location : ""}.${way}${phone} Please pick it up.${fee}${track}\n\nAfter you collect it, please tap "I've collected my order" on that page so we can close your order.`;
    case "collected":
      return `Hi ${name}, thank you for shopping with Zonix Classic! Your order ${o.id} is marked as collected. How was your experience? Reply and tell us, we'd love to hear.`;
    default:
      return `Hi ${name}, an update on your order ${o.id}: it has been cancelled. Message us here if you have any questions.`;
  }
}

function Bars({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-3 font-bold">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
      {rows.map(([k, v]) => (
        <div key={k} className="my-2 text-sm">
          {k} · {v}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(v / max) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-1 h-1.5 rounded bg-brand"
          />
        </div>
      ))}
    </div>
  );
}

function ManageModal({ order, saving, onSave, onClose }) {
  const [f, setF] = useState({
    carrier_name: order.carrier_name || "",
    carrier_phone: order.carrier_phone || "",
    waybill_number: order.waybill_number || "",
    pickup_location: order.pickup_location || "",
  });
  const [note, setNote] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const next = NEXT[order.status];
  const input = "mt-1 w-full rounded-lg border border-line bg-bg p-2.5";

  async function save(patch) {
    // Send only what actually changed, so other people's edits are never overwritten
    const changes = {};
    DELIVERY_FIELDS.forEach((k) => {
      const val = f[k].trim() || null;
      if (val !== (order[k] || null)) changes[k] = val;
    });
    const all = { ...changes, ...patch };
    if (Object.keys(all).length === 0) return setNote("Nothing new to save.");
    setNote("Saving...");
    const ok = await onSave(order.id, all);
    setNote(ok ? "Saved." : "Couldn't save. Check your connection and try again.");
  }

  function message() {
    const live = { ...order, ...f };
    window.open(
      `https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(messageFor(live))}`,
      "_blank"
    );
  }

  const btn = "w-full rounded-lg py-2.5 font-bold disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Order {order.id}</h2>
            <p className="text-sm text-slate-500">
              {LABELS[order.status]} · {order.paid ? "Paid" : "Unpaid"}
            </p>
          </div>
          <button onClick={onClose} className="text-sm font-semibold">Close</button>
        </div>

        <div className="mt-3 rounded-xl border border-line bg-bg p-3 text-sm">
          <p className="font-bold">{order.customer_name}</p>
          <p>{order.phone}</p>
          <p className="text-slate-600">{order.address}</p>
          {order.destination && (
            <p className="mt-1">
              To: {order.destination} · fee {order.delivery_tbc ? "to be confirmed" : money(order.delivery_fee)}
            </p>
          )}
        </div>
                {order.customer_confirmed_at && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Customer confirmed collection on{" "}
            {new Date(order.customer_confirmed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        )}
        {order.rating && (
          <p className="mt-3 rounded-lg border border-line p-3 text-sm">
            Rating: <b>{order.rating}/5</b>
            {order.feedback ? ` · "${order.feedback}"` : ""}
          </p>
        )}
        {next && (
          <button
            disabled={saving}
            onClick={() => save(next.patch)}
            className={btn + " mt-4 bg-brand py-3 text-white"}
          >
            {saving ? "Saving..." : `Next: ${next.label}`}
          </button>
        )}

        <p className="mt-5 text-sm font-bold">Delivery details</p>
        <p className="text-xs text-slate-500">Fill these in before moving to Shipped or Ready for pickup, so the customer sees them.</p>
        <label className="mt-2 block text-sm font-semibold">
          Transport company
          <input className={input} value={f.carrier_name} onChange={(e) => set("carrier_name", e.target.value)} />
        </label>
        <label className="mt-2 block text-sm font-semibold">
          Driver or office phone
          <input className={input} type="tel" value={f.carrier_phone} onChange={(e) => set("carrier_phone", e.target.value)} />
        </label>
        <label className="mt-2 block text-sm font-semibold">
          Waybill number
          <input className={input} value={f.waybill_number} onChange={(e) => set("waybill_number", e.target.value)} />
        </label>
        <label className="mt-2 block text-sm font-semibold">
          Pickup park and address
          <input className={input} value={f.pickup_location} onChange={(e) => set("pickup_location", e.target.value)} />
        </label>

        <button disabled={saving} onClick={() => save({})} className={btn + " mt-3 border border-line"}>
          Save details
        </button>
        <button onClick={message} className={btn + " mt-2 border border-line"}>
          Message customer on WhatsApp
        </button>
              {isAdmin && (
        <Link href="/admin/products" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          Manage products
        </Link>
      )}
        <p className="min-h-5 pt-2 text-sm text-slate-500">{note}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [staff, setStaff] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  async function loadOrders(quiet = false) {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      if (!quiet) setError("Couldn't load orders: " + error.message);
      return;
    }
    setOrders(data);
    setUpdatedAt(new Date());
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      const { data: s } = await supabase
        .from("staff")
        .select("role, ref_code")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (!s) return setState("denied");
      setStaff(s);
      await loadOrders();
      setState("ready");
    }
    init();
  }, [router]);

  // Refresh by itself every 20 seconds, and whenever you come back to this tab
  useEffect(() => {
    if (state !== "ready") return;
    const refresh = () => {
      if (document.visibilityState === "visible" && !saving) loadOrders(true);
    };
    const timer = setInterval(refresh, 20000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, saving]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function change(id, patch) {
    setError("");
    const { data, error } = await supabase.from("orders").update(patch).eq("id", id).select();
    if (error || !data || data.length === 0) {
      setError("That change wasn't saved. Check your connection and try again.");
      return false;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data[0] } : o)));
    return true;
  }

  // One save at a time, so quick double taps can't clash with each other
  async function run(id, patch) {
    if (saving) return false;
    setSaving(id);
    const ok = await change(id, patch);
    setSaving(null);
    return ok;
  }

  if (state === "loading") return null;
  if (state === "denied") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <p className="font-bold">This account doesn't have dashboard access.</p>
        <button onClick={signOut} className="mt-4 rounded-lg border border-line px-4 py-2 font-semibold">
          Sign out
        </button>
      </main>
    );
  }

  const isAdmin = staff.role === "admin";
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? orders.filter((o) =>
        [o.id, o.customer_name, isAdmin ? o.phone : ""].join(" ").toLowerCase().includes(needle)
      )
    : orders;
  const editingOrder = editing ? orders.find((o) => o.id === editing) : null;

  const live = orders.filter((o) => o.status !== "cancelled");
  const paid = live.filter((o) => o.paid);
  const unpaid = live.filter((o) => !o.paid);
  const sum = (list) => list.reduce((a, o) => a + o.total, 0);
  const refRevenue = sum(paid.filter((o) => o.ref));

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleString("en", { month: "short" }), total: 0 });
  }
  paid.forEach((o) => {
    const d = new Date(o.created_at);
    const m = months.find((x) => x.key === d.getFullYear() + "-" + d.getMonth());
    if (m) m.total += o.total;
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  function top(pick) {
    const t = {};
    live.forEach((o) =>
      o.order_items.forEach((i) => {
        const k = pick(i) || "n/a";
        t[k] = (t[k] || 0) + i.qty;
      })
    );
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

    const rated = orders.filter((o) => o.rating);
  const stats = [
    ["Paid revenue", money(sum(paid))],
    ["Awaiting payment", `${money(sum(unpaid))} (${unpaid.length})`],
    ["Orders", live.length],
    [isAdmin ? "From referrals" : "Your referral sales", money(refRevenue)],
        ["Customer rating", rated.length ? `${(rated.reduce((a, o) => a + o.rating, 0) / rated.length).toFixed(1)}/5 (${rated.length})` : "No ratings yet"],
  ];

  const heads = ["Order", "Date", "Customer", "Items", "Total", "Referral", "Payment", "Status", ...(isAdmin ? ["Manage"] : [])];
  const cell = "border-b border-line p-2";
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft size={16} /> Back to shop
        </Link>
        <button onClick={signOut} className="inline-flex items-center gap-2 text-sm font-semibold">
          <LogOut size={16} /> Sign out
        </button>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Sales dashboard</h1>
      <p className="text-slate-600">
        {isAdmin ? "Admin view: every order." : `Ambassador view: orders from your code (${staff.ref_code}).`}
      </p>
      <p className="min-h-5 text-sm text-red-600">{error}</p>

      <div className="my-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-extrabold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="mb-3 font-bold">Revenue by month (paid orders)</h3>
          <div className="flex h-32 items-end gap-2">
            {months.map((m) => (
              <div key={m.key} title={money(m.total)} className="flex h-full flex-1 flex-col justify-end text-center text-xs text-slate-500">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(2, (m.total / maxMonth) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="rounded-t bg-brand"
                />
                {m.label}
              </div>
            ))}
          </div>
        </div>
        <Bars title="Top products" rows={top((i) => i.product_name)} />
        <Bars title="Sizes in demand" rows={top((i) => i.size)} />
        <Bars title="Colours in demand" rows={top((i) => i.colour)} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">
            Orders
            <button onClick={() => loadOrders()} className="ml-2 rounded border border-line px-2 py-1 text-xs font-semibold">
              Refresh
            </button>
            {updatedAt && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                Updated {updatedAt.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAdmin ? "Search order number, name or phone" : "Search order number or name"}
            className="w-full rounded-lg border border-line bg-bg p-2 text-sm sm:w-72"
          />
        </div>
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              {heads.map((h) => (
                <th key={h} className={cell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={heads.length} className="p-4 text-slate-500">No orders found.</td></tr>
            )}
            {shown.slice(0, 30).map((o) => (
              <tr key={o.id} className="align-top">
                <td className={cell}>{o.id}</td>
                <td className={cell}>{new Date(o.created_at).toLocaleDateString("en-NG")}</td>
                <td className={cell}>
                  {o.customer_name}
                  {isAdmin && <div className="text-slate-500">{o.phone}</div>}
                </td>
                <td className={cell}>
                  {o.order_items.map((i) => (
                    <div key={i.id}>{i.qty}× {i.product_name} ({[i.colour, i.size].filter(Boolean).join(", ")})</div>
                  ))}
                </td>
                <td className={cell}>{money(o.total)}</td>
                <td className={cell}>{o.ref || "direct"}</td>
                <td className={cell}>
                  <span className={"font-bold " + (o.paid ? "text-emerald-700" : "text-amber-700")}>
                    {o.paid ? "Paid" : "Unpaid"}
                  </span>
                  {isAdmin && (
                    <button
                      disabled={saving === o.id}
                      onClick={() =>
                        run(o.id, {
                          paid: !o.paid,
                          ...(!o.paid && o.status === "pending" ? { status: "confirmed" } : {}),
                        })
                      }
                      className="ml-2 rounded border border-line px-2 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      {saving === o.id ? "Saving..." : o.paid ? "Mark unpaid" : "Mark paid"}
                    </button>
                  )}
                </td>
                <td className={cell}>
                  {isAdmin ? (
                    <select
                      value={o.status}
                      disabled={saving === o.id}
                      onChange={(e) => run(o.id, { status: e.target.value })}
                      className="rounded border border-line p-1 disabled:opacity-50"
                      aria-label={"Status for " + o.id}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{LABELS[s]}</option>
                      ))}
                    </select>
                  ) : (
                    LABELS[o.status] || o.status
                  )}
                </td>
                {isAdmin && (
                  <td className={cell}>
                    <button
                      onClick={() => setEditing(o.id)}
                      className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Manage
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && editingOrder && (
        <ManageModal
          key={editingOrder.id}
          order={editingOrder}
          saving={saving === editingOrder.id}
          onSave={run}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}