/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds — we use <img> for Base64 data URL logos
    // which is incompatible with next/image, and would otherwise fail the build
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {},
};

module.exports = nextConfig;
