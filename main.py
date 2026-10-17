# This demo shows Python drawing graphics in Circuitry Studio.
# The same file runs in a web browser with Pyctures, the free library:
# https://github.com/johnwylie70/pyctures
# pyctures: autorun

# Megademo: a demo in the style of the home-computer demos of the 1980s and 90s. An old computer says in a
# few words what a demo was and loads this one; then twelve parts are cut to a chiptune, from the title to
# the credits, and it goes round again. Every part is two small functions below: one that turns its effects
# on when it starts, and one that draws it. Nothing here looks at the clock on the wall: every cut, flash and
# bounce is worked out from where the song is, so the pictures stay in step with the music. It is main.js in
# Python: the two are written to be read side by side.
# Its music is played by synths and its effects are made by pyvisualfx, the sound and effects libraries that
# come with Pyctures, also free.
# It needs two files beside it: megademo.json, the tune (six channels: a lead that glides and scoops, chords
# as fast arpeggios, a bass, drums, hats and a second voice), and circuitry-logo.png, the Circuitry mark.
# Use: it asks whether to play with sound or without; either answer starts the demo. After that a tap, or any key,
# skips to the next part, and the left arrow goes back one. P shows the poster, and P again goes back.
# Try changing: the words in PROLOGUE, PITCH, DOWNLOAD, SCROLL_TEXT, GREETINGS and CREDITS; which part comes
# when (swap the names in two lines of TIMELINE); the colours in SUNSET; the list of TRICKS in the finale;
# "lava" to "neon" in the lava part; circuitry-logo.png for a logo of your own.
import math

from pyctures import *
from synths import *
from pyvisualfx import *

# ---------------------------------------------------------------- the words
# The words. The first three are the owner of Circuitry's own.
# PROLOGUE: what a demo was, for anyone too young to remember. Each screen, and how many beats it stays.
PROLOGUE = [
    ["BACK IN THE 1980S AND 1990S DEVELOPERS USED TO MAKE DEMOS LIKE THIS ON COMPUTERS LIKE THE C64 AND AMIGA.", 14],
    ["IT WAS A FUN AND CREATIVE ARTFORM.", 6],
    ["WE HAVE RECREATED THIS TYPE OF DEMO IN CIRCUITRY.", 8],
]
PITCH = "CIRCUITRY STUDIO IS THE FUN IDE WHERE YOU CAN BUILD DEMOS LIKE THIS IN PYTHON OR JAVASCRIPT IN YOUR BREAK, WHILST DOING PROPER CLIENT WORK TOO."
DOWNLOAD = "DOWNLOAD CIRCUITRY STUDIO TODAY TO GET THIS DEMO AND ITS SOURCE CODE."
# The scroller says both. However long it is, it passes in the time its part has.
SCROLL_TEXT = "HELLO! " + PITCH + " ... " + DOWNLOAD + " ... CIRCUITRY.DEV"
MADE_IN = ["MADE IN CIRCUITRY STUDIO", "PYCTURES  SYNTHS  PYVISUALFX"]          # under the name, on the title
GREETINGS = ["CIRCUITRY STUDIO", "THE C64", "THE AMIGA", "TRACKERS", "SCENERS", "CHIP TUNERS", "CODERS", "AND YOU!"]
CREDITS = ["MEGADEMO", "MADE IN CIRCUITRY STUDIO", PITCH, "WITH PYCTURES, SYNTHS AND PYVISUALFX", DOWNLOAD, "CIRCUITRY.DEV"]
SUNSET = ["#fff36b", "#ffb347", "#ff6b6b", "#ff3ea5", "#b03aff"]      # the five rows of a letter, top to bottom
ROWS_A_PATTERN = 64
ROWS_A_BEAT = 4

# ---------------------------------------------------------------- where the song is
tune = load_json("megademo.json", None)      # megademo.json itself, read to know which rows have a drum on them
music = None             # the song. It is asked for at once, and the browser holds it until the first tap
hits = {}                # for every row of the whole song: how hard each channel is hit there, and which drum
rows = 0                 # how far into the song we are, in rows (sixteenth notes), with fractions
seen = -1                # the last row whose drums and notes have been taken
playing = None           # the line of TIMELINE that is showing
count = 0                # beats since this part began, with fractions
bar = 0                  # bars since this part began: 0 to 7
on_beat = 0              # 1 exactly on each beat, falling to 0 before the next
kick = 0                 # 1 when the kick drum hits, falling away
snare = 0                # the same for the snare
flash = 0                # a white flash over everything, falling away
clock = 0                # plain seconds, only for the blink of TAP TO START
poster = False           # P shows the poster in place of the part
u = 8                    # a hundredth of the picture's smaller side: sizes in u fit a phone and a big screen
levels = [0, 0, 0, 0, 0, 0]      # how loud each channel of the song is just now, from 0 to 1
# A demo asks before it makes a sound. The boot screen carries on behind the card (wait=False).
sound = ask_about_sound(wait=False)
logo = load_image("circuitry-logo.png")      # the Circuitry mark: it draws once it has arrived


