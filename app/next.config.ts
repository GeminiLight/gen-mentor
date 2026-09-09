import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The container image ships `.next/standalone` (see Dockerfile). Everywhere else
  // `next start` is used, which does not work with standalone output.
  output: process.env.GENMENTOR_STANDALONE ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
