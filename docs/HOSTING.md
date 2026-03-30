# Hosting TaxLens on OCI

## Goal

Host TaxLens on Oracle Cloud Infrastructure so it's accessible from any device at any time, rather than only running locally via `tax-ui start`.

## Current State

- Runs locally only: `cd ~/Projects/tax-ui && bun --hot src/index.ts --port 3005`
- Single Bun process (server + React frontend)
- Tax data stored in `.tax-returns.json` (flat file, sensitive)
- Requires `ANTHROPIC_API_KEY` for Claude chat + PDF parsing

## Deployment Plan

### 1. Containerize

Simple Dockerfile (~15 lines):
- Base image: `oven/bun`
- Copy source, install deps, run `bun src/index.ts`
- Expose port 3005

One decision: `.tax-returns.json` must live on a **persistent OCI block volume**, not baked into the image.

### 2. Auth Layer (choose one)

#### Option A: Tailscale (recommended)
- Install Tailscale on OCI VM + your devices (laptop, phone)
- App runs on `100.x.x.x:3005`, never exposed to public internet
- No auth code needed, zero attack surface
- **Trade-off**: requires Tailscale app installed on every device you access from
- Effort: ~30 min

#### Option B: Caddy basic auth
- Caddy reverse proxy in front of the app with a username/password
- Works from any browser, anywhere — no app install needed
- App is on the public internet (behind a password)
- **Trade-off**: tax data is sensitive; basic auth is a thin layer
- Effort: ~1 hour

Given the sensitivity of tax data, **Tailscale is preferred**.

### 3. OCI Setup

- Same VM already running Wallos
- Add a new Docker container for TaxLens
- If using Caddy: add a new vhost in the existing Caddy config
- Env vars: `ANTHROPIC_API_KEY` via Docker env or OCI Vault

## Deferred

Not started — revisit when needed.
