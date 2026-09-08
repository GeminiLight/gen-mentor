import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted deploys ship `.next/standalone`. Vercel does its own tracing and
  // its builder breaks on standalone output, so skip it there.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
