"use client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useProducts, useProductsSyncError } from "../context/ProductsContext";
import ProductCard from "./ProductCard";
import ProductModal from "./Product.Modal";
import FeaturedRow from "./FeaturedRow";

export default function Shop() {
  const products = useProducts();
  const syncError = useProductsSyncError();
  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState(null);
  const cats = ["All", ...new Set(products.map((p) => p.category))];
  const shown = cat === "All" ? products : products.filter((p) => p.category === cat);

  // "Just in" shows items tagged with a badge. If none, it shows the first 6.
  const tagged = products.filter((p) => p.badge);
    const featured = tagged.slice(-6).reverse();

  return (
    <section>
      {syncError && (
        <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {syncError}
        </p>
      )}
            {featured.length > 0 && <FeaturedRow items={featured} onSelect={setSelected} />}

      <h2 className="pt-4 text-2xl font-extrabold tracking-tight">All pieces</h2>
      <div className="flex gap-2 overflow-x-auto py-3">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={
              "whitespace-nowrap rounded-full border px-4 py-1.5 font-semibold " +
              (c === cat ? "border-ink bg-ink text-white" : "border-line bg-white")
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 pb-12 md:grid-cols-4">
        {shown.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onSelect={setSelected} />
        ))}
      </div>

      <AnimatePresence>
        {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}