# /// script
# dependencies = ["numpy", "opencv-python-headless", "pillow"]
# ///
"""Misturinha na Deck · Cascabum: event promo in the Arena Deck identity (same system as the Turma do
Samba cut: Orbitron / Michroma / Kaushan / Montserrat Black, orange #FF5A00 on graphite, top info bar,
word captions with the active word on an orange pill, end card Deck x band).
Usage: render_cascabum.py <dir> [preview t1,t2,...]"""
import json, math, subprocess, sys, re
from functools import lru_cache
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]
FONTS = f"{D}/fonts"
PREVIEW = len(sys.argv) > 2 and sys.argv[2] == 'preview'
FPS, OW, OH = 30, 1080, 1920
TOTAL = 24.6

ORANGE, GRAPH, OFFW, SAND, SKY = (255, 90, 0), (58, 58, 58), (248, 246, 239), (217, 198, 168), (167, 196, 217)
BLK = (24, 24, 24)
CASCA = [(242, 74, 3), (252, 200, 20)]                               # Cascabum orange + yellow
SAMBA = [(226, 0, 128), (255, 153, 0), (166, 222, 0), (6, 136, 145), (128, 0, 158)]
TITLE = f"{FONTS}/Orbitron-Black.ttf"
SUB = f"{FONTS}/Michroma.ttf"
SCRIPT = f"{FONTS}/Kaushan.ttf"
CAP = f"{FONTS}/Montserrat-Black.ttf"
SYM = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BR = f"{D}/brand"
# faces sit in the middle third here: info cards play up top, captions on the chests
CAP_Y, CARD_Y = 1405, 430

words = json.load(open(f"{D}/words.json"))["words"]


def build_chunks(ws):
    chunks, cur = [], []
    for w in ws:
        if cur:
            prev = cur[-1]
            chars = sum(len(x['w']) + 1 for x in cur) + len(w['w'])
            if len(cur) >= 3 or chars > 16 or re.search(r"[.,?!]$", prev['w']) or w['s'] - prev['e'] > 0.3:
                chunks.append(cur)
                cur = []
        cur.append(w)
    chunks.append(cur)
    out = []
    for k, c in enumerate(chunks):
        nxt = chunks[k + 1][0]['s'] if k + 1 < len(chunks) else None
        t1 = nxt if nxt is not None and nxt - c[-1]['e'] < 0.6 else c[-1]['e'] + 0.3
        out.append(dict(words=c, t0=c[0]['s'], t1=t1))
    return out


CHUNKS = build_chunks(words)


