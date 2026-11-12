import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@paypal/paypal-server-sdk", "postgres"],
};

export default config;
