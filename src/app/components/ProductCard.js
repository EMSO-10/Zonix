"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export default function ProductCard({ product, index, onSelect }) {
  return (
    <motion.button
      onClick={() => onSelect(product)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      className="block w-full overflow-hidden rounded-xl border border-line bg-white text-left"
    >
            <div className="relative aspect-[4/5]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={"object-cover " + (product.soldOut ? "opacity-50" : "")}
          sizes="(min-width: 768px) 25vw, 50vw"
        />
        {product.badge && !product.soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
            {product.badge}
          </span>
        )}
        {product.soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">
            Sold out
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold">{product.name}</p>
        <p className="text-sm text-slate-500">{product.category}</p>
        <p className="mt-1 font-extrabold text-brand">
          ₦{product.price.toLocaleString("en-NG")}
        </p>
      </div>
    </motion.button>
  );
}