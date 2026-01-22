import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['picsum.photos', 'raw.githubusercontent.com', 'library.kissclipart.com'],
  },
};

export default nextConfig;
