import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "./"),
  turbopack: {
    root: path.join(__dirname, "./"),
  },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
