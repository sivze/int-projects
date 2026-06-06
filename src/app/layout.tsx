import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Transform",
  description: "Upload, remove image backgrounds, flip, host, and manage results"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
