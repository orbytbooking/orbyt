/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gpalzskadkrfedlwqobq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gpalzskadkrfedlwqobq.supabase.co',
        port: '',
        pathname: '/storage/v1/render/image/**',
      },
      // Add localhost for development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/images/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/images/**',
      },
    ],
    // For backward compatibility and local development
    domains: [
      'gpalzskadkrfedlwqobq.supabase.co',
    ],
  },
}

export default nextConfig
