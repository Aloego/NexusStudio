# Draws build/icon.png and build/icon.ico (needs Pillow). Already run once; kept so the icon can be changed.
from PIL import Image, ImageDraw
S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
grad = Image.new('RGBA', (S, S))
px = grad.load()
stops = [(0.0, (37, 99, 235)), (0.55, (99, 102, 241)), (1.0, (34, 211, 238))]
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * S - 2)
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                u = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
                px[x, y] = mix(stops[i][1], stops[i + 1][1], u) + (255,)
                break
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle((40, 40, S - 40, S - 40), radius=210, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)
def layer(cy, alpha):
    cx, w, h = S // 2, 330, 170
    d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)], fill=(255, 255, 255, alpha))
layer(380, 255); layer(560, 200); layer(740, 150)
png = img.resize((256, 256), Image.LANCZOS)
img.resize((512, 512), Image.LANCZOS).save('build/icon.png')
png.save('build/icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
