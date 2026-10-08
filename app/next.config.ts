import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The container image ships `.next/standalone` (see Dockerfile). Everywhere else
  // `next start` is used, which does not work with standalone output.
  output: process.env.GENMENTOR_STANDALONE ? "standalone" : undefined,
  // Both loopback URLs are used by the desktop preview and browser checks.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
