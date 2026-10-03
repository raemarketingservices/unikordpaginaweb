"""Export the current homepage as a single static HTML file."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen
import base64
import mimetypes

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:60"
css = max((ROOT / ".output/public/assets").glob("styles-*.css"), key=lambda p: p.stat().st_mtime).read_text(encoding="utf-8")


def asset(value):
    if not value.startswith("/") or value.startswith("//"):
        return value
    relative = value.split("?", 1)[0].lstrip("/")
    path = ROOT / relative if relative.startswith("src/") else ROOT / "public" / relative
    if path.is_file():
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")
    return ORIGIN + value


class Exporter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []
        self.in_script = False

    def handle_decl(self, decl):
        self.output.append("<!" + decl + ">")

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.in_script = True
            return
        attrs = dict(attrs)
        if tag == "link" and (attrs.get("rel") in ("modulepreload", "preload") or (attrs.get("rel") == "stylesheet" and attrs.get("href", "").startswith("/"))):
            return
        attrs = {k: v for k, v in attrs.items() if not k.startswith("data-ts")}
        for name in ("src", "href"):
            value = attrs.get(name)
            if value and value.startswith("/"):
                attrs[name] = ORIGIN + value if tag == "a" else asset(value)
        serialized = "".join(" " + k + ("" if v is None else '="' + escape(v, quote=True) + '"') for k, v in attrs.items())
        self.output.append("<" + tag + serialized + ">")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False
            return
        if tag == "head":
            self.output.append("<style>" + css + "</style>")
        self.output.append("</" + tag + ">")

    def handle_data(self, data):
        if not self.in_script:
            self.output.append(data)

    def handle_entityref(self, name):
        if not self.in_script:
            self.output.append("&" + name + ";")

    def handle_charref(self, name):
        if not self.in_script:
            self.output.append("&#" + name + ";")


with urlopen(ORIGIN, timeout=20) as response:
    page = response.read().decode("utf-8")
parser = Exporter()
parser.feed(page)
destination = ROOT / "exports" / "index.html"
destination.parent.mkdir(exist_ok=True)
result = "".join(parser.output)
assert "<script" not in result
assert "<style>" in result and "data:image/" in result
destination.write_text(result, encoding="utf-8")
print(str(destination))
print(f"Static HTML: {destination.stat().st_size:,} bytes")
