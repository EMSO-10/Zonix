import { products } from "../data/products";

const KEY = "zonix_orders";

export function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveOrders(orders) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch (e) {}
}

// Makes 6 months of believable sample orders so the dashboard has something to show
export function sampleOrders() {
  let x = 7;
  const rand = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  const names = ["Tunde", "Chidi", "Emeka", "Ayo", "Dami", "Seyi", "Kunle", "Ife"];
  const now = new Date();
  const out = [];

  for (let m = 5; m >= 0; m--) {
    const count = 4 + Math.floor(rand() * 5) + (5 - m);
    for (let i = 0; i < count; i++) {
      const p = products[Math.floor(rand() * products.length)];
      const colours = p.colours || ["Standard"];
      const sizes = p.sizes || ["S", "M", "L", "XL"];
      const qty = rand() > 0.8 ? 2 : 1;
      let d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(rand() * 26));
      if (d > now) d = new Date(now.getTime() - 86400000 * (i + 1));
      const paid = m > 0 || rand() > 0.4;
      out.push({
        id: "ZX-" + (1000 + out.length),
        date: d.toISOString(),
        name: names[Math.floor(rand() * names.length)],
        phone: "0803•••••••",
        address: "UI, Ibadan",
        ref: rand() > 0.4 ? "sochukwuma" : "",
        items: [
          {
            id: p.id,
            name: p.name,
            colour: colours[Math.floor(rand() * colours.length)],
            size: sizes[Math.floor(rand() * sizes.length)],
            qty,
            price: p.price,
          },
        ],
        total: p.price * qty,
        paid,
        status: paid ? (m > 0 ? "delivered" : "confirmed") : "pending",
      });
    }
  }
  return out;
}
