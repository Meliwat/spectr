/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/gallery',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
