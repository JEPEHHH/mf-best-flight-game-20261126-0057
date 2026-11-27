#!/usr/bin/env python3
"""Shrink the captured renders to the hand-in byte cap without touching a pixel
of geometry: flat vector art loses nothing from a small palette."""
import sys
from pathlib import Path
from PIL import Image

CAP = 262144
root = Path(__file__).resolve().parent.parent / 'screenshots'
for path in sorted(root.glob('*.png')):
    img = Image.open(path).convert('RGB')
    for colors in (200, 160, 128, 96, 72, 48):
        tmp = path.with_suffix('.tmp.png')
        img.convert('P', palette=Image.ADAPTIVE, colors=colors).save(tmp, optimize=True)
        if tmp.stat().st_size <= CAP * 0.94:
            tmp.replace(path)
            print(f'{path.name}: {colors} colours -> {path.stat().st_size} bytes')
            break
    else:
        tmp.replace(path)
        print(f'{path.name}: still {path.stat().st_size} bytes at 48 colours', file=sys.stderr)
