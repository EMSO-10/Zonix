import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ProductsProvider } from "./context/ProductsContext";
import { CartProvider } from "./context/CartContext";
import CartDrawer from "./components/Cart.Drawer";
import Preloader from "./components/Pre Loader";
import Toast from "./components/Toast";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500"],
});
const manrope = Manrope({ subsets: ["latin"] });


export const metadata = {
  title: "Zonix Classic",
  description: "Neat fits for campus. Order online, pay by bank transfer.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${manrope.className} ${playfair.variable}`}>
        <ProductsProvider>
          <CartProvider>
            <Preloader />
            {children}
            <CartDrawer />
            <Toast />
          </CartProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}