class Effects:
    """The effects of the part that is showing, by a name of its own choosing: fx.tear, fx.split..."""


fx = Effects()


def setup():
    # The song is read once, so that the picture knows what is on every row before it is played.
    names = [i["name"] for i in tune["instruments"]]
    for place, pattern in enumerate(tune["order"]):
        for e in tune["patterns"][pattern]["events"]:
            if "ins" not in e:
                continue
            hit = hits.setdefault(place * ROWS_A_PATTERN + e["row"], {"loud": [0, 0, 0, 0, 0, 0]})
            hit["loud"][e["ch"]] = e["vol"] / 64
            if names[e["ins"] - 1] == "kick":
                hit["kick"] = True
            if names[e["ins"] - 1] == "snare" and e["vol"] > 40:
                hit["snare"] = True
    listen_to(sound_output())        # the effects that draw the sound listen to everything that is played
    # The song is started here, not on the tap. A browser keeps a page silent until it is touched, so the
    # song waits for that touch by itself; where nothing has to wait (a video being recorded) it starts at once.
    global music
    music = play_song("megademo.json", volume=1)


def is_playing():
    return music is not None and music.position["state"] == "playing"


def skip(by):
    if not is_playing():             # still loading, or still waiting for the sound to be let on
        return
    here = TIMELINE.index(playing) if playing in TIMELINE else 0
    music.seek(TIMELINE[(here + by) % len(TIMELINE)][0])


def on_mouse_down(x, y, button):
    skip(1)                          # the first tap lets the sound on, and the song begins; later ones skip


def on_key_down(key, code):
    global poster
    if key in ("p", "P"):
        poster = not poster
    else:
        skip(-1 if key == "ArrowLeft" else 1)


def update(dt):
    global rows, seen, playing, count, bar, on_beat, kick, snare, flash, clock, u, fx
    clock += dt
    kick = max(0, kick - dt * 5)
    snare = max(0, snare - dt * 5)
    flash = max(0, flash - dt * 4)
    for ch in range(6):
        levels[ch] = max(0, levels[ch] - dt * 2.5)
    pattern = 0
    if is_playing():
        # The song says where it is in whole ticks (a tick is a sixth of a row). Which part to show, and which
        # drums have hit, are taken from exactly that. For movement the picture runs on smoothly between the
        # song's words, never behind it and never more than three ticks ahead; a skip or the loop is a jump.
        at = music.position
        heard = at["order"] * ROWS_A_PATTERN + at["row"] + at["tick"] / at["speed"]
        rows += dt * ROWS_A_BEAT * at["tempo"] / 60
        if abs(heard - rows) > 2:
            rows, seen = heard, int(heard) - 1
        rows = min(max(rows, heard), heard + 3 / at["speed"])
        pattern = at["order"]
        # The drums and the notes: every row the song has reached since the last frame is looked up.
        seen = max(seen, int(heard) - 8)
        while seen < int(heard):
            seen += 1
            hit = hits.get(seen)
            if not hit:
                continue
            if hit.get("kick"):
                kick = 1
            if hit.get("snare"):
                snare = 1
            for ch in range(6):
                levels[ch] = max(levels[ch], hit["loud"][ch])
    # Which part: the last line of the timeline that has begun.
    now = POSTER if poster else [line for line in TIMELINE if pattern >= line[0]][-1]
    if now is not playing:
        playing = now
        clear_effects()
        fx = Effects()
        now[1]()
        flash = 1
    count = max(0, rows - playing[0] * ROWS_A_PATTERN) / ROWS_A_BEAT
    bar = int(count / 4)
    on_beat = 1 - (count % 1)
    u = min(width, height) / 100


def draw():
    if playing is None:
        return background("black")
    ctx.save()
    playing[2]()
    ctx.restore()
    if flash > 0:
        ctx.global_alpha = flash * 0.8
        rect(0, 0, width, height, "white")
        ctx.global_alpha = 1


# ---------------------------------------------------------------- the opening words
def prologue_start():
    scanlines(0.3)
    vignette(0.5)


