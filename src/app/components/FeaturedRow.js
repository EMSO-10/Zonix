"use client";
import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function FeaturedRow({ items, onSelect }) {
  const row = useRef(null);
  const slide = (dir) =>
    row.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div className="pb-6 pt-2">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Just in</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => slide(-1)}
            aria-label="Slide left"
            className="rounded-full border border-line bg-white p-2"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <motion.button
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => slide(1)}
            aria-label="Slide right"
            className="rounded-full border border-line bg-white p-2"
          >
            <ArrowRight size={18} />
          </motion.button>
        </div>
      </div>

      <div
        ref={row}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p, i) => (
          <motion.button
            key={p.id}
            onClick={() => onSelect(p)}
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
            whileTap={{ scale: 0.97 }}
            className="w-[62%] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-white text-left md:w-[24%]"
          >
            <div className="relative aspect-[4/5]">
              <Image
                src={p.image}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 24vw, 62vw"
              />
            </div>
            <div className="p-3">
              <p className="font-bold">{p.name}</p>
              <p className="font-extrabold text-brand">
                ₦{p.price.toLocaleString("en-NG")}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}