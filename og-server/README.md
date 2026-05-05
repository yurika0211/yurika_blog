# OG Tag Server

Lightweight Python HTTP server that injects Open Graph meta tags into the
SPA's `index.html` for social media link previews (Telegram, Discord, Twitter, etc.).

## How it works

1. Listens on port 8080 inside the frontend Docker container
2. For `/post/:id` requests, fetches post metadata from the blog API
3. Injects `og:title`, `og:description`, `og:image`, `og:url`, `og:type`,
   `article:published_time`, `article:tag`, and Twitter Card meta tags
4. For other routes, injects site-level default OG tags
5. Nginx routes crawler requests to this service

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BLOG_API_BASE` | `http://backend:3001` | Blog API base URL |
| `HTML_ROOT` | `/usr/share/nginx/html` | Path to SPA static files |
| `OG_IMAGE` | GitHub raw URL | Default OG image URL |
| `OG_SITE_NAME` | `ユリカのブログ` | Site name for OG tags |
| `OG_SITE_URL` | `https://yurika0408.icu` | Site canonical URL |
| `OG_SERVER_PORT` | `8080` | Port to listen on |

## Nginx Integration

The frontend nginx config detects social media crawlers by User-Agent
and proxies `/post/:id` requests to this service instead of serving
the static `index.html`. Non-crawler requests continue to be served
by nginx directly for maximum performance.