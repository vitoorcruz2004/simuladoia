/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'enem.dev' },
      { protocol: 'https', hostname: '*.enem.dev' },
      { protocol: 'https', hostname: 'enem-api-assets.s3.amazonaws.com' },
    ],
  },
}
module.exports = nextConfig