def prologue_draw():
    # The screen of a Commodore 64: it waits for a tap, types the words a screen at a time, then loads the demo.
    waiting = not is_playing()
    words, since = None, count                       # which screen of words is showing, and for how many beats it has been
    for screen, beats in PROLOGUE:
        if since < beats:
            words = screen
            break
        since -= beats
    loading = not waiting and words is None
    columns = 30 if width > height else 20           # letters across: fewer, and so bigger, on a tall phone
    edge = min(width, height) * 0.09
    cell = (width - 2 * edge) / columns / 6
    background("#6c5eb5")
    if loading:
        # While a tape loaded, the border filled with stripes of colour. Each frame they are somewhere else.
        for i in range(int(height / (3 * u)) + 1):
            rect(0, i * 3 * u + random() * 2 * u, width, 2 * u, pick(["#352879", "#b8c76f", "#9a6759", "#ffffff", "#000000"]))
    rect(edge, edge, width - 2 * edge, height - 2 * edge, "#352879")
    lines = ["CIRCUITRY STUDIO 64", "38911 BYTES FREE", "", "READY."]
    if loading:
        lines += ['LOAD "MEGADEMO",8,1', "", "LOADING" + "..."[:int(count) % 4]]
    if not waiting and not loading:
        # Sixteen letters a beat are typed, and a cursor blinks after the last of them.
        typed = int(since * 16)
        lines.append("")
        for line in wrap(words, columns - 1):
            if typed <= 0:
                break
            lines.append(line[:typed])
            typed -= len(line) + 1
        if count % 1 < 0.5:
            lines[-1] += "_"
    for i, line in enumerate(lines):
        block_text(line.ljust(columns), width / 2, edge + cell * 4 + i * cell * 8, cell, "#c8c0ff")
    # The prompt waits half a second: where the song can start by itself (a video being recorded) it has by then.
    if waiting and not sound.asking and clock > 0.5 and clock % 1 < 0.6:
        block_text("TAP TO START", width / 2, height * 0.62, cell * 1.6, "white")


def wrap(words, columns):
    """Words cut into lines of no more than so many letters, breaking at the spaces."""
    lines = [""]
    for word in words.split(" "):
        if lines[-1] and len(lines[-1] + " " + word) > columns:
            lines.append(word)
        else:
            lines[-1] = lines[-1] + " " + word if lines[-1] else word
    return lines


# ---------------------------------------------------------------- 1. the title
def title_start():
    fx.tear = glitch(0.1)
    fx.split = rgb_split(2)
    scanlines(0.35)
    vignette(0.5)


def title_draw():
    background("#07021a")
    floor_grid("#5b2a9e", height * 0.62)
    # The letters arrive one a beat, each with a tear of the picture.
    cell = width * 0.86 / 47
    top = height * 0.36 - cell * 2.5
    block_text("MEGADEMO"[:int(count) + 1].ljust(8), width / 2, top - 2 * u * on_beat * (count > 12), cell, lambda row: SUNSET[row])
    fx.tear.strength = 0.15 + 0.8 * on_beat ** 2 if count < 8 else (count - 28) / 4 if count > 28 else 0.04 + 0.4 * snare
    fx.split.size = 3 if count < 8 else 0.8 + 1.2 * on_beat      # gentle once the mark is showing
    # Then who made it, and with what. The mark is drawn once the picture has stopped tearing.
    if count >= 8:
        picture(logo, width / 2, top / 2 + u, min(top * 0.8, 22 * u))
        for i, words in enumerate(MADE_IN[:2 if count >= 12 else 1]):
            block_text(words, width / 2, top + cell * 7.5 + i * cell * 2.6, min(cell * 0.3, width * 0.94 / (len(words) * 6)), "#ff3ea5" if i else "#7df9ff")


def poster_start():
    """The poster: the name and the mark, kept inside the middle of the picture, where a square tile shows them."""
    starfield(0.4, stars=1.6)
    glow(0.9)
    scanlines(0.3)
    vignette(0.5)


def poster_draw():
    background()
    floor_grid("#5b2a9e", height * 0.7)
    picture(logo, width / 2, height * 0.3, height * 0.44)
    block_text("MEGADEMO", width / 2, height * 0.57, height * 0.9 / 47, lambda row: SUNSET[row])


# ---------------------------------------------------------------- 2. copper bars, a bouncing logo and a scroller
def copper_start():
    copper_bars("rainbow", count=7, size=5 * u)
    # A shader of our own: everything under the water line is the picture above it, upside down and rippling.
    shader("""
    vec4 effect(vec2 uv) {
      if (uv.y < 0.66) return texture(picture, uv);
      float deep = uv.y - 0.66;
      vec2 above = vec2(uv.x + 0.01 * sin(deep * 120.0 - time * 5.0), 0.66 - deep * 1.7);
      return texture(picture, above) * vec4(0.5, 0.75, 1.0, 1.0) * (1.0 - deep * 1.5);
    }""")
    glow(0.5)


