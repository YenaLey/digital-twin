import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "StepLED",
  description: "디지털트윈",
  viewport:
    "width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1",
  openGraph: {
    title: "StepLED",
    description: "디지털트윈",
    url: "http://localhost:3000",
    type: "website",
    // images: [
    //   {
    //     url: "/assets/thumbnail.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "StepLED",
    //   },
    // ],
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
