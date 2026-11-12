import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quorate: nobody fronts the money",
  description: "Each family's PayPal holds their child's share of a class trip. Nobody is charged until enough children are going.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
