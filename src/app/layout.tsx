import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "APS Token Generator",
  description:
    "generating 2-legged and 3-legged tokens for Autodesk API access",
  viewport:
    "width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1",
  openGraph: {
    title: "APS Token Generator",
    description:
      "generating 2-legged and 3-legged tokens for Autodesk API access",
    url: "http://localhost:3000",
    type: "website",
    images: [
      {
        url: "/assets/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "APS Token Generator",
      },
    ],
  },
  icons: {
    icon: "/assets/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-spoqaHanSansNeo">{children}</body>
    </html>
  );
}
