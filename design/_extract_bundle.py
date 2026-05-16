"""Decode the Anthropic Design bundler manifest into plain-text source files."""
import base64, gzip, json, os, re, sys

src = sys.argv[1] if len(sys.argv) > 1 else r'design/last Sakura Prompt Studio _Demo standalone_.html'
out = sys.argv[2] if len(sys.argv) > 2 else r'design/_extracted'
os.makedirs(out, exist_ok=True)

with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', html, re.DOTALL)
t = re.search(r'<script type="__bundler/template">(.*?)</script>', html, re.DOTALL)
manifest = json.loads(m.group(1))
template = json.loads(t.group(1))

with open(os.path.join(out, '_template.html'), 'w', encoding='utf-8') as f:
    f.write(template)

# Try to extract filenames from template by mapping uuid -> nearby tag context
for uuid, entry in manifest.items():
    raw = base64.b64decode(entry['data'])
    if entry.get('compressed'):
        try:
            raw = gzip.decompress(raw)
        except Exception:
            pass
    # Determine ext by sniffing
    head = raw[:200].decode('utf-8', errors='replace')
    if 'React' in head or 'function ' in head or 'const ' in head or '=>' in head or 'jsx' in head.lower():
        ext = 'js'
    elif raw[:4] == b'wOF2' or raw[:4] == b'OTTO':
        ext = 'woff2'
    elif raw[:8].startswith(b'\x89PNG'):
        ext = 'png'
    else:
        ext = 'bin'
    path = os.path.join(out, f'{uuid}.{ext}')
    with open(path, 'wb') as f:
        f.write(raw)

print(f'Extracted {len(manifest)} assets to {out}')
