"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductModal({ product, onClose }) {
  const { addItem } = useCart();
  const sizes = product.sizes || ["S", "M", "L", "XL"];
  const colours = product.colours || ["Standard"];
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [colour, setColour] = useState(colours[0]);
  const [error, setError] = useState("");

  function add() {
    if (!size) return setError("Choose a size first.");
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image, size, colour });
    onClose();
  }

  const pick = (active) =>
    "rounded-lg border px-3 py-1.5 font-semibold " +
    (active ? "border-brand ring-1 ring-brand" : "border-line");

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white md:rounded-2xl"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] bg-slate-100">
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="512px" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full bg-white p-2">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-extrabold">{product.name}</h2>
          <p className="font-bold text-brand">₦{product.price.toLocaleString("en-NG")}</p>

          {product.colours && (
            <>
              <p className="mt-4 text-sm font-semibold">Colour</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {colours.map((c) => (
                  <button key={c} className={pick(c === colour)} onClick={() => setColour(c)}>{c}</button>
                ))}
              </div>
            </>
          )}

          <p className="mt-4 text-sm font-semibold">Size</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} className={pick(s === size)} onClick={() => { setSize(s); setError(""); }}>{s}</button>
            ))}
          </div>

          <p className="min-h-5 pt-2 text-sm text-red-600">{error}</p>
                    <button
            disabled={product.soldOut}
            className="w-full rounded-lg bg-brand py-3 font-bold text-white disabled:opacity-40"
            onClick={add}
          >
            {product.soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}