# ---------------------------------------------------------------- helpers
@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, size)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def eoc(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def eob(x, s=1.9):
    x = clamp(x) - 1
    return x * x * ((s + 1) * x + s) + 1


def shadowed(img, blur=10, off=(0, 6), alpha=150):
    pad = blur * 3
    w, h = img.size
    out = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', img.size, (0, 0, 0, 255))
    sh.putalpha(img.split()[3].point(lambda v: v * alpha // 255))
    out.paste(sh, (pad + off[0], pad + off[1]), sh)
    out = out.filter(ImageFilter.GaussianBlur(blur))
    out.alpha_composite(img, (pad, pad))
    return out


@lru_cache(None)
def text_img(text, path, size, fill, stroke=0, stroke_fill=BLK, shadow=True):
    f = font(path, size)
    l, t, r, b = f.getbbox(text, stroke_width=stroke)
    im = Image.new('RGBA', (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((-l + 4, -t + 4), text, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
    return shadowed(im, 9, (0, 5), 150) if shadow else im


def rrect(w, h, r, fill):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=fill)
    return im


def label(text, size, fg, bg, padx=30, pady=16, r=None, path=TITLE):
    f = font(path, size)
    l, t, rr, b = f.getbbox(text)
    w, h = rr - l + padx * 2, b - t + pady * 2
    im = rrect(w, h, r if r is not None else h // 2, bg)
    ImageDraw.Draw(im).text((padx - l, pady - t), text, font=f, fill=fg)
    return im


@lru_cache(None)
def tracked(text, path, size, fill, spacing, shadow=True):
    f = font(path, size)
    ws = [f.getlength(ch) for ch in text]
    l, t, r, b = f.getbbox(text)
    im = Image.new('RGBA', (int(sum(ws) + spacing * (len(text) - 1)) + 8, b + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 4
    for ch, cw in zip(text, ws):
        d.text((x, 4), ch, font=f, fill=fill)
        x += cw + spacing
    return shadowed(im, 6, (0, 3), 150) if shadow else im


def transform(img, scale=1.0, alpha=1.0, rot=0.0):
    scale = min(scale, 1020 / max(1, img.size[0]))
    if rot:
        img = img.rotate(rot, resample=Image.BICUBIC, expand=True)
    if abs(scale - 1) > 1e-3:
        w, h = img.size
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.BICUBIC)
    if alpha < 0.999:
        img = img.copy()
        img.putalpha(img.split()[3].point(lambda v: int(v * clamp(alpha))))
    return img


def blit(frame, img, cx, cy):
    a = np.asarray(img, dtype=np.float32)
    h, w = a.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    fx0, fy0, fx1, fy1 = max(0, x0), max(0, y0), min(OW, x0 + w), min(OH, y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return
    sub = a[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0]
    al = sub[..., 3:4] / 255.0
    frame[fy0:fy1, fx0:fx1] = frame[fy0:fy1, fx0:fx1] * (1 - al) + sub[..., :3] * al


def logo(name, width):
    im = Image.open(f"{BR}/{name}").convert('RGBA')
    return im.resize((width, int(im.size[1] * width / im.size[0])), Image.LANCZOS)


def swoosh(w, h, n=3, color=ORANGE, progress=1.0):
    """Arena Deck 'curvas de movimento': stacked tapered orange curves, drawn on with progress"""
    s = 3
    im = Image.new('RGBA', (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for k in range(n):
        pts = []
        steps = 60
        for i in range(int(steps * clamp(progress)) + 1):
            u = i / steps
            x = u * w * s
            y = (h * s * 0.55) + k * 26 * s - math.sin(u * math.pi * 1.1 + 0.3) * h * s * 0.32 - u * 18 * s
            pts.append((x, y))
        for i in range(len(pts) - 1):
            u = i / steps
            width = max(1, int((4 + 14 * math.sin(u * math.pi)) * s * (1 - 0.25 * k)))
            d.line([pts[i], pts[i + 1]], fill=color + (int(255 * (1 - 0.18 * k)),), width=width)
    return im.resize((w, h), Image.LANCZOS)


# ---------------------------------------------------------------- static assets
DECK_STACK = shadowed(logo('deck_stacked_light.png', 520), 14, (0, 8), 170)
DECK_STACK_END = shadowed(logo('deck_stacked_light.png', 380), 12, (0, 6), 170)
DECK_H = shadowed(logo('deck_horizontal_white.png', 680), 12, (0, 6), 170)
DECK_H_TOP = shadowed(logo('deck_horizontal_white.png', 270), 6, (0, 3), 160)
CASCA_BIG = shadowed(logo('cascabum.png', 860), 10, (0, 8), 150)
CASCA_END = shadowed(logo('cascabum.png', 640), 10, (0, 6), 150)
CASCA_MID = shadowed(logo('cascabum.png', 520), 10, (0, 6), 150)
SAMBA_MID = shadowed(logo('samba_color.png', 440), 10, (0, 5), 160)
NOTE = text_img('♪', SYM, 90, OFFW, 0)
NOTE2 = text_img('♫', SYM, 80, ORANGE, 0)
TIME = '18H'


def info_bar():
    a = label('MISTURINHA NA DECK', 30, OFFW, ORANGE, 24, 16, 10)
    b = label(f'SÁB 31/10 · {TIME}', 30, ORANGE, GRAPH, 24, 16, 10, SUB)
    w = a.size[0] + b.size[0] - 12
    bar = Image.new('RGBA', (w, max(a.size[1], b.size[1])), (0, 0, 0, 0))
    bar.alpha_composite(b, (a.size[0] - 12, 0))
    bar.alpha_composite(a, (0, 0))
    return shadowed(bar, 10, (0, 5), 160)


INFO = info_bar()


def calendar():
    w, h = 300, 330
    im = rrect(w, h, 34, OFFW)
    top = rrect(w, 96, 34, ORANGE)
    im.alpha_composite(top.crop((0, 0, w, 96)), (0, 0))
    ImageDraw.Draw(im).rectangle([0, 60, w, 96], fill=ORANGE)
    d = ImageDraw.Draw(im)
    for txt, f, y, col in [('OUTUBRO', font(SUB, 30), 48, OFFW), ('31', font(TITLE, 150), 205, GRAPH),
                           ('SÁBADO', font(SUB, 28), 296, ORANGE)]:
        l, t, r, b = f.getbbox(txt)
        d.text(((w - (r - l)) / 2 - l, y - (b - t) / 2 - t), txt, font=f, fill=col)
    return shadowed(im, 16, (0, 10), 170)


CAL = calendar()


@lru_cache(None)
def title_lockup():
    a = text_img('MISTURINHA', TITLE, 104, OFFW, 3)
    b = text_img('NA DECK', TITLE, 128, ORANGE, 3)
    return a, b


def ticket_card():
    """'CONVITES LIMITADOS': graphite ticket with notched sides and an orange stub"""
    w, h = 860, 170
    im = rrect(w, h, 26, GRAPH)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, 190, h - 1], 26, fill=ORANGE)
    d.rectangle([150, 0, 190, h - 1], fill=ORANGE)
    for y in range(14, h - 10, 22):
        d.ellipse([186, y, 196, y + 10], fill=GRAPH)
    for cx in (0, w):
        d.ellipse([cx - 22, h / 2 - 22, cx + 22, h / 2 + 22], fill=(0, 0, 0, 0))
    f1, f2 = font(TITLE, 48), font(SUB, 26)
    d.text((95 - f1.getlength('31') / 2, 40), '31', font=f1, fill=OFFW)
    d.text((95 - f2.getlength('OUT') / 2, 104), 'OUT', font=f2, fill=OFFW)
    d.text((232, 34), 'CONVITES', font=font(TITLE, 54), fill=OFFW)
    d.text((232, 100), 'LIMITADOS', font=font(TITLE, 42), fill=ORANGE)
    return shadowed(im, 14, (0, 8), 170)


TICKET = ticket_card()


def pin_card():
    """map pin + ARARAQUARA E REGIÃO"""
    w, h = 820, 150
    im = rrect(w, h, 26, GRAPH)
    d = ImageDraw.Draw(im)
    cx, cy = 80, 66
    d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=ORANGE)
    d.polygon([(cx - 28, cy + 18), (cx + 28, cy + 18), (cx, cy + 62)], fill=ORANGE)
    d.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], fill=GRAPH)
    d.text((150, 26), 'ARARAQUARA', font=font(TITLE, 56), fill=OFFW)
    d.text((152, 96), 'E TODA A REGIÃO', font=font(SUB, 28), fill=ORANGE)
    return shadowed(im, 14, (0, 8), 170)


PIN = pin_card()


# ---------------------------------------------------------------- captions
def caption_img(chunk, t):
    f = font(CAP, 62)
    toks = [re.sub(r"[.,]+$", "", w['w']).upper() for w in chunk['words']]
    sp = 20
    widths = [f.getbbox(x)[2] - f.getbbox(x)[0] for x in toks]
    img = Image.new('RGBA', (1060, 130), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    active = max([i for i, w in enumerate(chunk['words']) if w['s'] <= t + 0.02] or [0])
    x = (1060 - (sum(widths) + sp * (len(toks) - 1))) / 2
    for i, tok in enumerate(toks):
        l, tp, r, b = f.getbbox(tok)
        if i == active:
            dr.rounded_rectangle([x - 16, 30 + tp - 13, x + widths[i] + 16, 30 + b + 13], 14, fill=ORANGE)
            dr.text((x - l, 30), tok, font=f, fill=OFFW)
        else:
            dr.text((x - l, 30), tok, font=f, fill=OFFW, stroke_width=7, stroke_fill=BLK)
        x += widths[i] + sp
    return shadowed(img.crop(img.getbbox()), 10, (0, 6), 140)


# ---------------------------------------------------------------- timeline (seconds; the edit has no cuts)
def W(text, nth=0):
    hits = [w for w in words if re.sub(r"\W", "", w['w'].lower()) == text]
    return hits[nth]['s']


T_INTRO_END = 1.6
T_CASCA = 1.64                       # "salve, salve"
T_TITLE = W('a')                     # "A gente de novo aqui…"
T_TITLE_END = W('31') - 0.05
T_CAL, T_DECK = W('31'), W('arena')
T_LINE, T_SAMBA = W('cascabum'), W('turma')
T_GRANDE = W('um', 1)             # 'um grande evento' (#0 is 'um recadinho')
T_CONV, T_CONV_END = W('convites'), W('as')
T_ANOS, T_2000 = W('as'), W('2000')
T_ARA = W('araraquara')
T_BORA = W('bora')
T_END = 20.25                        # "né?" ends 19.87; the logo card lands after it

CARDS = [
    dict(kind='cal', t0=T_CAL, t1=T_DECK),
    dict(kind='deck', t0=T_DECK, t1=T_LINE),
    dict(kind='conv', t0=T_CONV, t1=T_CONV_END),
    dict(kind='pin', t0=T_ARA, t1=T_BORA),
]
events = [dict(t=0.05, s='whoosh'), dict(t=T_CASCA, s='impact'), dict(t=T_TITLE, s='whoosh')]
events += [dict(t=c['t0'], s='pop' if c['kind'] in ('cal', 'pin') else 'whoosh') for c in CARDS]
events += [dict(t=T_LINE, s='impact'), dict(t=T_SAMBA, s='pop'), dict(t=T_GRANDE, s='whoosh'), dict(t=T_2000, s='impact'),
           dict(t=T_BORA, s='confetti'), dict(t=T_END, s='ding')]
json.dump(dict(total=TOTAL, speech_end=T_END, events=events), open(f"{D}/events.json", 'w'), indent=1)

rng = np.random.default_rng(3)
PAL = CASCA + SAMBA
CONF = [dict(x=rng.uniform(80, 1000), vx=rng.normal(0, 160), vy=rng.uniform(-1500, -700), c=PAL[i % len(PAL)] if i % 6 else ORANGE,
             w=rng.uniform(14, 26), h=rng.uniform(26, 44), rot=rng.uniform(0, 360), vr=rng.normal(0, 400), d=rng.uniform(0, 0.25))
        for i in range(110)]


def draw_confetti(frame, t, t0):
    te = t - t0
    if te < 0 or te > 3.4:
        return
    for p in CONF:
        tt = te - p['d']
        if tt < 0:
            continue
        x = p['x'] + p['vx'] * tt
        y = 1500 + p['vy'] * tt + 0.5 * 1500 * tt * tt
        if y > OH + 60:
            continue
        a = clamp((3.4 - te) / 0.6)
        flip = abs(math.cos(tt * 6 + p['rot']))
        pc = rrect(int(p['w']), max(2, int(p['h'] * flip)), 4, p['c'] + (255,))
        blit(frame, transform(pc, 1.0, a, rot=p['rot'] + p['vr'] * tt), x, y)


# ---------------------------------------------------------------- scenes
def draw_intro(frame, t):
    if t > T_INTRO_END + 0.2:
        return
    k = 0.55 * (1 - clamp((t - T_INTRO_END + 0.15) / 0.3))
    frame[:] = frame * (1 - k) + np.array(BLK, np.float32) * k
    p = clamp(t / 0.45)
    e = clamp((t - (T_INTRO_END - 0.2)) / 0.3)
    blit(frame, transform(DECK_STACK, (0.7 + 0.3 * eob(p)) * (1 + 0.4 * e), clamp(p * 3) * (1 - e)), OW / 2, 820)
    ap = tracked('APRESENTA', SUB, 34, OFFW, 14)
    p2 = clamp((t - 0.35) / 0.35)
    blit(frame, transform(ap, 1.0, p2 * (1 - e)), OW / 2, 1150)
    sw = swoosh(760, 170, 3, ORANGE, eoc((t - 0.15) / 0.8))
    blit(frame, transform(sw, 1.0, 1 - e), OW / 2 + 20, 1290)


def draw_casca(frame, t):
    if not (T_CASCA <= t < T_TITLE):
        return
    p = clamp((t - T_CASCA) / 0.45)
    e = clamp((t - (T_TITLE - 0.25)) / 0.25)
    bob = 6 * math.sin((t - T_CASCA) * 2 * math.pi * 1.0)
    blit(frame, transform(CASCA_BIG, (0.5 + 0.5 * eob(p, 2.2)) * (1 - 0.2 * e), clamp(p * 3) * (1 - e)), OW / 2, 330 + bob)
    p2 = clamp((t - T_CASCA - 0.35) / 0.35)
    tag = shadowed(label('AO VIVO | ANOS 2000', 40, OFFW, ORANGE, 30, 18), 10, (0, 6), 160)
    blit(frame, transform(tag, 0.6 + 0.4 * eob(p2), clamp(p2 * 3) * (1 - e)), OW / 2, 545)
    for i, (nx, ny, ph) in enumerate([(120, 200, 0.0), (960, 180, 0.7), (100, 470, 1.3), (980, 500, 2.0)]):
        q = clamp((t - T_CASCA - 0.2 - i * 0.1) / 0.4)
        n = NOTE if i % 2 == 0 else NOTE2
        blit(frame, transform(n, 0.8 + 0.2 * eob(q), q * (1 - e) * 0.95, rot=12 * math.sin(t * 3 + ph)), nx,
             ny - 14 * math.sin(t * 2.4 + ph))


def draw_title(frame, t):
    if not (T_TITLE <= t < T_TITLE_END):
        return
    a, b = title_lockup()
    e = clamp((t - (T_TITLE_END - 0.25)) / 0.25)
    p1 = clamp((t - T_TITLE) / 0.35)
    p2 = clamp((t - T_TITLE - 0.12) / 0.35)
    p3 = clamp((t - T_TITLE - 0.45) / 0.35)
    vem = text_img('Vem aí a', SCRIPT, 76, ORANGE, 5)
    blit(frame, transform(vem, 0.6 + 0.4 * eob(p1), p1 * (1 - e), rot=6), OW / 2 - 200, 160)
    blit(frame, transform(a, 1.0, p1 * (1 - e)), OW / 2 - 140 * (1 - eoc(p1)), 270)
    blit(frame, transform(b, 0.6 + 0.4 * eob(p2), p2 * (1 - e)), OW / 2, 390)
    sub = shadowed(label(f'31 DE OUTUBRO · A PARTIR DAS {TIME}', 30, OFFW, GRAPH, 28, 18, 12, SUB), 10, (0, 6), 160)
    blit(frame, transform(sub, 0.7 + 0.3 * eob(p3), p3 * (1 - e)), OW / 2, 520)


def draw_info(frame, t):
    if t < T_TITLE_END - 0.1 or t >= T_END:
        return
    p = clamp((t - T_TITLE_END + 0.1) / 0.35)
    e = clamp((t - T_END + 0.2) / 0.2)
    blit(frame, transform(DECK_H_TOP, 1.0, p * (1 - e)), OW / 2, 105 - 30 * (1 - eoc(p)))
    blit(frame, transform(INFO, 1.0, p * (1 - e)), OW / 2, 185 - 30 * (1 - eoc(p)))


def draw_card(frame, c, t):
    t0, t1 = c['t0'], c['t1']
    if not (t0 <= t < t1):
        return
    p = clamp((t - t0) / 0.25)
    e = clamp((t - (t1 - 0.15)) / 0.15)
    sc = (0.55 + 0.45 * eob(p)) * (1 - 0.2 * e)
    al = clamp(p * 3) * (1 - e)
    dy = 60 * (1 - eoc(p))
    k = c['kind']
    if k == 'cal':
        blit(frame, transform(CAL, sc * 0.9, al, rot=-4 * (1 - eoc(p))), OW / 2, CARD_Y + 20 + dy)
    elif k == 'deck':
        blit(frame, transform(DECK_H, sc, al), OW / 2, CARD_Y + dy)
    elif k == 'conv':
        blit(frame, transform(TICKET, sc, al, rot=-2 * (1 - eoc(p))), OW / 2, CARD_Y + dy)
    elif k == 'pin':
        blit(frame, transform(PIN, sc, al), OW / 2, CARD_Y + dy)


def draw_lineup(frame, t):
    """Cascabum + Turma do Samba on their names; on 'um grande evento' they give way to the line"""
    t0, t1 = T_LINE - 0.05, T_CONV - 0.05
    if not (t0 <= t < t1):
        return
    e = clamp((t - (t1 - 0.2)) / 0.2)
    g = clamp((t - T_GRANDE + 0.05) / 0.3)
    p = clamp((t - t0) / 0.35)
    blit(frame, transform(CASCA_MID, (0.6 + 0.4 * eob(p, 2.2)) * (1 - 0.3 * g), clamp(p * 3) * (1 - g)), OW / 2, 340)
    q = clamp((t - T_SAMBA) / 0.35)
    if q > 0:
        blit(frame, transform(text_img('+', TITLE, 70, ORANGE, 3), 0.6 + 0.4 * eob(q), q * (1 - g)), OW / 2, 440)
        blit(frame, transform(SAMBA_MID, (0.6 + 0.4 * eob(q, 2.2)) * (1 - 0.3 * g), clamp(q * 3) * (1 - g)), OW / 2, 525)
    if g > 0:
        gr = text_img('Um grande evento!', SCRIPT, 110, ORANGE, 5)
        blit(frame, transform(gr, 0.6 + 0.4 * eob(g, 2.2), g * (1 - e), rot=4), OW / 2, 400)
        blit(frame, transform(swoosh(640, 110, 2, OFFW, eoc((t - T_GRANDE - 0.2) / 0.4)), 1.0, g * (1 - e)), OW / 2 + 20, 515)


def draw_anos(frame, t):
    t0, t1 = T_ANOS - 0.05, T_ARA - 0.05
    if not (t0 <= t < t1):
        return
    p = clamp((t - t0) / 0.3)
    e = clamp((t - (t1 - 0.2)) / 0.2)
    a = shadowed(label('AS BANDAS QUE EMBALARAM OS', 28, OFFW, GRAPH, 26, 16, 12, SUB), 10, (0, 6), 160)
    blit(frame, transform(a, 1.0, p * (1 - e)), OW / 2, 300)
    q = clamp((t - T_2000 + 0.25) / 0.35)
    if q > 0:
        n = text_img('ANOS 2000', TITLE, 150, ORANGE, 4)
        blit(frame, transform(n, (0.5 + 0.5 * eob(q, 2.3)) * (1 + 0.02 * math.sin((t - T_2000) * 9)), clamp(q * 3) * (1 - e)), OW / 2, 435)
        blit(frame, transform(swoosh(760, 140, 3, ORANGE, eoc((t - T_2000) / 0.6)), 1.0, 1 - e), OW / 2 + 20, 555)


def draw_np(frame, t):
    t0, t1 = T_BORA, T_END
    if not (t0 <= t < t1):
        return
    p = clamp((t - t0) / 0.3)
    e = clamp((t - (t1 - 0.15)) / 0.15)
    a = text_img('Bora!', SCRIPT, 120, OFFW, 5)
    b = text_img('Não fique de fora!', SCRIPT, 104, ORANGE, 5)
    blit(frame, transform(a, 0.5 + 0.5 * eob(p, 2.4), p * (1 - e), rot=6), OW / 2 - 220, 310)
    p2 = clamp((t - t0 - 0.35) / 0.35)
    blit(frame, transform(b, 0.6 + 0.4 * eob(p2, 2.2), p2 * (1 - e), rot=5), OW / 2 + 10, 445)
    blit(frame, transform(swoosh(620, 110, 2, OFFW, eoc((t - t0 - 0.5) / 0.4)), 1.0, 1 - e), OW / 2 + 20, 550)


def draw_end(frame, t):
    if t < T_END:
        return
    te = t - T_END
    k = 0.86 * eoc(te / 0.35)
    frame[:] = frame * (1 - k) + np.array(BLK, np.float32) * k
    ps = [clamp((te - d) / 0.35) for d in (0.0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.72, 0.85)]
    blit(frame, transform(swoosh(1000, 220, 3, ORANGE, eoc(te / 0.9)), 1.0, 0.85), OW / 2 - 40, 1700)
    blit(frame, transform(DECK_STACK_END, 0.7 + 0.3 * eob(ps[0]), ps[0]), OW / 2, 300)
    blit(frame, transform(text_img('✕', SYM, 52, SAND, 0), 1.0, ps[1]), OW / 2, 500)
    blit(frame, transform(CASCA_END, 0.6 + 0.4 * eob(ps[1], 2.2), ps[1]), OW / 2, 640)
    a, b = title_lockup()
    blit(frame, transform(a, 0.82 * (0.7 + 0.3 * eob(ps[2])), ps[2]), OW / 2, 900)
    blit(frame, transform(b, 0.82 * (0.6 + 0.4 * eob(ps[3])), ps[3]), OW / 2, 1005)
    blit(frame, transform(tracked('SÁBADO · 31 DE OUTUBRO', SUB, 38, OFFW, 4), 1.0, ps[4]), OW / 2, 1140)
    blit(frame, transform(text_img(f'A PARTIR DAS {TIME}', TITLE, 72, ORANGE, 0), 0.7 + 0.3 * eob(ps[5]), ps[5]), OW / 2, 1240)
    pill = shadowed(label('CONVITES LIMITADOS', 34, OFFW, ORANGE, 34, 22), 12, (0, 6), 170)
    pulse = 1 + 0.03 * math.sin(te * 2 * math.pi * 1.4)
    blit(frame, transform(pill, (0.6 + 0.4 * eob(ps[6])) * pulse, ps[6]), OW / 2, 1385)
    blit(frame, transform(tracked('ESPORTE • LAZER • GASTRONOMIA • EVENTOS', SUB, 22, SAND, 5), 1.0, ps[7]), OW / 2, 1500)


def draw_progress(frame, t):
    w = int(OW * clamp(t / TOTAL))
    if w:
        frame[0:8, :w] = frame[0:8, :w] * 0.1 + np.array(ORANGE, np.float32) * 0.9


# ---------------------------------------------------------------- camera
PUNCH = [T_CASCA, T_TITLE, T_CAL, T_LINE, T_CONV, T_2000, T_ARA, T_BORA]


def camera(img, t):
    z = 1.0 + 0.04 * ((t % 6) / 6)
    if t < 1.9:
        z = 1.12 - 0.12 * eoc(t / 1.9)
    for tp in PUNCH:
        d = t - tp
        if 0 <= d < 0.6:
            z += 0.07 * (1 - eoc(d / 0.6))
    if t > T_END:
        z += 0.05 * eoc((t - T_END) / 2.5)
    cx, cy = OW / 2, OH * 0.47
    x0, y0 = np.clip(cx - cx / z, 0, OW - OW / z), np.clip(cy - cy / z, 0, OH - OH / z)
    M = np.float32([[z, 0, -x0 * z], [0, z, -y0 * z]])
    return cv2.warpAffine(img, M, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def flash(frame, t):
    for tp, dur in [(T_CASCA, 0.18), (T_2000, 0.12)]:
        d = t - tp
        if 0 <= d < dur:
            k = 0.7 * (1 - d / dur)
            frame[:] = frame * (1 - k) + np.array(OFFW, np.float32) * k


def render_frame(img, fi):
    t = fi / FPS
    fr = camera(img, t)[..., ::-1].astype(np.float32)
    draw_intro(fr, t)
    draw_casca(fr, t)
    draw_title(fr, t)
    for c in CARDS:
        draw_card(fr, c, t)
    draw_lineup(fr, t)
    draw_anos(fr, t)
    for ch in CHUNKS:
        if ch['t0'] <= t < ch['t1'] and t < T_END:
            pin = clamp((t - ch['t0']) / 0.12)
            blit(fr, transform(caption_img(ch, t), 0.82 + 0.18 * eob(pin, 2.2), clamp(pin * 2.5)), OW / 2, CAP_Y)
    draw_np(fr, t)
    draw_confetti(fr, t, T_BORA)
    draw_end(fr, t)
    draw_info(fr, t)
    flash(fr, t)
    draw_progress(fr, t)
    return np.clip(fr, 0, 255).astype(np.uint8)


if __name__ == '__main__':
    cap = cv2.VideoCapture(f"{D}/media/base.mp4")
    NSRC = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if PREVIEW:
        tiles = []
        for tt in [float(x) for x in sys.argv[3].split(',')]:
            fi = int(tt * FPS)
            cap.set(cv2.CAP_PROP_POS_FRAMES, min(fi, NSRC - 1))
            ok, img = cap.read()
            tiles.append(cv2.resize(render_frame(img, fi), (360, 640), interpolation=cv2.INTER_AREA))
        rows = [np.hstack(tiles[i:i + 6] + [np.zeros_like(tiles[0])] * (6 - len(tiles[i:i + 6]))) for i in range(0, len(tiles), 6)]
        Image.fromarray(np.vstack(rows)).save(f"{D}/media/preview.jpg", quality=88)
        print('preview', dict(cal=T_CAL, deck=T_DECK, line=T_LINE, conv=T_CONV, n2000=T_2000, ara=T_ARA, bora=T_BORA, end=T_END))
        sys.exit()
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                            "-pix_fmt", "yuv420p", f"{D}/media/picture.mp4"], stdin=subprocess.PIPE)
    fi, img = 0, None
    while fi < int(TOTAL * FPS):
        ok, nxt = cap.read()
        if ok:
            img = nxt                   # past the last source frame the picture holds (freeze under the end card)
        enc.stdin.write(render_frame(img, fi).tobytes())
        fi += 1
        if fi % 150 == 0:
            print(fi, flush=True)
    enc.stdin.close()
    enc.wait()
    print('done', fi)
