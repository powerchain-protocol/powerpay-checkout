import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/checkout",
    name: "PowerPay",
    short_name: "PowerPay",
    description: "Buy PWRC with SOL using Solana Pay.",
    start_url: "/checkout",
    scope: "/",
    display: "standalone",
    background_color: "#F7F9F7",
    theme_color: "#143C2E",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