def copper_draw():
    water = height * 0.66
    background()                                     # no colour: wipe the picture clear, so the copper bars show
    # The Circuitry mark bounces off the water once every two beats, on a dark plate so that it stays clear.
    size = min(26 * u, water * 0.42)
    high = abs(math.sin(count * math.pi / 2)) * (water - size) * 0.7
    x = width / 2 + width * 0.3 * math.sin(count * 0.35)
    circle(x, water - high - size / 2, size * 0.62, "rgba(0, 0, 20, 0.8)")
    picture(logo, x, water - high - size / 2, size)
    scroller(SCROLL_TEXT, water * 0.1, min(2 * u, width / 48), 3 * u, 48)


# ---------------------------------------------------------------- 3. a plasma in a kaleidoscope
def plasma_start():
    plasma("sunset", speed=0.6)
    fx.fold = kaleidoscope(8)
    fx.turn = hue(0)
    vignette(0.5)


def plasma_draw():
    background()                                     # no colour: wipe the picture clear, so the plasma shows
    fx.fold.segments = [6, 8, 10, 12][bar % 4]
    fx.fold.angle = count * 14
    fx.fold.zoom = 1 + 0.3 * kick
    fx.turn.shift = count * 12
    # A kaleidoscope shows one thin slice, from the middle out to the right: the stars fly out along it.
    for i in range(7):
        far = ((i / 7 + count / 8) % 1) * max(width, height) * 0.6
        star(width / 2 + far * 0.97, height / 2 + far * 0.24, (1.5 + 5 * far / width) * u * (1 + snare), 5, "white", outline="#200040", thickness=0.4 * u)


# ---------------------------------------------------------------- 4. stars, and a tunnel of rings
def tunnel_start():
    starfield(1.5)
    fx.rush = zoom_blur(0.15)
    glow(0.7)


def tunnel_draw():
    background()
    # Fourteen rings, each a little bigger than the one inside it. Two a beat, every ring grows into the place
    # of the next, so they seem to fly past. The far end of the tunnel sways, and the near end stays put.
    sides = [4, 6, 3, 8][int(bar / 2) % 4]
    step = count * 2
    for i in range(14):
        deep = i + (step % 1)
        size = 1.6 * u * 1.42 ** deep
        far = 1 - deep / 14
        ctx.save()
        ctx.translate(width / 2 + far * 16 * u * math.sin(count * 0.5 + deep * 0.3), height / 2 + far * 12 * u * math.cos(count * 0.4 + deep * 0.25))
        ctx.rotate(count * 0.3 + deep * 0.15)
        polygon(0, 0, size, sides, outline=f"hsl({(i - int(step)) * 28}, 100%, {30 + 30 * far + 30 * kick}%)", thickness=size * 0.1)
        ctx.restore()
    fx.rush.strength = 0.1 + 0.3 * kick


# ---------------------------------------------------------------- 5. vectors: a cube and a glass shape
CUBE = [[1 if i & 1 else -1, 1 if i & 2 else -1, 1 if i & 4 else -1] for i in range(8)]
CUBE_EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
GEM = [[1.5, 0, 0], [-1.5, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1.5], [0, 0, -1.5]]
GEM_FACES = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]]


def vectors_start():
    checker_floor("#0e7f8f", dark="#04121a", speed=0.6)
    fx.tube = tunnel(0.5, amount=0)                  # the whole picture as the walls of a tunnel: not yet
    fx.shine = glow(1, radius=30)
    fx.split = rgb_split(0)
    fx.hit = punch(0)                                # a zoom in and out again, for the kick drum


def vectors_draw():
    background()
    solids(width / 2 + width * 0.1 * math.sin(count * math.pi / 8), height * 0.45, 95 * u)
    fx.split.size = 14 * snare
    fx.hit.strength = 0.12 * kick
    # Half way, the floor and the shapes are pulled down a tunnel: they are still being drawn as before, but
    # now as its walls. Each bar it goes round more times, its far end swings in a figure of eight and its
    # depth breathes; the kick punches harder, and the shapes go on turning all the way down.
    down = count - 16                                # beats since the tunnel began
    fx.tube.amount = max(0, min(1, down / 2))
    if down > 0:
        fx.tube.repeat = [2, 3, 4, 6][min(3, int(down / 4))]
        fx.tube.depth = 0.6 + 0.3 * math.sin(down * math.pi / 4)
        fx.tube.x = width / 2 + 16 * u * math.sin(down * math.pi / 4)
        fx.tube.y = height / 2 + 10 * u * math.sin(down * math.pi / 2)
        fx.hit.strength = 0.3 * kick


