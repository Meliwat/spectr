# Hosted Spectr MCP server — exposes `spectr-mcp --http` on $PORT.
# Build from the repo root: `docker build -f mcp_server/Dockerfile .`
# Railway picks this up automatically when you set the service's
# Dockerfile path to `mcp_server/Dockerfile`.

FROM python:3.11-slim

# ffmpeg is needed for the MP4 input path (frame extraction). The App Store
# URL path doesn't need it, but a hosted server should support both.
# git is needed because pip resolves dependencies that may include git refs
# at install time on some setups.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the minimal set of files needed to build the spectr-mcp wheel. We
# deliberately don't `COPY .` to keep the build context small and avoid
# rebuilding when frontend/promo/supabase files change.
COPY pyproject.toml ./
COPY spectr_mcp/ ./spectr_mcp/
COPY worker/ ./worker/

# Install the spectr-mcp package + its transitive deps (mcp SDK, anthropic,
# Pillow, imagehash, requests, python-dotenv, fastapi/uvicorn for the SDK's
# streamable-http transport).
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Railway / Fly / Heroku set $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000
EXPOSE 8000

# Use exec form with shell interpolation so $PORT gets substituted at runtime.
CMD ["sh", "-c", "spectr-mcp --http --port ${PORT:-8000}"]
