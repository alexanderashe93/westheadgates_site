# -*- coding: utf-8 -*-
"""Convert the Westhead Gates logo PDF into a single self-contained SVG.

The file is unusually simple for a PDF: no text, no images, no transparency
groups — just filled paths plus two axial shadings painted through clips. That
is a close enough match to SVG that a faithful conversion is a page of code.
"""
import io, re, math

W, H = 841.89, 595.276

toks = open('content.txt').read().split()

def cmyk(c, m, y, k):
    r = 255 * (1 - min(1, c + k)); g = 255 * (1 - min(1, m + k)); b = 255 * (1 - min(1, y + k))
    return '#%02x%02x%02x' % (int(round(r)), int(round(g)), int(round(b)))

def mul(a, b):  # a then b
    return (a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
            a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5])

def apply(m, x, y):
    return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])

def n(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')

I = (1.0, 0, 0, 1.0, 0, 0)
ctm = I
stack = []
fill = '#000000'
d = []            # current path, as SVG commands in device space
pending_clip = None
out = []
clips = []
cur = (0.0, 0.0)
start = (0.0, 0.0)

def pt(x, y):
    X, Y = apply(ctm, x, y); return n(X) + ' ' + n(Y)

i = 0
ops = []
while i < len(toks):
    t = toks[i]
    try:
        float(t); ops.append(('num', float(t))); i += 1; continue
    except ValueError:
        pass
    args = [o[1] for o in ops if o[0] == 'num']
    if t == 'q':
        stack.append((ctm, fill, list(clips)))
    elif t == 'Q':
        ctm, fill, clips = stack.pop()
    elif t == 'cm':
        ctm = mul(tuple(args[-6:]), ctm)
    elif t == 'm':
        cur = start = (args[-2], args[-1]); d.append('M' + pt(*cur))
    elif t == 'l':
        cur = (args[-2], args[-1]); d.append('L' + pt(*cur))
    elif t == 'c':
        a = args[-6:]
        d.append('C' + pt(a[0], a[1]) + ' ' + pt(a[2], a[3]) + ' ' + pt(a[4], a[5]))
        cur = (a[4], a[5])
    elif t == 'v':
        a = args[-4:]
        d.append('C' + pt(*cur) + ' ' + pt(a[0], a[1]) + ' ' + pt(a[2], a[3])); cur = (a[2], a[3])
    elif t == 'y':
        a = args[-4:]
        d.append('C' + pt(a[0], a[1]) + ' ' + pt(a[2], a[3]) + ' ' + pt(a[2], a[3])); cur = (a[2], a[3])
    elif t == 'h':
        d.append('Z'); cur = start
    elif t == 're':
        x, y, w, h = args[-4:]
        d.append('M' + pt(x, y) + 'L' + pt(x + w, y) + 'L' + pt(x + w, y + h) + 'L' + pt(x, y + h) + 'Z')
        cur = start = (x, y)
    elif t in ('W', 'W*'):
        pending_clip = ('evenodd' if t == 'W*' else 'nonzero')
    elif t in ('f', 'F', 'f*', 'b', 'b*', 'B', 'B*', 'n', 's', 'S'):
        path = ' '.join(d)
        if t in ('f', 'F', 'f*', 'b', 'b*', 'B', 'B*') and path:
            out.append(('fill', path, fill, 'evenodd' if t.endswith('*') else 'nonzero', list(clips)))
        if pending_clip and path:
            clips = clips + [(path, pending_clip)]
        pending_clip = None
        d = []
    elif t == 'k':
        fill = cmyk(*args[-4:])
    elif t == 'g':
        v = int(round(args[-1] * 255)); fill = '#%02x%02x%02x' % (v, v, v)
    elif t == 'rg':
        fill = '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in args[-3:])
    elif t == 'sh':
        pass  # handled below via the marker sweep
    elif t == 'BX' and i + 2 < len(toks) and toks[i + 2] == 'sh':
        out.append(('sh', toks[i + 1], ctm, list(clips)))
    ops = []
    i += 1

# ---- gradients -------------------------------------------------------------
def f2(c0, c1, N, t):
    return [a + (t ** N) * (b - a) for a, b in zip(c0, c1)]

# Sh0: stitching function over five type-2 exponentials (the brass).
GOLD = [0.380392, 0.564706, 0.980392, 0.247059]
GREY30 = [0.0, 0.0, 0.0, 0.299988]
GREY20 = [0.0, 0.0, 0.0, 0.199997]
BOUNDS = [0.232213, 0.449498, 0.648176, 0.746704]
SUBS = [(GOLD, GREY30, 2.52738), (GREY30, GOLD, 1.0), (GOLD, GOLD, 1.0),
        (GOLD, GREY20, 1.0), (GREY20, GOLD, 1.0)]

def sh0(t):
    lo = 0.0
    for idx, hi in enumerate(BOUNDS + [1.0]):
        if t <= hi or idx == len(BOUNDS):
            c0, c1, N = SUBS[idx]
            u = 0.0 if hi == lo else (t - lo) / (hi - lo)
            return cmyk(*f2(c0, c1, N, max(0.0, min(1.0, u))))
        lo = hi
    return cmyk(*GOLD)

def sh1(t):
    return cmyk(0, 0, 0, t)   # a single "Black" separation, 0 -> 1

grads = []
def gradient(name, fn, matrix, steps=24):
    stops = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(s / float(steps)), fn(s / float(steps)))
                    for s in range(steps + 1))
    grads.append('<linearGradient id="%s" x1="0" y1="0" x2="1" y2="0" '
                 'gradientUnits="userSpaceOnUse" spreadMethod="pad" '
                 'gradientTransform="matrix(%s)">%s</linearGradient>'
                 % (name, ','.join(n(v) for v in matrix), stops))

