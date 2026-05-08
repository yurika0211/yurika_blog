# OG Tag Server

This directory is the single source of truth for the frontend OG tag server.
It runs alongside nginx inside the frontend container and injects Open Graph
and Twitter Card meta tags into the SPA `index.html` for crawler requests.

## What it does

1. Listens on `OG_SERVER_PORT` inside the frontend container.
2. Handles crawler requests for `/post/:id`.
3. Fetches article metadata from the blog backend.
4. Injects post-specific OG and Twitter meta tags into `index.html`.
5. Falls back to site-level default meta tags when article data is unavailable.

## Runtime flow

`nginx` serves normal browser traffic directly. For supported crawler
User-Agents on `/post/:id`, [`frontend/nginx.conf`](../nginx.conf) proxies
the request to this OG server instead.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BLOG_API_BASE` | `http://backend:3001` | Blog API base URL |
| `HTML_ROOT` | `/usr/share/nginx/html` | Path to built SPA files |
| `SITE_URL` | `https://yurika0408.icu` | Canonical site URL |
| `SITE_NAME` | `ユリカのブログ` | Site name used in meta tags |
| `SITE_DESCRIPTION` | blog default description | Fallback description |
| `SITE_DEFAULT_IMAGE` | `${SITE_URL}/avatar.jpg` | Fallback preview image |
| `OG_SERVER_PORT` | `1145` | Internal listen port |
| `OG_CACHE_TTL_SECONDS` | `300` | Metadata cache TTL |

## Notes

- The frontend Docker image copies files from this directory.
- Do not maintain a second `og-server/` copy at the repo root.
