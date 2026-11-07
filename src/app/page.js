import Header from "./components/Header";
import Hero from "./components/Hero";
import Shop from "./components/Shop";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <main id="shop" className="mx-auto max-w-5xl scroll-mt-16 px-4 pt-6">
        <Shop />
      </main>
    </>
  );
}