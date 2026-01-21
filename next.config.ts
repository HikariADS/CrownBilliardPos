import type { NextConfig } from "next";
import createPwa from "next-pwa";

const withPWA = createPwa({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
