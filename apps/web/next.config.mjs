/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Explicitly enable standalone output for smaller Docker images
  output: 'standalone',

  // This tells Next.js to compile your monorepo packages
  transpilePackages: [
    '@zouari-app/api',
    '@zouari-app/auth',
    '@zouari-app/ui',
    '@zouari-app/validation',
  ],

  experimental: {
    ppr: true, // Partial Pre-rendering
  },

  // This now proxies BOTH auth and tRPC for better security
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: '/api/trpc/:path*',
        destination: `${apiUrl}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
