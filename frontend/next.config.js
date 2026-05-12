/** @type {import('next').NextConfig} */
const nextConfig = {
  // No top-level redirects. /mcp → / is handled by app/mcp/page.tsx
  // (a server component that calls permanentRedirect('/')).
}

module.exports = nextConfig
