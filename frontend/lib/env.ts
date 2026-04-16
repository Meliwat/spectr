/**
 * Reads an environment variable, strips trailing newlines (Vercel's dashboard
 * appends them), and trims whitespace.
 *
 * Uses a variable key so Next.js/SWC cannot replace the call at build time —
 * encrypted Vercel env vars are otherwise undefined in the built bundle even
 * though they're present in process.env at runtime.
 */
export function getEnv(key: string): string {
  return (process.env[key] ?? '').split('\n').join('').trim()
}
