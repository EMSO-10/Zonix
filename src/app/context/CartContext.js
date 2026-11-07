"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [toast, setToast] = useState(null);
  const [zones, setZones] = useState([]);
  const [zonesStatus, setZonesStatus] = useState("loading");
  const [zone, setZone] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Pick up a referral code from the link: ?ref=chuma or #chuma
  useEffect(() => {
    try {
      const raw =
        new URLSearchParams(window.location.search).get("ref") ||
        window.location.hash.slice(1);
      const clean = (raw || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (clean) {
        setRef(clean);
        localStorage.setItem("zonix_ref", clean);
      } else {
        const saved = localStorage.getItem("zonix_ref");
        if (saved) setRef(saved);
      }
    } catch (e) {}
  }, []);

  // Load the destinations and their fixed delivery fees
  async function loadZones() {
    setZonesStatus("loading");
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("active", true)
      .order("id");
    if (error || !data) {
      setZonesStatus("error");
      return;
    }
    setZones(data);
    setZonesStatus("ready");
  }
  useEffect(() => {
    loadZones();
  }, []);

  // Keep the chosen destination itself, so it can't get lost
  function chooseZone(id) {
    setZone(zones.find((z) => String(z.id) === String(id)) || null);
  }
  const zoneId = zone ? String(zone.id) : "";

  const keyOf = (i) => `${i.id}-${i.colour}-${i.size}`;

  function addItem(item) {
    setItems((prev) => {
      const found = prev.find((i) => keyOf(i) === keyOf(item));
      if (found) {
        return prev.map((i) => (keyOf(i) === keyOf(item) ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setToast({ text: `${item.name} (${item.colour}, ${item.size}) added to cart`, n: Date.now() });
  }

  function changeQty(item, delta) {
    setItems((prev) =>
      prev
        .map((i) => (keyOf(i) === keyOf(item) ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  const count = items.reduce((a, i) => a + i.qty, 0);
  const total = items.reduce((a, i) => a + i.qty * i.price, 0);
  const payNow = total + (zone && zone.paid_to === "zonix" ? zone.fee : 0);

  async function placeOrder(customer) {
    const { data, error } = await supabase.rpc("place_order", {
      p_name: customer.name,
      p_phone: customer.phone,
      p_address: customer.address,
      p_email: customer.email,
      p_consent: customer.emailConsent,
      p_ref: ref,
      p_items: items.map((i) => ({ id: i.id, colour: i.colour, size: i.size, qty: i.qty })),
      p_zone_id: zone ? zone.id : null,
    });
    if (error) {
      return { error: "We couldn't save your order. Check your connection and try again." };
    }
    const order = {
      id: data.id,
      token: data.token,
      items,
      total: data.total,
      pay_now: data.pay_now,
      delivery_fee: data.delivery_fee,
      delivery_paid_to: data.delivery_paid_to,
      delivery_tbc: data.delivery_tbc,
      destination: zone ? zone.name : null,
      name: customer.name,
    };
    setItems([]);
    return { order };
  }

  return (
    <CartContext.Provider
      value={{
        items, open, setOpen, ref, setRef, addItem, changeQty, count, total,
        placeOrder, toast, zones, zonesStatus, loadZones, zoneId, chooseZone, zone, payNow,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}