# Hosted Spectr MCP server

This directory holds the deployment config for the **hosted** Spectr MCP server — the one Claude / Cursor / Codex users add via the "Settings → Connectors → Add a custom connector" flow with a URL like `https://mcp.spectr.to`.

The MCP code itself lives at `../spectr_mcp/`. This directory is just the Railway / Docker glue.

## What it does

Runs `spectr-mcp --http` over HTTP (MCP streamable-http transport) instead of stdio. Same `generate_spec` tool. Same pipeline. Same output.

Difference from the stdio install: users don't bring their own `ANTHROPIC_API_KEY` because they aren't running the server — Spectr is. The server's env var holds the key, and Spectr pays Anthropic for every spec the connector generates.

**Cost expectation:** ~$0.60-1.20 per spec at default `max_frames=20`. Plan accordingly before opening the connector to the public.

## Deploy to Railway

1. **Create the service** in the existing Spectr Railway project.
   - Click "New" → "GitHub Repo" → `Meliwat/spectr`
   - Name: `spectr-mcp`
   - Branch: `master`
   - **Root directory:** leave at repo root (we use the repo root as the Docker build context).
   - **Dockerfile path:** `mcp_server/Dockerfile`

2. **Set environment variables** on the service:
   - `ANTHROPIC_API_KEY` — required. The server's own key, used for vision + spec generation.
   - `VISION_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`.
   - `STITCH_MODEL` — optional, defaults to `claude-sonnet-4-6`.
   - `MAX_FRAMES` — optional, defaults to 20.
   - `SPECTR_MCP_LOG_LEVEL` — optional, defaults to `INFO`. Set to `DEBUG` for verbose logs.

3. **Generate a public domain** in Railway settings → Networking → Generate Domain. Railway will assign something like `spectr-mcp-production.up.railway.app`. Confirm the deploy by visiting the URL — you should see an MCP protocol response (or a JSON error if you hit it as a browser, since browsers can't speak MCP).

4. **Point `mcp.spectr.to` at the Railway domain.** In your DNS provider (Namecheap for Spectr):
   - Add a CNAME record: `mcp` → `spectr-mcp-production.up.railway.app` (or whatever Railway gave you).
   - In Railway → Networking → Custom Domain, add `mcp.spectr.to`. Railway will provision the certificate via Let's Encrypt automatically.

5. **Confirm end-to-end.** After DNS propagates (~5–15 min), the homepage's install flow at https://www.spectr.to should work:
   - Open Claude → Settings → Connectors → Add a custom connector
   - Paste `https://mcp.spectr.to`
   - Click Add → Connect, sign in
   - Ask Claude to "Generate a spec from https://apps.apple.com/us/app/duolingo/id570060128"
   - Spec lands in 5 minutes.

## Local docker test

Before deploying, verify the image builds and starts cleanly:

```bash
cd /Users/meliwat/spectr   # repo root
docker build -f mcp_server/Dockerfile -t spectr-mcp .
docker run --rm -p 8000:8000 -e ANTHROPIC_API_KEY=sk-... spectr-mcp
# In another terminal:
curl -i http://localhost:8000/mcp
```

You should get an MCP protocol response (HTTP 200 with `Content-Type: text/event-stream` once you initialize via JSON-RPC; or a 4xx if you hit it bare since clients need to start with `initialize`).

## What this directory does NOT contain

- The MCP package source — that's in `../spectr_mcp/`.
- The worker code — that's in `../worker/`. Imported as a Python package via the root `pyproject.toml`.
- Auth, rate limiting, OAuth — v0 ships open to anyone with the URL. Add limits before the connector hits real traffic.

## Abuse + cost notes

v0 of the hosted MCP **has no auth and no rate limiting**. Anyone who knows the URL can generate specs against Spectr's Anthropic key. Mitigations to add before public launch:

- **IP-based rate limit.** Simple token bucket per client IP, e.g. 5 specs per IP per day. Easy to add at the FastMCP middleware layer.
- **Cloudflare in front.** Bot detection, geo-block, basic abuse signals.
- **Anthropic budget cap.** Set a hard monthly spend cap on the Anthropic console for the key used by this service — if Spectr gets DDoS-spec'd, the key dies before the credit card.
- **Eventual auth.** Email-gated, magic-link, or paid signup at spectr.to. The hosted MCP becomes a paid product surface (current $19/spec, or a $9/mo subscription, etc.).

Track in [TODOS.md](../TODOS.md) when scoping v1.
