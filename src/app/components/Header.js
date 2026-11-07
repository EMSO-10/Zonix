"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";

export default function Header() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Show the Dashboard link only when a staff member is signed in on this device
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const link = "block py-3 text-lg font-semibold";

  return (
    <>
      <header
        className={
          "fixed inset-x-0 top-0 z-30 transition-colors duration-300 " +
          (scrolled ? "border-b border-line bg-bg/90 backdrop-blur" : "bg-transparent")
        }
      >
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 text-ink">
          <button
            onClick={() => setMenu(true)}
            aria-label="Open menu"
            className="flex w-fit items-center gap-2 font-semibold"
          >
            <Menu size={22} />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link href="/" className="pl-[0.34em] text-sm font-light tracking-[0.34em] sm:text-xl sm:tracking-[0.42em]">
            ZONIX CLASSIC
          </Link>

          <motion.button
            key={count}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            aria-label={`Cart, ${count} items`}
            className="relative ml-auto p-2"
          >
            <ShoppingBag size={22} />
            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          </motion.button>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenu(false)}
          >
            <motion.aside
              className="h-full w-72 bg-white p-6"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-light tracking-[0.3em]">ZONIX CLASSIC</p>
                <button onClick={() => setMenu(false)} aria-label="Close menu"><X /></button>
              </div>
              <nav className="mt-8">
                <Link href="/" className={link} onClick={() => setMenu(false)}>Home</Link>
                <a href="/#shop" className={link} onClick={() => setMenu(false)}>Shop</a>
                <Link href="/track" className={link} onClick={() => setMenu(false)}>Track order</Link>
                {signedIn && (
                  <Link href="/dashboard" className={link + " text-brand"} onClick={() => setMenu(false)}>
                    Dashboard
                  </Link>
                )}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}