import { permanentRedirect } from 'next/navigation'

// The MCP install page moved to the root. Preserve old /mcp URLs (shared
// during the testing window, picked up by crawlers) with a 308 redirect.
export default function MCPRedirect(): never {
  permanentRedirect('/')
}
