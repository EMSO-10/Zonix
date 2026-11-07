"use client";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 70]);

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
      {/* Photo: drifts down slightly as you scroll, and slowly zooms in */}
      <motion.div style={{ y }} className="absolute inset-x-0 -top-20 bottom-0">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={{ scale: 1.06 }}
          transition={{ duration: 14, ease: "easeOut" }}
        >
          <Image
            src="/hero-rack.jpg"
            alt="Long clothing rack of shirts and tees against a pale wall"
            fill
            priority
            sizes="100vw"
                        onLoad={() => {
              window.__zonixHeroReady = true;
              window.dispatchEvent(new Event("zonix:hero-ready"));
            }}
            className="object-cover object-[60%_50%] md:object-[50%_40%]"
          />
        </motion.div>
      </motion.div>

      {/* Soft fades so the navigation and the caption stay readable */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-24 px-6 text-center text-white">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          className="text-[40px] font-normal leading-[1.1] md:text-6xl"
        >
          Your Confidence.
          <br />
          Our Craft.
        </motion.h1>
        <motion.a
          href="#shop"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
          className="mt-6 inline-block border-b border-white pb-1 pt-3 font-semibold"
        >
          Shop Now
        </motion.a>
      </div>

      <p className="absolute inset-x-0 bottom-6 text-center text-[11px] tracking-[0.3em] text-white/90">
        SCROLL
      </p>
    </section>
  );
}