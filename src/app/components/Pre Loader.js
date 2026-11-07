"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const MIN_MS = 2400; // the shortest the intro will run, in milliseconds
const MAX_MS = 6000; // the longest it will ever wait for the hero photo

const serif = { fontFamily: "var(--font-playfair), Georgia, serif" };
const rise = [0.22, 1, 0.36, 1];

function Welcome() {
  return (
    <div className="overflow-hidden pb-2 text-center text-white" style={serif}>
      <motion.h1
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: rise }}
        className="text-4xl font-normal leading-tight md:text-6xl"
      >
        Welcome
      </motion.h1>
    </div>
  );
}

export default function Preloader() {
  const [show, setShow] = useState(true);
  const reduce = useReducedMotion();
  const finishRef = useRef(() => {});

  useEffect(() => {
    // Show the intro once per visit, so returning shoppers aren't made to wait
    let seen = false;
    try {
      seen = !!sessionStorage.getItem("zonix_seen");
    } catch (e) {}
    if (seen) {
      setShow(false);
      return;
    }

    const min = reduce ? 400 : MIN_MS;
    let minDone = false;
    let heroReady = !!window.__zonixHeroReady;
    let finished = false;
    const timers = [];

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem("zonix_seen", "1");
      } catch (e) {}
      window.dispatchEvent(new Event("zonix:intro-done"));
      setShow(false);
    };
    finishRef.current = finish;

    // Lift the curtain only when the minimum time has passed AND the hero photo is ready
    const check = () => {
      if (minDone && heroReady) timers.push(setTimeout(finish, 200));
    };
    const onHero = () => {
      heroReady = true;
      check();
    };

    window.addEventListener("zonix:hero-ready", onHero);
    timers.push(
      setTimeout(() => {
        minDone = true;
        check();
      }, min)
    );
    timers.push(setTimeout(finish, MAX_MS)); // never get stuck on a slow connection

    return () => {
      window.removeEventListener("zonix:hero-ready", onHero);
      timers.forEach(clearTimeout);
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#0a1120]"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* Laptops and desktops: the landscape logo image fills the screen */}
          <motion.div
            className="absolute inset-0 hidden md:block"
            initial={reduce ? false : { scale: 1.1, filter: "blur(10px)" }}
            animate={{ scale: 1, filter: "blur(0px)" }}
            transition={{
              scale: { duration: 3, ease: "easeOut" },
              filter: { duration: 1.4, ease: "easeOut" },
            }}
          >
            <Image
              src="/zonix-logo-landscape.jpg"
              alt="Zonix Classic"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-x-0 top-[12%] hidden px-6 md:block">
            <Welcome />
          </div>

          {/* Phones: the portrait version, so the logo is never cropped */}
          <div className="absolute inset-0 flex items-center justify-center md:hidden">
            <motion.div
              className="relative aspect-[2/3] max-h-full w-full"
              initial={reduce ? false : { scale: 1.08, filter: "blur(10px)" }}
              animate={{ scale: 1, filter: "blur(0px)" }}
              transition={{
                scale: { duration: 3, ease: "easeOut" },
                filter: { duration: 1.4, ease: "easeOut" },
              }}
            >
              <Image
                src="/zonix-logo-portrait.jpg"
                alt="Zonix Classic"
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 top-[15%] px-4">
                <Welcome />
              </div>
            </motion.div>
          </div>

          {/* Skip, and a thin progress line */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-10">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => finishRef.current()}
                className="px-2 py-1 text-xs tracking-[0.3em] text-white/70 hover:text-white"
              >
                SKIP
              </button>
            </div>
            <div className="h-px w-full bg-white/20">
              <motion.div
                className="h-px bg-white"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: (reduce ? 400 : MIN_MS) / 1000, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}