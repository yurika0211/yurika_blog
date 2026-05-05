#!/usr/bin/env python3
"""Generate sitemap.xml, rss.xml, and feed.xml for the blog.

Uses the blog API to fetch all posts and generates SEO-friendly static files.
Should be run periodically (e.g., via cron) to keep feeds up to date.

Output: nginx/static/sitemap.xml, nginx/static/rss.xml, nginx/static/feed.xml
"""

import json
import os
import subprocess
import sys
from datetime import datetime

TOKEN_FILE = "/tmp/blog-token.json"
BLOG_API_SCRIPT = "/root/.nanobot/workspace/skills/rightclaw-blog-api/scripts/blog_api.py"
BASE_URL = "https://yurika0408.icu"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nginx", "static")


def fetch_posts():
    """Fetch all posts from the blog API."""
    r = subprocess.run(
        [sys.executable, BLOG_API_SCRIPT, "posts", "list", "--token-file", TOKEN_FILE],
        capture_output=True, text=True, timeout=60
    )
    if r.returncode != 0:
        print(f"Error fetching posts: {r.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(r.stdout)


def generate_sitemap(posts):
    """Generate sitemap.xml."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    
    # Homepage
    lines.extend(['  <url>',
                  f'    <loc>{BASE_URL}/</loc>',
                  '    <changefreq>daily</changefreq>',
                  '    <priority>1.0</priority>',
                  '  </url>'])
    
    for p in sorted(posts, key=lambda x: x['id']):
        pid = p['id']
        updated = p.get('updatedAt', p.get('createdAt', ''))
        try:
            dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            lastmod = dt.strftime('%Y-%m-%d')
        except:
            lastmod = datetime.now().strftime('%Y-%m-%d')
        
        lines.extend(['  <url>',
                      f'    <loc>{BASE_URL}/post/{pid}</loc>',
                      f'    <lastmod>{lastmod}</lastmod>',
                      '    <changefreq>monthly</changefreq>',
                      '    <priority>0.8</priority>',
                      '  </url>'])
    
    lines.append('</urlset>')
    return '\n'.join(lines) + '\n'


def generate_rss(posts, max_items=50):
    """Generate RSS 2.0 feed."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
             '  <channel>',
             f'    <title>Yurika 的博客</title>',
             f'    <link>{BASE_URL}</link>',
             f'    <description>技术、ACG 与生活随笔</description>',
             f'    <language>zh-CN</language>',
             f'    <atom:link href="{BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />',
             f'    <lastBuildDate>{datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>']
    
    for p in reversed(sorted(posts, key=lambda x: x['id'])[-max_items:]):
        pid = p['id']
        title = p.get('title', '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        summary = (p.get('summary', '') or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        updated = p.get('updatedAt', p.get('createdAt', ''))
        try:
            dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            pubdate = dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
        except:
            pubdate = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
        
        lines.extend(['    <item>',
                      f'      <title>{title}</title>',
                      f'      <link>{BASE_URL}/post/{pid}</link>',
                      f'      <guid>{BASE_URL}/post/{pid}</guid>',
                      f'      <description>{summary}</description>',
                      f'      <pubDate>{pubdate}</pubDate>',
                      '    </item>'])
    
    lines.extend(['  </channel>', '</rss>'])
    return '\n'.join(lines) + '\n'


def generate_atom(posts, max_items=50):
    """Generate Atom feed."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<feed xmlns="http://www.w3.org/2005/Atom">',
             f'  <title>Yurika 的博客</title>',
             f'  <link href="{BASE_URL}" />',
             f'  <link href="{BASE_URL}/feed.xml" rel="self" />',
             f'  <id>{BASE_URL}/</id>',
             f'  <updated>{datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")}</updated>']
    
    for p in reversed(sorted(posts, key=lambda x: x['id'])[-max_items:]):
        pid = p['id']
        title = p.get('title', '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        summary = (p.get('summary', '') or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        updated = p.get('updatedAt', p.get('createdAt', ''))
        try:
            dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            iso_date = dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")
        except:
            iso_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")
        
        lines.extend(['  <entry>',
                      f'    <title>{title}</title>',
                      f'    <link href="{BASE_URL}/post/{pid}" />',
                      f'    <id>{BASE_URL}/post/{pid}</id>',
                      f'    <updated>{iso_date}</updated>',
                      f'    <summary>{summary}</summary>',
                      '  </entry>'])
    
    lines.append('</feed>')
    return '\n'.join(lines) + '\n'


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    posts = fetch_posts()
    print(f"Fetched {len(posts)} posts")
    
    sitemap = generate_sitemap(posts)
    rss = generate_rss(posts)
    atom = generate_atom(posts)
    
    for filename, content in [('sitemap.xml', sitemap), ('rss.xml', rss), ('feed.xml', atom)]:
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ {filename} → {path}")
    
    print(f"Done! {len(posts)} posts in sitemap, 50 in feeds")


if __name__ == '__main__':
    main()
