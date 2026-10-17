"""Render the geometric Column Copy mark as PNGs without dependencies."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]


def render(size):
    scale = 4
    width = size * scale
    pixels = bytearray(width * width * 4)

    def rounded_rect(x0, y0, x1, y1, radius, color):
        factor = width / 128
        x0, y0, x1, y1, radius = [v * factor for v in (x0, y0, x1, y1, radius)]
        for y in range(max(0, int(y0)), min(width, int(y1 + 1))):
            for x in range(max(0, int(x0)), min(width, int(x1 + 1))):
                px, py = x + .5, y + .5
                cx = min(max(px, x0 + radius), x1 - radius)
                cy = min(max(py, y0 + radius), y1 - radius)
                if (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2:
                    index = (y * width + x) * 4
                    pixels[index:index + 4] = bytes((*color, 255))

    paper, ink, blue = (250, 250, 249), (37, 37, 37), (99, 128, 255)
    rounded_rect(4, 4, 124, 124, 26, ink)
    for x in (31, 97):
        rounded_rect(x - 3, 28, x + 3, 100, 3, paper)
    for x0, x1 in ((28, 45), (83, 100)):
        for y in (31, 97):
            rounded_rect(x0, y - 3, x1, y + 3, 3, paper)
    for y, end in ((44, 78), (56, 72), (83, 78)):
        rounded_rect(47.5, y - 2.5, end + 2.5, y + 2.5, 2.5, paper)
    rounded_rect(20, 67, 108, 71, 2, blue)
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            samples = [(yy * width + xx) * 4 for yy in range(y * scale, (y + 1) * scale) for xx in range(x * scale, (x + 1) * scale)]
            alpha = sum(pixels[i + 3] for i in samples)
            raw.extend(round(sum(pixels[i + channel] * pixels[i + 3] for i in samples) / alpha) if alpha else 0 for channel in range(3))
            raw.append(round(alpha / len(samples)))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


if __name__ == '__main__':
    target = ROOT / 'assets' / 'icons'
    target.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        (target / f'icon-{size}.png').write_bytes(render(size))
    print('Generated four extension icons.')
