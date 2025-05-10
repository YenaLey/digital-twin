import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "APS Token Generator",
  description:
    "generating 2-legged and 3-legged tokens for Autodesk API access",
  openGraph: {
    title: "APS Token Generator",
    description:
      "generating 2-legged and 3-legged tokens for Autodesk API access",
    url: "https://aps-token-generator.netlify.app",
    type: "website",
    images: [
      {
        url: "https://aps-token-generator.netlify.app/assets/thumbnail.png",
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