# ---- emit ------------------------------------------------------------------
NUM = re.compile(r'-?\d+(?:\.\d+)?')

def bbox(paths):
    xs, ys = [], []
    for p in paths:
        v = [float(x) for x in NUM.findall(p)]
        xs += v[0::2]; ys += v[1::2]
    return min(xs), min(ys), max(xs), max(ys)

def build(items, pad=6.0):
    grads, clipdefs, body, seen = [], [], [], {}

    def gradient(name, fn, matrix, steps=28):
        stops = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(s / float(steps)), fn(s / float(steps)))
                        for s in range(steps + 1))
        grads.append('<linearGradient id="%s" x1="0" y1="0" x2="1" y2="0" '
                     'gradientUnits="userSpaceOnUse" spreadMethod="pad" '
                     'gradientTransform="matrix(%s)">%s</linearGradient>'
                     % (name, ','.join(n(v) for v in matrix), stops))

    def clipref(cl):
        if not cl: return ''
        key = repr(cl)
        if key not in seen:
            cid = 'c%d' % len(seen); seen[key] = cid
            clipdefs.append('<clipPath id="%s" clipPathUnits="userSpaceOnUse">%s</clipPath>'
                % (cid, ''.join('<path d="%s" clip-rule="%s"/>' % (p, r) for p, r in cl)))
        return ' clip-path="url(#%s)"' % seen[key]

    art, gi = [], 0
    for item in items:
        if item[0] == 'fill':
            _, path, col, rule, cl = item
            art.append(path)
            body.append('<path d="%s" fill="%s" fill-rule="%s"%s/>' % (path, col, rule, clipref(cl)))
        else:
            _, name, m, cl = item
            gid = 'g%d' % gi; gi += 1
            gradient(gid, sh0 if name == '/Sh0' else sh1, m)
            for p, r in cl: art.append(p)
            body.append('<rect x="0" y="0" width="%s" height="%s" fill="url(#%s)"%s/>'
                        % (n(W), n(H), gid, clipref(cl)))

    x0, y0, x1, y1 = bbox(art)
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    vw, vh = x1 - x0, y1 - y0
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" role="img" '
            'aria-label="Westhead Gates Ltd">\n<title>Westhead Gates Ltd</title>\n'
            '<defs>%s%s</defs>\n<g transform="translate(%s %s) scale(1 -1)">\n%s\n</g>\n</svg>\n'
            % (n(vw), n(vh), ''.join(grads), ''.join(clipdefs), n(-x0), n(y1), '\n'.join(body)))

