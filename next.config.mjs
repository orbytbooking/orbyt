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
  },
  // Faster development
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Reduce file watching and compilation
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      turbo: {
        resolveAlias: {
          '@': './src',
        },
      },
      // Optimize builds
      optimizeCss: true,
    },
    webpack: (config, { dev }) => {
      if (dev) {
        config.watchOptions = {
          poll: false,
          aggregateTimeout: 1000, // Further increased delay
          ignored: [
            '**/node_modules/**', 
            '**/.git/**', 
            '**/.next/**',
            '**/*.log',
            '**/public/**',
            '**/.env*',
            '**/.env.example',
            '**/package-lock.json',
            '**/bun.lockb',
            '**/*.lock',
            '**/dist/**',
            '**/build/**',
            '**/.cache/**',
            '**/coverage/**',
            '**/.nyc_output/**',
            '**/*.tmp',
            '**/*.temp',
            // Add specific environment file patterns
            '**/.env',
            '**/.env.local',
            '**/.env.development',
            '**/.env.development.local',
            '**/.env.test',
            '**/.env.test.local',
            '**/.env.production',
            '**/.env.production.local',
          ],
        };
        
        // Prevent infinite recompilation
        config.resolve.cache = true;
        config.resolve.symlinks = false;
        
        // Optimize module resolution
        config.module.rules.push({
          test: /\.(tsx?|jsx?)$/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
          exclude: /node_modules/,
        });
      }
      return config;
    },
  }),
}

export default nextConfig
