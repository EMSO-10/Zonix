"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../context/CartContext";

export default function Toast() {
  const { toast } = useCart();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.n}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}