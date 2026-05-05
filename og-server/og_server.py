#!/usr/bin/env python3
"""
OG Tag Server for Yurika's Blog SPA.

Serves the SPA's index.html with Open Graph meta tags injected.
For /post/:id routes, fetches post metadata from the blog API
and injects post-specific OG tags. For other routes, injects
site-level default OG tags.

This runs inside the frontend Docker container alongside nginx,
listening on port 8080. Nginx proxies /post/:id requests from
crawlers to this service.
"""

import os
import re
import sys
import json
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ── Configuration ──

API_BASE = os.environ.get("BLOG_API_BASE", "http://backend:3001")
HTML_ROOT = Path(os.environ.get("HTML_ROOT", "/usr/share/nginx/html"))
DEFAULT_OG_IMAGE = os.environ.get("OG_IMAGE", "https://yurika0408.icu/avatar.jpg")
SITE_NAME = os.environ.get("OG_SITE_NAME", "ユリカのブログ")
SITE_URL = os.environ.get("OG_SITE_URL", "https://yurika0408.icu")
PORT = int(os.environ.get("OG_SERVER_PORT", "8080"))

# ── Caches ──

_index_html_cache: str | None = None
_post_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL = 300  # 5 minutes


def load_index_html() -> str:
    """Load and cache the SPA's index.html."""
    global _index_html_cache
    if _index_html_cache is None:
        index_path = HTML_ROOT / "index.html"
        _index_html_cache = index_path.read_text(encoding="utf-8")
    return _index_html_cache


def fetch_post(post_id: int) -> dict | None:
    """Fetch post metadata from the blog API."""
    url = f"{API_BASE}/api/posts/{post_id}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
        print(f"[og-server] Failed to fetch post {post_id}: {e}", file=sys.stderr)
        return None


def fetch_post_cached(post_id: int) -> dict | None:
    """Fetch post metadata with in-memory cache (TTL 5 min)."""
    now = time.time()
    if post_id in _post_cache:
        ts, data = _post_cache[post_id]
        if now - ts < _CACHE_TTL:
            return data
    result = fetch_post(post_id)
    if result:
        _post_cache[post_id] = (now, result)
    return result


def extract_cover_image(content: str) -> str | None:
    """Extract the first image URL from markdown content."""
    match = re.search(r'!\[.*?\]\((.*?)\)', content)
    if match:
        url = match.group(1).strip()
        if url.startswith(("http://", "https://")):
            return url
    return None


def parse_tags(raw_tags) -> list[str]:
    """Parse tags from API response (may be JSON string or list)."""
    if isinstance(raw_tags, list):
        return raw_tags
    if isinstance(raw_tags, str):
        try:
            parsed = json.loads(raw_tags)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
        return [t.strip().strip('"[]') for t in raw_tags.split(",") if t.strip()]
    return []


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return (
        text
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_og_tags(
    title: str,
    description: str,
    url: str,
    image: str,
    post_type: str = "website",
    published_time: str | None = None,
    tags: list[str] | None = None,
) -> str:
    """Build OG + Twitter Card meta tag HTML string."""
    meta_tags = [
        f'<meta property="og:title" content="{escape_html(title)}" />',
        f'<meta property="og:description" content="{escape_html(description)}" />',
        f'<meta property="og:url" content="{escape_html(url)}" />',
        f'<meta property="og:image" content="{escape_html(image)}" />',
        f'<meta property="og:type" content="{escape_html(post_type)}" />',
        f'<meta property="og:site_name" content="{escape_html(SITE_NAME)}" />',
        f'<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{escape_html(title)}" />',
        f'<meta name="twitter:description" content="{escape_html(description)}" />',
        f'<meta name="twitter:image" content="{escape_html(image)}" />',
    ]
    if published_time:
        meta_tags.append(
            f'<meta property="article:published_time" content="{escape_html(published_time)}" />'
        )
    if tags:
        for tag in tags[:5]:
            meta_tags.append(
                f'<meta property="article:tag" content="{escape_html(tag)}" />'
            )
    return "\n    ".join(meta_tags)


def inject_og_tags(html: str, og_tags: str, title: str) -> str:
    """Inject OG meta tags into the HTML <head> and update <title>."""
    # Remove any existing OG/twitter meta tags to avoid duplicates
    html = re.sub(r'\s*<meta\s+(?:property="og:|name="twitter:)[^>]*/?>', '', html)

    # Inject new OG tags before </head>
    og_block = f"\n    {og_tags}\n"
    html = html.replace("</head>", f"{og_block}</head>")

    # Update <title>
    html = re.sub(
        r"<title>[^<]*</title>",
        f"<title>{escape_html(title)}</title>",
        html,
        count=1,
    )
    return html


class OGHandler(BaseHTTPRequestHandler):
    """HTTP handler that serves index.html with OG tags."""

    def do_GET(self):
        post_match = re.match(r"^/post/(\d+)(?:/|$)", self.path)
        if post_match:
            self._serve_post_og(int(post_match.group(1)))
        else:
            self._serve_default_og()

    def _serve_post_og(self, post_id: int):
        """Serve index.html with post-specific OG tags."""
        post = fetch_post_cached(post_id)
        if post:
            title = post.get("title", SITE_NAME)
            description = post.get("summary", f"阅读「{title}」— {SITE_NAME}")
            url = f"{SITE_URL}/post/{post_id}"
            content = post.get("content", "")
            image = extract_cover_image(content) or DEFAULT_OG_IMAGE
            published_time = post.get("date")
            tags = parse_tags(post.get("tags", []))
            og_tags = build_og_tags(
                title=title,
                description=description,
                url=url,
                image=image,
                post_type="article",
                published_time=published_time,
                tags=tags,
            )
            page_title = f"{title} | {SITE_NAME}"
        else:
            og_tags = self._default_og_tags()
            page_title = f"Post | {SITE_NAME}"

        html = load_index_html()
        html = inject_og_tags(html, og_tags, page_title)
        self._send_html(html)

    def _serve_default_og(self):
        """Serve index.html with site-level default OG tags."""
        og_tags = self._default_og_tags()
        html = load_index_html()
        html = inject_og_tags(html, og_tags, SITE_NAME)
        self._send_html(html)

    def _default_og_tags(self) -> str:
        """Build default site-level OG tags."""
        return build_og_tags(
            title=SITE_NAME,
            description="ユリカのブログ — 技术笔记 · Galgame 评论 · 随笔",
            url=SITE_URL,
            image=DEFAULT_OG_IMAGE,
        )

    def _send_html(self, html: str):
        """Send HTML response."""
        encoded = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        print(f"[og-server] {args[0]}", file=sys.stderr)


def main():
    server = HTTPServer(("0.0.0.0", PORT), OGHandler)
    print(f"[og-server] Listening on 0.0.0.0:{PORT}", file=sys.stderr)
    print(f"[og-server] API base: {API_BASE}", file=sys.stderr)
    print(f"[og-server] HTML root: {HTML_ROOT}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[og-server] Shutting down...", file=sys.stderr)
        server.server_close()


if __name__ == "__main__":
    main()