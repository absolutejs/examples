# Container image for the @absolutejs/auth showcase (used as the public
# reference instance for OpenID Conformance certification testing). The
# conformance suite needs a reachable HTTPS endpoint exposing
# /.well-known/openid-configuration + /oauth2/* + /api/* — exactly what
# this app already serves locally.
#
# Build:  docker build -t absolutejs-auth-conformance .
# Deploy: any container host (DigitalOcean App Platform, Fly, Render, …)
#         with HTTPS termination + the env vars in `conformance.env.example`.
FROM oven/bun:1.3 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3
WORKDIR /app
COPY --from=builder /app /app

# DigitalOcean / Fly / Render all set PORT; default to 3000 for local docker run.
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "start"]
