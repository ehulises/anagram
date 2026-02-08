import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Michelle :3",
  description: "A cute anagram game with a heartfelt reveal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
