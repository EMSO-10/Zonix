"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { BANK, WHATSAPP_NUMBER } from "../data/config";

const money = (n) => "₦" + n.toLocaleString("en-NG");
const input = "w-full rounded-lg border border-line bg-bg p-2.5";

export default function CartDrawer() {
  const {
    items, open, setOpen, changeQty, total, ref, setRef, placeOrder,
    zones, zonesStatus, loadZones, zoneId, chooseZone, zone, payNow,
  } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "", consent: false });
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [sending, setSending] = useState(false);
  const [addressError, setAddressError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function close() {
    setOpen(false);
    setOrder(null);
    setError("");
  }

  async function submit() {
    const phone = form.phone.replace(/\s/g, "");
    if (!zone) return setError("Please choose your destination first. We need it to work out your delivery fee.");
    if (form.name.trim().length < 2) return setError("Enter your full name.");
    if (!/^(\+?234|0)\d{10}$/.test(phone)) return setError("Enter a valid Nigerian phone number.");
    if (form.address.trim().length < 6) {
      setAddressError(
        `Please add your area or landmark, for example "Nyanya, near the market". "${form.address.trim() || "Abuja"}" is too short for the delivery company to find you.`
      );
      document.getElementById("address-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      return setError("Enter a valid email, or leave it blank.");
    setError("");
    setSending(true);
    const result = await placeOrder({
      name: form.name.trim(),
      phone,
      address: form.address.trim(),
      email: form.email.trim(),
      emailConsent: form.consent && !!form.email,
    });
    setSending(false);
    if (result.error) return setError(result.error);
    setOrder(result.order);
  }

  const waText = order
    ? `Hi Zonix, I just placed order ${order.id} (${money(order.pay_now)}). Items: ` +
      order.items.map((i) => `${i.qty}x ${i.name} (${i.colour}, ${i.size})`).join("; ") +
      `. Delivery to: ${order.destination}. Name: ${order.name}.`
    : "";

  const deliveryNote = order
    ? order.delivery_tbc
      ? "Your delivery fee will be confirmed with you on WhatsApp."
      : order.delivery_paid_to === "zonix"
      ? `Delivery to ${order.destination} (${money(order.delivery_fee)}) is included in this payment.`
      : `Delivery to ${order.destination} is ${money(order.delivery_fee)}, paid to the transport company when you collect.`
    : "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.aside
            className="h-full w-full max-w-md overflow-y-auto bg-white p-5"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">
                {order ? `Order ${order.id} placed` : "Your order"}
              </h2>
              <button onClick={close} aria-label="Close"><X /></button>
            </div>

            {order ? (
              <div className="mt-4">
                <p>
                  Pay <b>{money(order.pay_now)}</b> by bank transfer. Use <b>{order.id}</b> as the narration.
                </p>
                <div className="my-4 rounded-xl border border-dashed border-line bg-bg p-4">
                  <p>Account name: <b>{BANK.accountName}</b></p>
                  <p>Account number: <b>{BANK.accountNumber}</b></p>
                  <p>Bank: <b>{BANK.bankName}</b></p>
                </div>
                <p className="text-sm font-semibold">{deliveryNote}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Your order stays unpaid until Zonix confirms the transfer. Send your receipt on WhatsApp to
                  speed this up. These are sample bank details for the demo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    className="rounded-lg bg-brand px-4 py-2.5 font-bold text-white"
                    target="_blank"
                    rel="noopener"
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`}
                  >
                    Send on WhatsApp
                  </a>
                  <a
                    href={order.token ? `/track?t=${order.token}` : `/track?order=${order.id}`}
                    className="rounded-lg border border-line px-4 py-2.5 font-bold"
                  >
                    Track order
                  </a>
                  <button className="rounded-lg border border-line px-4 py-2.5 font-bold" onClick={close}>
                    Done
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <p className="mt-6 text-slate-500">Your cart is empty. Pick a piece from the shop.</p>
            ) : (
              <div className="mt-4">
                {items.map((i) => (
                  <div key={`${i.id}-${i.colour}-${i.size}`} className="flex items-center justify-between border-b border-line py-3">
                    <div>
                      <p className="font-bold">{i.name}</p>
                      <p className="text-sm text-slate-500">{i.colour} · {i.size} · {money(i.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="rounded border border-line p-1" onClick={() => changeQty(i, -1)} aria-label="Remove one"><Minus size={14} /></button>
                      <span>{i.qty}</span>
                      <button className="rounded border border-line p-1" onClick={() => changeQty(i, 1)} aria-label="Add one"><Plus size={14} /></button>
                    </div>
                  </div>
                ))}

                {/* Step 1: destination, compulsory */}
                <div className={"mt-4 rounded-xl border-2 p-3 " + (zone ? "border-line" : "border-brand")}>
                  <label htmlFor="zone-select" className="block text-sm font-extrabold">
                    Where should we deliver to? <span className="font-semibold text-red-600">Required</span>
                  </label>
                  {zonesStatus === "error" ? (
                    <p className="mt-2 text-sm text-red-600">
                      Couldn't load destinations.{" "}
                      <button type="button" className="font-bold underline" onClick={loadZones}>
                        Try again
                      </button>
                    </p>
                  ) : (
                    <select
                      id="zone-select"
                      className={input + " mt-2"}
                      value={zoneId}
                      disabled={zonesStatus === "loading"}
                      onChange={(e) => {
                        chooseZone(e.target.value);
                        setError("");
                      }}
                    >
                      <option value="">
                        {zonesStatus === "loading" ? "Loading destinations..." : "Choose a destination"}
                      </option>
                      {zones.map((z) => (
                        <option key={z.id} value={String(z.id)}>
                          {z.name}{z.tbc ? " (fee confirmed on WhatsApp)" : ` · ${money(z.fee)}`}
                        </option>
                      ))}
                    </select>
                  )}
                  {zone && (
                    <p className="mt-2 text-sm text-slate-600">
                      Delivering to <b>{zone.name}</b>
                      {zone.tbc
                        ? ". The fee will be confirmed on WhatsApp."
                        : zone.paid_to === "zonix"
                        ? `. Delivery ${money(zone.fee)} is added to your payment.`
                        : `. Delivery ${money(zone.fee)} is paid to the transport company when you collect.`}
                    </p>
                  )}
                </div>

                <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  <div className="flex justify-between"><span>Items</span><span>{money(total)}</span></div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>
                      {!zone
                        ? "Choose a destination"
                        : zone.tbc
                        ? "Confirmed on WhatsApp"
                        : zone.paid_to === "zonix"
                        ? money(zone.fee)
                        : `${money(zone.fee)} at pickup`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold">
                    <span>Pay now</span><span>{money(payNow)}</span>
                  </div>
                </div>

                <label className="mt-4 block text-sm font-semibold">Full name</label>
                <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
                <label className="mt-3 block text-sm font-semibold">WhatsApp number</label>
                <input className={input} type="tel" placeholder="0803 000 0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />

                <label className="mt-3 block text-sm font-semibold">
                  {zone && !zone.tbc
                    ? `Area and landmark in ${zone.name.split(" (")[0]}`
                    : "Street address and landmark"}
                </label>
                <textarea
                  id="address-box"
                  className={input}
                  rows={2}
                  placeholder="Please add your area or a landmark"
                  value={form.address}
                  onChange={(e) => {
                    set("address", e.target.value);
                    setAddressError("");
                  }}
                  autoComplete="street-address"
                />
                <p className="min-h-4 text-sm text-red-600">{addressError}</p>

                <label className="mt-3 block text-sm font-semibold">Email (for new arrivals)</label>
                <input className={input} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                <label className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                  <input type="checkbox" className="mt-1" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
                  Email me when new products arrive. I can unsubscribe at any time.
                </label>
                <label className="mt-3 block text-sm font-semibold">Referral code (optional)</label>
                <input className={input} value={ref} onChange={(e) => setRef(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />

                <p className="min-h-5 pt-2 text-sm text-red-600">{error}</p>
                <button
                  disabled={sending || !zone}
                  className="w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-50"
                  onClick={submit}
                >
                  {sending ? "Placing order..." : !zone ? "Choose a destination to continue" : "Place order"}
                </button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}