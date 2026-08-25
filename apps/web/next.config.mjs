/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: [
    '@adsrobotic/ui',
    '@adsrobotic/config',
    '@adsrobotic/core',
    '@adsrobotic/db',
    '@adsrobotic/ai',
    '@adsrobotic/image',
    '@adsrobotic/channel-core',
    '@adsrobotic/channel-meta',
    '@adsrobotic/channel-google',
    '@adsrobotic/channel-tiktok',
  ],
  // Native / server-only modules must not be bundled by webpack.
  serverExternalPackages: ['@node-rs/argon2', '@prisma/client'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep the native argon2 addon (a .node binary) out of the webpack graph;
      // it is required at runtime from node_modules instead.
      config.externals = [...(config.externals ?? []), '@node-rs/argon2'];
    }
    return config;
  },
  eslint: {
    // Linting runs via the workspace `lint` task (root flat config), not here.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