items = [o for o in out if not (o[0] == 'fill' and o[2] == '#000000' and o[1].startswith('M0 0L841.89 0'))]
io.open('logo-full.svg', 'w', encoding='utf-8').write(build(items))
gate = [o for o in items if o[0] == 'sh' and o[1] == '/Sh0']
word = [o for o in items if o not in gate]
io.open('logo-mark.svg', 'w', encoding='utf-8').write(build(gate, pad=4.0))

# ---- horizontal lockup -----------------------------------------------------
# The supplied logo is a tall stack: gate over wordmark. In a sticky header
# that has to fit in ~60px it becomes unreadable, so the same two pieces are
# re-set side by side. Nothing is redrawn — only placed.
def lockup(T=100.0, gap_ratio=0.13, word_ratio=0.70):
    def part(its):
        art = []
        for o in its:
            if o[0] == 'fill': art.append(o[1])
            else:
                for p, r in o[3]: art.append(p)
        return bbox(art)

    gx0, gy0, gx1, gy1 = part(gate)
    wx0, wy0, wx1, wy1 = part(word)
    gw, gh = gx1 - gx0, gy1 - gy0
    ww, wh = wx1 - wx0, wy1 - wy0
    sg = T / gh
    sw = (T * word_ratio) / wh
    gap = T * gap_ratio
    xoff = gw * sg + gap
    yoff = (T - wh * sw) / 2.0
    total_w = xoff + ww * sw

    grads, clipdefs, seen, gi = [], [], {}, [0]

    def gradient(name, fn, matrix, steps=28):
        stops = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(s / float(steps)), fn(s / float(steps)))
                        for s in range(steps + 1))
        grads.append('<linearGradient id="%s" x1="0" y1="0" x2="1" y2="0" '
                     'gradientUnits="userSpaceOnUse" spreadMethod="pad" '
                     'gradientTransform="matrix(%s)">%s</linearGradient>'
                     % (name, ','.join(n(v) for v in matrix), stops))

    def clipref(cl):
        if not cl: return ''
        key = repr(cl)
        if key not in seen:
            cid = 'h%d' % len(seen); seen[key] = cid
            clipdefs.append('<clipPath id="%s" clipPathUnits="userSpaceOnUse">%s</clipPath>'
                % (cid, ''.join('<path d="%s" clip-rule="%s"/>' % (p, r) for p, r in cl)))
        return ' clip-path="url(#%s)"' % seen[key]

    def render(its):
        body = []
        for o in its:
            if o[0] == 'fill':
                body.append('<path d="%s" fill="%s" fill-rule="%s"%s/>' % (o[1], o[2], o[3], clipref(o[4])))
            else:
                gid = 'hg%d' % gi[0]; gi[0] += 1
                gradient(gid, sh0 if o[1] == '/Sh0' else sh1, o[2])
                body.append('<rect x="0" y="0" width="%s" height="%s" fill="url(#%s)"%s/>'
                            % (n(W), n(H), gid, clipref(o[3])))
        return '\n'.join(body)

    g_body = render(gate)
    w_body = render(word)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" role="img" '
            'aria-label="Westhead Gates Ltd">\n<title>Westhead Gates Ltd</title>\n<defs>%s%s</defs>\n'
            '<g transform="translate(0 %s) scale(1 -1)">\n'
            '<g transform="translate(%s %s) scale(%s)">%s</g>\n'
            '<g transform="translate(%s %s) scale(%s)">%s</g>\n'
            '</g>\n</svg>\n'
            % (n(total_w), n(T), ''.join(grads), ''.join(clipdefs), n(T),
               n(-gx0 * sg), n(-gy0 * sg), n(sg), g_body,
               n(xoff - wx0 * sw), n(yoff - wy0 * sw), n(sw), w_body))

io.open('logo-h.svg', 'w', encoding='utf-8').write(lockup())
print('full', len(io.open('logo-full.svg').read()),
      'mark', len(io.open('logo-mark.svg').read()),
      'lockup', len(io.open('logo-h.svg').read()))
