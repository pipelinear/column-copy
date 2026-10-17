"""Build a deterministic, installable ZIP containing only extension files."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text())
files = ['manifest.json', 'background.js', 'extract.js', 'scan.js', 'cleanup.js', 'content.js']
files += sorted(set(manifest['icons'].values()))
target = ROOT / 'dist' / 'column-copy.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
    for name in files:
        info = ZipInfo('column-copy/' + name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (ROOT / name).read_bytes())
print(f'{target.name}: v{manifest["version"]}, {len(files)} files, {target.stat().st_size:,} bytes')
