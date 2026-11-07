"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import { useProducts } from "../context/ProductsContext";

function Panels({ images }) {
  const group = useRef();
  const textures = useTexture(images);
  const n = textures.length;

  // Tilt the whole group gently toward the pointer
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 3);
    group.current.rotation.y += (state.pointer.x * 0.25 - group.current.rotation.y) * k;
    group.current.rotation.x += (-state.pointer.y * 0.1 - group.current.rotation.x) * k;
  });

  return (
    <group ref={group}>
      {textures.map((tex, i) => {
        const mid = i - (n - 1) / 2;
        return (
          <Float key={i} speed={1.2 + i * 0.2} rotationIntensity={0.15} floatIntensity={0.6}>
            <mesh
              position={[mid * 1.7, i % 2 === 0 ? 0.25 : -0.25, -Math.abs(mid) * 0.5]}
              rotation={[0, -mid * 0.14, 0]}
            >
              <planeGeometry args={[1.5, 1.9]} />
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

export default function Hero3D() {
      const products = useProducts();
  const [ok, setOk] = useState(false);

  // Only run the 3D if the device supports it and the user hasn't asked for reduced motion
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setOk(!!gl && !reduce);
    } catch (e) {
      setOk(false);
    }
  }, []);

  if (!ok) return null;

  const images = products.slice(0, 5).map((p) => p.image);

  return (
    <div className="h-[340px] w-full md:h-[480px]">
      <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <Panels images={images} />
        </Suspense>
      </Canvas>
    </div>
  );
}