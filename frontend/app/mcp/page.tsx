import { permanentRedirect } from 'next/navigation'

// The MCP install page now lives at the site root (/). Preserve old /mcp URLs
// (shared during the testing window, picked up by crawlers) with a 308.
export default function MCPRedirect(): never {
  permanentRedirect('/')
}
