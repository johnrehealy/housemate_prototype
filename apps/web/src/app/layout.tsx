import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

// Lato ships 300 / 400 / 700 / 900 only (docs/design.md §1).
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: { template: "%s · Housemate", default: "Housemate" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="h-full bg-canvas font-sans text-body">{children}</body>
    </html>
  );
}
