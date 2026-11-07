"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Star } from "lucide-react";
import { supabase } from "../lib/supabase";

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "paid", label: "Payment confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Handed to transport company" },
  { key: "ready_for_pickup", label: "Ready for pickup" },
  { key: "collected", label: "Collected" },
];

const money = (n) => "₦" + Number(n).toLocaleString("en-NG");
const when = (t) =>
  t ? new Date(t).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

function progress(r) {
  const at = {};
  r.events.forEach((e) => {
    at[e.status === "pending" ? "placed" : e.status] = e.at;
  });
  let reached = 0;
  STEPS.forEach((s, i) => {
    if (at[s.key]) reached = Math.max(reached, i);
  });
  if (r.paid) reached = Math.max(reached, 1);
  return { at, reached };
}

export default function Track() {
  const [order, setOrder] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const source = useRef(null); // how this order was found, so we can check it again
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const fetchOrder = useCallback(async () => {
    const s = source.current;
    if (!s) return null;
    const { data, error: err } = s.token
      ? await supabase.rpc("track_by_token", { p_token: s.token })
      : await supabase.rpc("track_order", { p_order: s.order, p_phone: s.phone });
    if (err) return { failed: true };
    return { data };
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetchOrder();
    if (res && !res.failed && res.data) {
      setResult(res.data);
      setUpdatedAt(new Date());
    }
  }, [fetchOrder]);

  // Open straight from a private link, or pre-fill the order number
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    const q = params.get("order");
    if (t) {
      source.current = { token: t };
      fetchOrder().then((res) => {
        if (res && res.data) {
          setResult(res.data);
          setUpdatedAt(new Date());
        } else {
          setError("This tracking link isn't valid. Enter your order number and phone number below.");
        }
      });
    } else if (q) {
      setOrder(q.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
    }
  }, [fetchOrder]);

  // Check for changes every 20 seconds, and when the customer returns to this tab
  const finished = !!result && ["collected", "cancelled"].includes(result.status);
  const active = !!result && !finished;
  useEffect(() => {
    if (!active) return;
    const check = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(check, 20000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [active, refresh]);

  async function lookup(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (order.trim().length < 4 || phone.replace(/\D/g, "").length < 10) {
      return setError("Enter your order number and the phone number you ordered with.");
    }
    setBusy(true);
    source.current = { order: order.trim(), phone };
    const res = await fetchOrder();
    setBusy(false);
    if (!res || res.failed) return setError("Something went wrong. Please try again.");
    if (!res.data) return setError("We couldn't find that order. Check the order number and phone number.");
    setResult(res.data);
    setUpdatedAt(new Date());
  }
    const tokenOf = () => source.current?.token || result?.token;

  async function confirmCollected() {
    if (!window.confirm("Have you collected your order?")) return;
    setConfirming(true);
    setConfirmError("");
    const { data, error: err } = await supabase.rpc("confirm_collected", { p_token: tokenOf() });
    setConfirming(false);
    if (err || !data) {
      return setConfirmError("We couldn't confirm that. Please try again, or message us on WhatsApp.");
    }
    setResult({ ...data, token: tokenOf() });
    setUpdatedAt(new Date());
  }

  async function sendFeedback() {
    if (!stars) return setConfirmError("Please tap a star rating first.");
    setSendingFeedback(true);
    setConfirmError("");
    const { data, error: err } = await supabase.rpc("submit_feedback", {
      p_token: tokenOf(),
      p_rating: stars,
      p_comment: comment,
    });
    setSendingFeedback(false);
    if (err || !data) return setConfirmError("We couldn't save your feedback. Please try again.");
    setResult({ ...data, token: tokenOf() });
  }
  const input = "w-full rounded-lg border border-line bg-white p-3";
  const r = result;
  const p = r ? progress(r) : null;
  const cancelled = r?.status === "cancelled";
  const onTheWay = !!r && !cancelled && ["shipped", "ready_for_pickup"].includes(r.status);
  const phoneHref = (n) => "tel:" + String(n).replace(/[^\d+]/g, "");

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
        <ArrowLeft size={16} /> Back to shop
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Track your order</h1>
      <p className="mt-1 text-slate-600">Enter your order number and the phone number you ordered with.</p>

      <form onSubmit={lookup} className="mt-5 space-y-3">
        <input
          className={input}
          placeholder="Order number, e.g. ZX-1004"
          value={order}
          onChange={(e) => setOrder(e.target.value.toUpperCase())}
          autoCapitalize="characters"
        />
        <input
          className={input}
          type="tel"
          placeholder="Phone number"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="min-h-5 text-sm text-red-600">{error}</p>
        <button disabled={busy} className="w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Looking..." : "Track order"}
        </button>
      </form>

      {r && (
        <div className="mt-8">
          <h2 className="text-xl font-extrabold">Order {r.id}</h2>
          <p className="text-sm text-slate-500">Placed {when(r.created_at)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {updatedAt &&
              `Updated ${updatedAt.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`}
            {active && " · checks automatically"}{" "}
            <button type="button" onClick={refresh} className="font-semibold text-brand underline">
              Refresh
            </button>
          </p>

          <div className="mt-3 rounded-xl border border-line bg-white p-4 text-sm">
            {r.items.map((i, n) => (
              <div key={n}>
                {i.qty}× {i.name}{" "}
                {[i.colour, i.size].filter(Boolean).length > 0 && `(${[i.colour, i.size].filter(Boolean).join(", ")})`}
              </div>
            ))}
          </div>

          {cancelled && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              This order was cancelled. If this is a surprise, please message us on WhatsApp.
            </div>
          )}

          {onTheWay && r.delivery_tbc && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Your delivery fee will be confirmed with you on WhatsApp before pickup.
            </div>
          )}
          {onTheWay && !r.delivery_tbc && r.delivery_paid_to !== "zonix" && r.delivery_fee > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Remember to bring <b>{money(r.delivery_fee)}</b> to pay the transport company when you collect.
            </div>
          )}

          {!cancelled && r.status === "ready_for_pickup" && (
            <div className="mt-4 rounded-xl border-2 border-brand bg-white p-4">
              <p className="font-extrabold text-brand">Your order is ready for pickup</p>
              {r.pickup_location && <p className="mt-2">Pick up at: <b>{r.pickup_location}</b></p>}
              {r.waybill_number && <p>Waybill number: <b>{r.waybill_number}</b></p>}
              {r.carrier_name && <p>Transport company: <b>{r.carrier_name}</b></p>}
              {r.carrier_phone && (
                <p>
                  Their number: <a className="font-bold text-brand underline" href={phoneHref(r.carrier_phone)}>{r.carrier_phone}</a>
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">Show the waybill number when you collect.</p>
            </div>
          )}
                    {!cancelled && ["shipped", "ready_for_pickup"].includes(r.status) && (
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              <p className="font-bold">Got your order?</p>
              <p className="text-sm text-slate-600">
                Once you've collected it, tap the button so we can close your order.
              </p>
              <button
                onClick={confirmCollected}
                disabled={confirming}
                className="mt-3 w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-50"
              >
                {confirming ? "Confirming..." : "I've collected my order"}
              </button>
              <p className="min-h-5 pt-1 text-sm text-red-600">{confirmError}</p>
            </div>
          )}

          {r.status === "collected" && (
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              {r.rating ? (
                <>
                  <p className="font-bold">Thank you for your feedback</p>
                  <p className="mt-1 flex gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={20} fill={n <= r.rating ? "currentColor" : "none"} />
                    ))}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">How was your experience?</p>
                  <p className="text-sm text-slate-600">It takes ten seconds and helps us improve.</p>
                  <div className="mt-3 flex gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onClick={() => setStars(n)}
                      >
                        <Star size={30} fill={n <= stars ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={input + " mt-3"}
                    rows={2}
                    maxLength={500}
                    placeholder="Anything we should know? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    onClick={sendFeedback}
                    disabled={sendingFeedback}
                    className="mt-3 w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-50"
                  >
                    {sendingFeedback ? "Sending..." : "Send feedback"}
                  </button>
                  <p className="min-h-5 pt-1 text-sm text-red-600">{confirmError}</p>
                </>
              )}
            </div>
          )}
          <ol className={"mt-6 " + (cancelled ? "opacity-40" : "")}>
            {STEPS.map((s, i) => {
              const done = i <= p.reached;
              const current = i === p.reached && !cancelled;
              const last = i === STEPS.length - 1;
              return (
                <motion.li
                  key={s.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="relative flex gap-4 pb-7"
                >
                  {!last && (
                    <span className={"absolute left-[15px] top-8 h-full w-0.5 " + (i < p.reached ? "bg-brand" : "bg-line")} />
                  )}
                  <span
                    className={
                      "z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 " +
                      (done ? "border-brand bg-brand text-white" : "border-line bg-white")
                    }
                  >
                    {done && <Check size={16} />}
                  </span>
                  <div>
                    <p className={"font-bold " + (done ? "" : "text-slate-400")}>
                      {s.label}
                      {current && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">Now</span>}
                    </p>
                    {p.at[s.key] && <p className="text-sm text-slate-500">{when(p.at[s.key])}</p>}
                    {s.key === "shipped" && done && (r.carrier_name || r.waybill_number) && (
                      <p className="mt-1 text-sm text-slate-600">
                        {r.carrier_name && <>With {r.carrier_name}. </>}
                        {r.waybill_number && <>Waybill no. <b>{r.waybill_number}</b></>}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {r.destination && (
            <p className="text-sm text-slate-600">
              Delivery to {r.destination}:{" "}
              {r.delivery_tbc
                ? "the fee will be confirmed with you on WhatsApp."
                : `${money(r.delivery_fee)}, ${r.delivery_paid_to === "zonix" ? "included in your payment to Zonix" : "paid to the transport company at pickup"}.`}
            </p>
          )}
        </div>
      )}
    </main>
  );
}