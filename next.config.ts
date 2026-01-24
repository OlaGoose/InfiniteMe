import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['picsum.photos', 'raw.githubusercontent.com', 'library.kissclipart.com'],
  },
  webpack: (config, { isServer }) => {
    // Fix for Leaflet dynamic import issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Optimize chunk splitting for Leaflet
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          leaflet: {
            test: /[\\/]node_modules[\\/]leaflet[\\/]/,
            name: 'leaflet',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };
    
    return config;
  },
};

export default nextConfig;
