import os
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
import xml.etree.ElementTree as ET

root = Path(os.environ.get("SITE_DIR", "."))
base = os.environ["SITE_URL"].rstrip("/") + "/"
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.og_urls = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        if tag == "meta" and attrs.get("property") == "og:url":
            self.og_urls.append(attrs.get("content"))

html = (root / "index.html").read_text()
page = Page(); page.feed(html)
assert page.canonicals == [base], page.canonicals
assert not page.og_urls or page.og_urls == [base], page.og_urls
for filename in ["index.html", "sitemap.xml", "robots.txt", "llms.txt", "404.html", "release.json"]:
    path = root / filename
    if path.exists():
        assert "tianfuwang.tech" not in path.read_text(), f"Old deployment host: {filename}"
sitemap = ET.parse(root / "sitemap.xml").getroot()
urls = [node.text for node in sitemap.findall("{*}url/{*}loc")]
assert urls and base in urls and len(urls) == len(set(urls)), urls
for node in sitemap.iter():
    if node.tag.endswith("}loc"):
        assert node.text.startswith(base), node.text
        if os.environ.get("REDIRECT_SITE") != "true":
            relative = unquote(node.text[len(base):])
            path = root / (relative + "index.html" if not relative or relative.endswith("/") else relative)
            assert path.is_file(), path
print(f"Verified canonical, Open Graph, {len(urls)} sitemap pages, assets and retired-host absence.")
