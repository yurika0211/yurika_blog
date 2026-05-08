import html
import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

HTML_ROOT = Path(os.getenv("HTML_ROOT", "/usr/share/nginx/html"))
INDEX_FILE = HTML_ROOT / "index.html"
BLOG_API_BASE = os.getenv("BLOG_API_BASE", "http://backend:3001").rstrip("/")
OG_SERVER_PORT = int(os.getenv("OG_SERVER_PORT", "1145"))
SITE_URL = os.getenv("SITE_URL", "https://yurika0408.icu").rstrip("/")
SITE_NAME = os.getenv("SITE_NAME", "ユリカのブログ")
DEFAULT_DESCRIPTION = os.getenv(
    "SITE_DESCRIPTION",
    "ユリカのブログ — 技术笔记 · Galgame 评论 · 随笔",
)
DEFAULT_IMAGE = os.getenv("SITE_DEFAULT_IMAGE", f"{SITE_URL}/avatar.jpg")
CACHE_TTL_SECONDS = int(os.getenv("OG_CACHE_TTL_SECONDS", "300"))

POST_PATH_RE = re.compile(r"^/post/(\d+)$")
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*]\(([^)\s]+)(?:\s+['\"][^'\"]*['\"])?\)")
HTML_IMAGE_RE = re.compile(r"<img[^>]*src=['\"]([^'\"]+)['\"][^>]*>", re.IGNORECASE)

_CACHE: dict[str, tuple[float, str]] = {}


def read_index_html() -> str:
    return INDEX_FILE.read_text(encoding="utf-8")


def fetch_json(url: str) -> dict | None:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "blog-og-server/1.0",
        },
    )
    try:
        with urlopen(request, timeout=5) as response:
            payload = response.read().decode("utf-8")
            data = json.loads(payload)
            if isinstance(data, dict):
                return data
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None
    return None


def strip_markdown(text: str) -> str:
    cleaned = re.sub(r"`([^`]+)`", r"\1", text)
    cleaned = re.sub(r"\[([^\]]+)]\(([^)]+)\)", r"\1", cleaned)
    cleaned = re.sub(r"[*_~>#-]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def extract_first_image(markdown: str) -> str | None:
    markdown_match = MARKDOWN_IMAGE_RE.search(markdown)
    if markdown_match:
        return markdown_match.group(1).strip()

    html_match = HTML_IMAGE_RE.search(markdown)
    if html_match:
        return html_match.group(1).strip()

    return None


def absolutize_url(value: str | None, fallback_path: str = "") -> str:
    if value:
        value = value.strip()
    if not value:
        value = fallback_path
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc:
        return value
    if value.startswith("/"):
        return f"{SITE_URL}{value}"
    return f"{SITE_URL}/{value.lstrip('/')}"


def build_meta_tags(meta: dict[str, str]) -> str:
    lines = [
        f"<title>{html.escape(meta['title'])}</title>",
        f'<meta name="description" content="{html.escape(meta["description"])}" />',
        f'<link rel="canonical" href="{html.escape(meta["url"])}" />',
        f'<meta property="og:title" content="{html.escape(meta["title"])}" />',
        f'<meta property="og:description" content="{html.escape(meta["description"])}" />',
        f'<meta property="og:url" content="{html.escape(meta["url"])}" />',
        f'<meta property="og:image" content="{html.escape(meta["image"])}" />',
        f'<meta property="og:type" content="{html.escape(meta["type"])}" />',
        f'<meta property="og:site_name" content="{html.escape(meta["site_name"])}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{html.escape(meta["title"])}" />',
        f'<meta name="twitter:description" content="{html.escape(meta["description"])}" />',
        f'<meta name="twitter:image" content="{html.escape(meta["image"])}" />',
    ]
    return "\n    ".join(lines)


def inject_meta_tags(index_html: str, meta: dict[str, str]) -> str:
    tags = build_meta_tags(meta)
    return re.sub(
        r"<head>", f"<head>\n    {tags}", index_html, count=1, flags=re.IGNORECASE
    )


def default_meta(path: str) -> dict[str, str]:
    return {
        "title": SITE_NAME,
        "description": DEFAULT_DESCRIPTION,
        "url": absolutize_url(path),
        "image": absolutize_url(DEFAULT_IMAGE),
        "type": "website",
        "site_name": SITE_NAME,
    }


def post_meta(post_id: str, path: str) -> dict[str, str]:
    meta = default_meta(path)
    api_url = f"{BLOG_API_BASE}/posts/{quote(post_id)}"
    payload = fetch_json(api_url)
    if not payload:
        return meta

    title = payload.get("title") or SITE_NAME
    summary = payload.get("summary") or DEFAULT_DESCRIPTION
    content = payload.get("content") or ""
    image = extract_first_image(content) or DEFAULT_IMAGE

    meta.update(
        {
            "title": str(title).strip() or SITE_NAME,
            "description": strip_markdown(str(summary))[:220] or DEFAULT_DESCRIPTION,
            "url": absolutize_url(path),
            "image": absolutize_url(str(image), "/avatar.jpg"),
            "type": "article",
        }
    )
    return meta


def render_page(path: str) -> str:
    now = time.time()
    cached = _CACHE.get(path)
    if cached and cached[0] > now:
        return cached[1]

    index_html = read_index_html()
    match = POST_PATH_RE.match(path)
    meta = post_meta(match.group(1), path) if match else default_meta(path)
    rendered = inject_meta_tags(index_html, meta)
    _CACHE[path] = (now + CACHE_TTL_SECONDS, rendered)
    return rendered


class OGRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        try:
            body = render_page(parsed.path)
            encoded = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "public, max-age=60")
            self.end_headers()
            self.wfile.write(encoded)
        except FileNotFoundError:
            self.send_error(500, "index.html not found")

    def log_message(self, _format: str, *_args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", OG_SERVER_PORT), OGRequestHandler)
    server.serve_forever()
