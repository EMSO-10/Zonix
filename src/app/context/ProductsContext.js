
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { products as localProducts } from "../data/products";

const ProductsContext = createContext({ products: localProducts, syncError: "" });
export const useProducts = () => useContext(ProductsContext).products;
export const useProductsSyncError = () => useContext(ProductsContext).syncError;

function shape(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    image: p.image,
    sizes: p.sizes && p.sizes.length ? p.sizes : undefined,
    colours: p.colours && p.colours.length ? p.colours : undefined,
    badge: p.badge || undefined,
    soldOut: p.sold_out,
  };
}

function getSyncErrorMessage(error) {
  if (error?.message?.toLowerCase().includes("invalid api key")) {
    return "Supabase rejected the API key. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local are from the same Supabase project, then restart the dev server.";
  }
  return "Products could not be synced from the database. Showing saved local products.";
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(localProducts);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.from("products").select("*").order("id");
        if (cancelled) return;
        if (error) {
          console.error("Failed to load products from Supabase:", error.message);
          setSyncError(getSyncErrorMessage(error));
          return;
        }
        if (!data || data.length === 0) {
          setSyncError("No products were returned from the database. Showing saved local products.");
          return;
        }
        setProducts(data.map(shape));
        setSyncError("");
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load products from Supabase:", error);
        setSyncError(getSyncErrorMessage(error));
      }
    }

    load();
    // Reload when you come back to the tab, so database edits show up without a manual refresh
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <ProductsContext.Provider value={{ products, syncError }}>
      {children}
    </ProductsContext.Provider>
  );
}