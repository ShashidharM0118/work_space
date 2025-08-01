/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Only proxy to localhost in development
    if (process.env.NODE_ENV === 'development') {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'http://localhost:8000';
      return [
        {
          source: '/ws/:path*',
          destination: `${backendUrl}/ws/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
  // Compress images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};

module.exports = nextConfig; 