def solids(x, y, size):
    """The cube and the glass shape, turning, with their middle at x, y."""
    a, b = count * 0.45, count * 0.31

    def flat(p):
        y1, z1 = p[1] * math.cos(a) - p[2] * math.sin(a), p[1] * math.sin(a) + p[2] * math.cos(a)
        x2, z2 = p[0] * math.cos(b) + z1 * math.sin(b), z1 * math.cos(b) - p[0] * math.sin(b)
        near = size / (z2 + 4)                       # far things are drawn smaller: that is all perspective is
        return [x + x2 * near, y + y1 * near]

    # The glass shape: faces you can see through, each adding its light to what is behind it.
    gem = [flat(p) for p in GEM]
    ctx.global_composite_operation = "lighter"
    for n, (i, j, k) in enumerate(GEM_FACES):
        ctx.fill_style = "rgba(255, 60, 160, 0.4)" if n % 2 else "rgba(255, 255, 255, 0.3)"
        ctx.begin_path()
        ctx.move_to(*gem[i])
        ctx.line_to(*gem[j])
        ctx.line_to(*gem[k])
        ctx.fill()
    ctx.global_composite_operation = "source-over"
    cube = [flat(p) for p in CUBE]
    for i, j in CUBE_EDGES:
        line(*cube[i], *cube[j], "#40f0ff", 0.6 * u)


# ---------------------------------------------------------------- 6. an arcade game that plays itself
def arcade_start():
    pixelate(3)
    look("arcade")                                   # a glow and the curved glass of an old screen


