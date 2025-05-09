import localFont from "next/font/local";

export const spoqaHanSansNeo = localFont({
  src: [
    {
      path: "./SpoqaHanSansNeo-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "./SpoqaHanSansNeo-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./SpoqaHanSansNeo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./SpoqaHanSansNeo-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./SpoqaHanSansNeo-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-spoqaHanSansNeo",
});
