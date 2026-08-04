import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  },
};

export default nextConfig;