def arcade_draw():
    background("#02030c")
    cell = min(width / 100, height / 66)
    step = 12 * cell                                 # from one invader to the next
    left = width / 2 - 3.5 * step + 3 * cell * math.sin(int(count * 2) * 0.8)
    top = height * 0.2
    # One shot a beat, and thirty-two invaders: the last one goes on the last beat. 5 jumps round all of them.
    shots = int(count)

    def place(n):
        return left + ((n * 5) % 8) * step, top + ((n * 5) % 32 // 8) * 8 * cell

    for n in range(shots, 32):
        x, y = place(n)
        block_text("@" if int(count * 2) % 2 else "&", x, y, cell, ["#ff5555", "#ffcc33", "#55ff88", "#55ccff"][(n * 5) % 32 // 8])
    # The ship slides under its next target, fires on the beat, and the shot lands half a beat later.
    target_x, target_y = place(min(shots, 31))
    next_x, _ = place(min(shots + 1, 31))
    part = count % 1
    ship_y = height * 0.82
    block_text("^", target_x if part < 0.5 else target_x + (next_x - target_x) * (part - 0.5) * 2, ship_y, cell, "#7df9ff")
    if part < 0.5:
        rect(target_x - cell / 2, ship_y + (target_y - ship_y) * part * 2, cell, 5 * cell, "white")
    else:
        star(target_x, target_y + 2 * cell, (part - 0.3) * 14 * cell, 8, "white")
    block_text("1UP " + str(shots * 150).rjust(5, "0"), width * 0.24, height * 0.06, cell * 0.9, "white")
    block_text("HI 99990", width * 0.78, height * 0.06, cell * 0.9, "#ff5555")
    if count % 2 < 1:
        block_text("INSERT COIN", width / 2, height * 0.92, cell, "#ffcc33")


# ---------------------------------------------------------------- 7. lava
def lava_start():
    metaballs("lava", speed=0.7, count=9, size=1.6)
    fx.ring = ripple(0, length=90, speed=2)
    glow(0.5)
    vignette(0.7)


def lava_draw():
    background()                                     # nothing is drawn but a few words: the lava is all the graphics card's
    fx.ring.size = 16 * kick
    cell = min(1.2 * u, width / 110)
    ctx.global_alpha = max(0, min(1, count / 4, (32 - count) / 4))
    block_text("AND BREATHE ..." if bar < 4 else "... IT COMES BACK", width / 2, height * 0.85, cell, "#fff6c0")


# ---------------------------------------------------------------- 8. a rotozoom
def rotozoom_start():
    fx.turn = rotozoom(0.5)
    fx.twist = swirl(0)
    fx.rush = zoom_blur(0)
    fx.flip = invert()


def rotozoom_draw():
    # One picture is drawn, four squares with a word across them. The effect turns it, zooms it and repeats it.
    for i in range(4):
        rect(i % 2 * width / 2, i // 2 * height / 2, width / 2, height / 2, f"hsl({[280, 235, 215, 320][i]}, 100%, {28 + 22 * on_beat}%)")
    block_text("MEGA", width / 2, height / 2 - 2.5 * width / 30, width / 30, lambda row: SUNSET[row])
    # The second half bends it more and more, and the drum roll at the end flips black and white.
    fx.turn.zoom = 2 + math.sin(count * math.pi / 4)
    fx.twist.angle = (count - 16) * 14 * math.sin(count * math.pi / 2) if count > 16 else 0
    fx.rush.strength = ((count - 16) / 16) ** 2 * 0.5 if count > 16 else 0
    fx.flip.amount = 1 if count > 24 and (kick > 0.5 or snare > 0.5) else 0


# ---------------------------------------------------------------- 9. the equaliser
def equaliser_start():
    fx.ring = waveform_ring("#7df9ff", strength=0.5 * u)      # the wave of the sound itself, bent into a ring
    mirror("left")                                   # only the left half is drawn: the right is its reflection
    fx.tail = trails(0.3, zoom=1.25)
    glow(0.7)


def equaliser_draw():
    background()
    # Six columns of lights, one for each channel of the song: a column jumps when its channel plays a note.
    # The graphics card draws the ring from the sound it hears; the columns come from reading the song.
    gap = 24 * u
    wide = (width / 2 - gap) / 6.4
    light = height * 0.8 / 16
    for ch in range(6):
        for n in range(round(min(1, levels[ch] * 1.2) * 16)):
            rect(width / 2 - gap - (ch + 1) * wide, height * 0.92 - (n + 1) * light, wide * 0.82, light * 0.72, f"hsl({150 - n * 10}, 100%, 55%)")
    fx.ring.size = (12 + 6 * kick) * u
    fx.tail.zoom = 1.1 + 0.5 * kick


# ---------------------------------------------------------------- 10. greetings
def greetings_start():
    flow(["#00061c", "#082a78", "#5a1a9a", "#001a40"], speed=0.5)
    fx.whirl = spin_blur(0)
    glow(0.6)


def greetings_draw():
    background()
    name = GREETINGS[bar % len(GREETINGS)]
    arrive = min(1, (count % 4) * 2)                 # each name takes half a beat to fly in
    cell = min(width * 0.9 / (len(name) * 6), height / 22) * (3 - 2 * arrive) * (1 + 0.06 * on_beat)
    ctx.global_alpha = arrive
    block_text(name, width / 2, height * 0.48 - cell * 2.5, cell, lambda row: SUNSET[row])
    ctx.global_alpha = 1
    block_text("GREETINGS TO", width / 2, height * 0.12, min(1.4 * u, width / 80), "white")
    scroller("  ...  ".join(GREETINGS), height * 0.8, min(1.8 * u, width / 55), 2 * u, 32)
    fx.whirl.angle = 14 * (1 - arrive) + 5 * snare


# ---------------------------------------------------------------- 11. the finale
# Each of these turns one effect on and gives it back, so that it can be taken away again.
TRICKS = [
    lambda: mirror("four"), lambda: tile(3), lambda: hexagons(16), lambda: kaleidoscope(6),
    lambda: dither("c64", size=4), lambda: edges(3), lambda: swirl(220), lambda: colour_cycle("neon"),
    lambda: dots(10), lambda: fisheye(0.8), lambda: led(9), lambda: wobble(22), lambda: dither("gameboy", size=4), lambda: tunnel(0.6),
    lambda: letters(11), lambda: kaleidoscope(12), lambda: solarize(), lambda: rainbow_edges(3), lambda: zoom_blur(0.5), lambda: pixelate(14),
    lambda: crt(0.35), lambda: mirror("top"), lambda: glitch(0.9), lambda: kaleidoscope(5),
]


def finale_start():
    copper_bars("neon", count=4, size=4 * u, speed=1.5)
    glow(0.8)
    fx.quake = shake(0)
    fx.trick = -1
    fx.guest = None


def finale_draw():
    global flash
    # A new trick every two beats for four bars, then every beat.
    trick = int(count / 2) if count < 16 else 8 + int(count - 16)
    if trick != fx.trick:
        if fx.guest:
            fx.guest.remove()
        fx.guest = TRICKS[trick % len(TRICKS)]()
        fx.trick = trick
        flash = 0.5
    background()
    fx.quake.strength = 4 * u * kick                 # the kick drum shakes the screen
    solids(width / 2, height * 0.42, (85 + 25 * kick) * u)
    block_text("MEGADEMO", width / 2, height * 0.84 - 3 * u * on_beat, width * 0.7 / 47, lambda row: SUNSET[row])


# ---------------------------------------------------------------- 12. the credits
def credits_start():
    starfield(0.12)
    glow(0.5, radius=24)
    grain(0.15)
    vignette(0.6)


def credits_draw():
    background()
    # The mark stays at the top. Under it the words crawl up and away, as at the start of a certain space film:
    # every line comes in at the bottom at full size, and is drawn smaller and higher the further it has gone.
    fade = max(0, min(1, count / 2, (32 - count) / 2))       # the last two beats fade, and the opening cuts in
    ctx.global_alpha = fade
    picture(logo, width / 2, height * 0.14, min(height * 0.2, width * 0.3))
    columns = 26 if width > height else 22           # letters across: few enough to read in a video, or on a phone
    cell = width * 0.9 / (columns * 6)
    lines = [line for words in CREDITS for line in wrap(words, columns) + [""]]
    top = -0.4 * height                              # the point the words head for is above the picture: they are gone, half size, under the mark
    gap = 8 * cell / (height - top)                  # from one line to the next
    gone = count / 30 * ((len(lines) - 2) * gap + 0.33)       # how far away the first line is: the last is well in by beat 30
    for i, words in enumerate(lines):
        away = gone - i * gap                        # 0 at the bottom edge of the picture
        near = 1 / (1 + away) if away > -0.9 else 0  # its size: 1 at the bottom, a half when it is as far away again
        if away < -0.3 or near < 0.5:
            continue
        ctx.global_alpha = fade * min(1, (near - 0.5) / 0.1)
        # A floor leaning away gets narrower by `near`, and its lines get closer together by `near` twice over.
        ctx.save()
        ctx.translate(width / 2, top + (height - top) * near)
        ctx.scale(near, near * near)
        block_text(words, 0, 0, cell, (lambda row: SUNSET[row]) if i == 0 else "#7df9ff" if i == len(lines) - 2 else "#ffd84a")
        ctx.restore()


# ---------------------------------------------------------------- the timeline
# A pattern of the song is four bars (16 beats, 6.86 seconds). Each line: from which pattern of the song,
# the function that turns the part's effects on, and the function that draws it. (In main.js this table is
# at the top; Python wants the functions to be written before they are named.)
TIMELINE = [
    [0, prologue_start, prologue_draw],      # an old computer says what a demo was, then loads this one
    [2, title_start, title_draw],            # the name glitches in, a letter a beat
    [4, copper_start, copper_draw],          # copper bars, a bouncing logo, a sine scroller, all mirrored in water
    [7, plasma_start, plasma_draw],          # a plasma folded by a kaleidoscope
    [9, tunnel_start, tunnel_draw],          # through the stars, down a tunnel of rings
    [11, vectors_start, vectors_draw],       # a cube round a glass shape over a chessboard floor, then all of it pulled down a tunnel
    [13, arcade_start, arcade_draw],         # a game that plays itself on an old arcade screen
    [15, lava_start, lava_draw],             # the music drops away: a lava lamp
    [17, rotozoom_start, rotozoom_draw],     # a rotozoom: one small picture turned, zoomed and repeated
    [19, equaliser_start, equaliser_draw],   # the tune changes key: a column of lights for every channel of the song
    [21, greetings_start, greetings_draw],   # greetings, as every demo has
    [23, finale_start, finale_draw],         # a new trick every two beats, then every beat
    [25, credits_start, credits_draw],       # the credits crawl away into the stars, and round it goes again
]
POSTER = [0, poster_start, poster_draw]          # not in the timeline: P shows it


# ---------------------------------------------------------------- things several parts draw
def floor_grid(colour, top):
    """A floor of lines running away to the horizon at `top`, sliding towards you once a beat."""
    ctx.stroke_style = colour
    ctx.line_width = 0.25 * u
    ctx.begin_path()
    for i in range(-14, 15):
        ctx.move_to(width / 2 + i * 3 * u, top)
        ctx.line_to(width / 2 + i * width * 0.2, height)
    for i in range(10):
        down = top + ((i + (count % 1)) / 10) ** 2 * (height - top)
        ctx.move_to(0, down)
        ctx.line_to(width, down)
    ctx.stroke()


def scroller(words, y, cell, swing, beats):
    """Words that slide across from the right on a sine wave `swing` high, all of them passing in `beats` beats."""
    step = 6 * cell
    start = width - count * step * (len(words) + width / step + 1) / beats
    first = max(0, int(-start / step) - 1)
    for i in range(first, len(words)):
        x = start + i * step
        if x >= width:
            break
        block_text(words[i], x, y + swing * math.sin(count * 2 + i * 0.4), cell, f"hsl({i * 14 + count * 40}, 100%, 65%)")


# ---------------------------------------------------------------- the letters
# Every letter is five rows of five dots. "#" is a dot. Change one and see.
FONT = {
    "A": ".###. #...# ##### #...# #...#", "B": "####. #...# ####. #...# ####.", "C": ".#### #.... #.... #.... .####",
    "D": "####. #...# #...# #...# ####.", "E": "##### #.... ###.. #.... #####", "F": "##### #.... ###.. #.... #....",
    "G": ".#### #.... #..## #...# .####", "H": "#...# #...# ##### #...# #...#", "I": "##### ..#.. ..#.. ..#.. #####",
    "J": "..### ...#. ...#. #..#. .##..", "K": "#...# #..#. ###.. #..#. #...#", "L": "#.... #.... #.... #.... #####",
    "M": "#...# ##.## #.#.# #...# #...#", "N": "#...# ##..# #.#.# #..## #...#", "O": ".###. #...# #...# #...# .###.",
    "P": "####. #...# ####. #.... #....", "Q": ".###. #...# #.#.# #..#. .##.#", "R": "####. #...# ####. #..#. #...#",
    "S": ".#### #.... .###. ....# ####.", "T": "##### ..#.. ..#.. ..#.. ..#..", "U": "#...# #...# #...# #...# .###.",
    "V": "#...# #...# #...# .#.#. ..#..", "W": "#...# #...# #.#.# ##.## #...#", "X": "#...# .#.#. ..#.. .#.#. #...#",
    "Y": "#...# .#.#. ..#.. ..#.. ..#..", "Z": "##### ...#. ..#.. .#... #####", "0": ".###. #..## #.#.# ##..# .###.",
    "1": "..#.. .##.. ..#.. ..#.. .###.", "2": "####. ....# .###. #.... #####", "3": "####. ....# .###. ....# ####.",
    "4": "#..#. #..#. ##### ...#. ...#.", "5": "##### #.... ####. ....# ####.", "6": ".###. #.... ####. #...# .###.",
    "7": "##### ....# ...#. ..#.. ..#..", "8": ".###. #...# .###. #...# .###.", "9": ".###. #...# .#### ....# .###.",
    ".": "..... ..... ..... ..... ..#..", ",": "..... ..... ..... ..#.. .#...", "!": "..#.. ..#.. ..#.. ..... ..#..",
    "?": ".###. ....# ..##. ..... ..#..", "-": "..... ..... .###. ..... .....", "+": "..... ..#.. .###. ..#.. .....",
    ":": "..... ..#.. ..... ..#.. .....", "'": "..#.. ..#.. ..... ..... .....", "/": "....# ...#. ..#.. .#... #....",
    "*": "..#.. #.#.# .###. #.#.# ..#..", '"': ".#.#. .#.#. ..... ..... .....", "_": "..... ..... ..... ..... #####",
    # and three that are not letters: two shapes of an invader, and a ship
    "@": "#...# .###. #.#.# ##### #...#", "&": ".#.#. .###. #.#.# ##### .#.#.", "^": "..#.. ..#.. .###. ##### ##.##",
}
# Where main.js draws a letter dot by dot, Python makes each letter ONCE as shapes the page keeps (a path for
# each of its five rows, and one for the whole letter), because every drawing call Python makes is sent to
# the page: a letter is then one call, not thirteen.
SHAPES = {}


def shapes_of(letter):
    if letter not in SHAPES:
        rows = [js.Path2D() for row in range(5)]
        whole = js.Path2D()
        for row in range(5):
            for column in range(5):
                if FONT[letter][row * 6 + column] == "#":
                    rows[row].rect(column, row, 1.05, 1.05)
                    whole.rect(column, row, 1.05, 1.05)
        SHAPES[letter] = rows, whole
    return SHAPES[letter]


def block_text(words, x, y, cell, colour):
    """Words in the blocky letters, with their middle at x and their top at y. `cell` is the size of one dot."""
    ctx.save()
    ctx.translate(x - (len(words) * 6 - 1) * cell / 2, y)
    ctx.scale(cell, cell)
    if not callable(colour):
        ctx.fill_style = colour
    for letter in words:
        if letter in FONT:
            rows, whole = shapes_of(letter)
            if callable(colour):
                for row in range(5):
                    ctx.fill_style = colour(row)
                    ctx.fill(rows[row])
            else:
                ctx.fill(whole)
        ctx.translate(6, 0)
    ctx.restore()
