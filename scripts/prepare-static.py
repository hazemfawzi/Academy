"""Build static upload with content hashes to refresh cached local assets."""
import hashlib
import re
import shutil
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
out = Path('/tmp/academy-site')
out.mkdir(parents=True, exist_ok=True)
for source in root.iterdir():
    if source.is_file() and source.suffix in {'.html', '.css', '.js'}:
        if source.suffix == '.html':
            def version(match):
                prefix, url, quote = match.groups()
                parsed = urlsplit(url)
                if parsed.scheme or parsed.netloc:
                    return match.group(0)
                asset = root / parsed.path
                if asset.is_file() and asset.suffix in {'.js', '.css', '.svg'}:
                    digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
                    return prefix + parsed.path + '?v=' + digest + quote
                return match.group(0)
            html = re.sub(r'((?:src|href)=["\'])([^"\']+)(["\'])', version, source.read_text())
            (out / source.name).write_text(html)
        else:
            shutil.copy2(source, out / source.name)
shutil.copytree(root / 'assets', out / 'assets', dirs_exist_ok=True)
