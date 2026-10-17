// This demo shows JavaScript drawing graphics in Circuitry Studio.
// The same file runs in a web browser with pictures.js, the free library:
// https://www.circuitry.dev/pictures

// Megademo: a demo in the style of the home-computer demos of the 1980s and 90s. An old computer says in a
// few words what a demo was and loads this one; then twelve parts are cut to a chiptune, from the title to
// the credits, and it goes round again. Every part is two small functions below: one that turns its effects
// on when it starts, and one that draws it. Nothing here looks at the clock on the wall: every cut, flash and
// bounce is worked out from where the song is, so the pictures stay in step with the music.
// Its music is played by synths.js and its effects are made by visualfx.js, the sound and effects libraries
// that come with pictures.js, also free; there is nothing to load.
// It needs two files beside it: megademo.json, the tune (six channels: a lead that glides and scoops, chords
// as fast arpeggios, a bass, drums, hats and a second voice), and circuitry-logo.png, the Circuitry mark.
// Use: it asks whether to play with sound or without; either answer starts the demo. After that a tap, or any key,
// skips to the next part, and the left arrow goes back one. P shows the poster, and P again goes back.
// Try changing: the words in PROLOGUE, PITCH, DOWNLOAD, SCROLL_TEXT, GREETINGS and CREDITS; which part comes
// when (swap the names in two lines of TIMELINE); the colours in SUNSET; the list of TRICKS in the finale;
// "lava" to "neon" in the lava part; circuitry-logo.png for a logo of your own.

// ---------------------------------------------------------------- the timeline
// A pattern of the song is four bars (16 beats, 6.86 seconds). Each line: from which pattern of the song,
// the function that turns the part's effects on, and the function that draws it.
const TIMELINE = [
  [0, prologueStart, prologueDraw],     // an old computer says what a demo was, then loads this one
  [2, titleStart, titleDraw],           // the name glitches in, a letter a beat
  [4, copperStart, copperDraw],         // copper bars, a bouncing logo, a sine scroller, all mirrored in water
  [7, plasmaStart, plasmaDraw],         // a plasma folded by a kaleidoscope
  [9, tunnelStart, tunnelDraw],         // through the stars, down a tunnel of rings
  [11, vectorsStart, vectorsDraw],      // a cube round a glass shape over a chessboard floor, then all of it pulled down a tunnel
  [13, arcadeStart, arcadeDraw],        // a game that plays itself on an old arcade screen
  [15, lavaStart, lavaDraw],            // the music drops away: a lava lamp
  [17, rotozoomStart, rotozoomDraw],    // a rotozoom: one small picture turned, zoomed and repeated
  [19, equaliserStart, equaliserDraw],  // the tune changes key: a column of lights for every channel of the song
  [21, greetingsStart, greetingsDraw],  // greetings, as every demo has
  [23, finaleStart, finaleDraw],        // a new trick every two beats, then every beat
  [25, creditsStart, creditsDraw],      // the credits crawl away into the stars, and round it goes again
]
const POSTER = [0, posterStart, posterDraw]      // not in the timeline: P shows it
// The words. The first three are the owner of Circuitry's own.
// PROLOGUE: what a demo was, for anyone too young to remember. Each screen, and how many beats it stays.
const PROLOGUE = [
  ["BACK IN THE 1980S AND 1990S DEVELOPERS USED TO MAKE DEMOS LIKE THIS ON COMPUTERS LIKE THE C64 AND AMIGA.", 14],
  ["IT WAS A FUN AND CREATIVE ARTFORM.", 6],
  ["WE HAVE RECREATED THIS TYPE OF DEMO IN CIRCUITRY.", 8],
]
const PITCH = "CIRCUITRY STUDIO IS THE FUN IDE WHERE YOU CAN BUILD DEMOS LIKE THIS IN PYTHON OR JAVASCRIPT IN YOUR BREAK, WHILST DOING PROPER CLIENT WORK TOO."
const DOWNLOAD = "DOWNLOAD CIRCUITRY STUDIO TODAY TO GET THIS DEMO AND ITS SOURCE CODE."
// The scroller says both. However long it is, it passes in the time its part has.
const SCROLL_TEXT = "HELLO! " + PITCH + " ... " + DOWNLOAD + " ... CIRCUITRY.DEV"
const MADE_IN = ["MADE IN CIRCUITRY STUDIO", "PICTURES.JS  SYNTHS.JS  VISUALFX.JS"]          // under the name, on the title
const GREETINGS = ["CIRCUITRY STUDIO", "THE C64", "THE AMIGA", "TRACKERS", "SCENERS", "CHIP TUNERS", "CODERS", "AND YOU!"]
const CREDITS = ["MEGADEMO", "MADE IN CIRCUITRY STUDIO", PITCH, "WITH PICTURES.JS, SYNTHS.JS AND VISUALFX.JS", DOWNLOAD, "CIRCUITRY.DEV"]
const SUNSET = ["#fff36b", "#ffb347", "#ff6b6b", "#ff3ea5", "#b03aff"]      // the five rows of a letter, top to bottom
const ROWS_A_PATTERN = 64
const ROWS_A_BEAT = 4

// ---------------------------------------------------------------- where the song is
let tune = null          // megademo.json itself, read to know which rows have a drum on them
let music = null         // the song. It is asked for at once, and the browser holds it until the first tap
let hits = []            // for every row of the whole song: how hard each channel is hit there, and which drum
let rows = 0             // how far into the song we are, in rows (sixteenth notes), with fractions
let seen = -1            // the last row whose drums and notes have been taken
let playing = null       // the line of TIMELINE that is showing
let count = 0            // beats since this part began, with fractions
let bar = 0              // bars since this part began: 0 to 7
let onBeat = 0           // 1 exactly on each beat, falling to 0 before the next
let kick = 0             // 1 when the kick drum hits, falling away
let snare = 0            // the same for the snare
let flash = 0            // a white flash over everything, falling away
let clock = 0            // plain seconds, only for the blink of TAP TO START
let poster = false       // P shows the poster in place of the part
let u = 8                // a hundredth of the picture's smaller side: sizes in u fit a phone and a big screen
let fx = {}              // the effects of the part that is showing, by a name of its own choosing
const levels = [0, 0, 0, 0, 0, 0]      // how loud each channel of the song is just now, from 0 to 1
// A demo asks before it makes a sound. The boot screen carries on behind the card (wait: false).
const sound = askAboutSound({ wait: false })
const logo = loadImage("circuitry-logo.png")      // the Circuitry mark: it draws once it has arrived

async function setup() {
  tune = await loadJSON("megademo.json")
  // The song is read once, so that the picture knows what is on every row before it is played.
  const number = (name) => tune.instruments.findIndex((i) => i.name === name) + 1
  tune.order.forEach((pattern, place) => {
    for (const e of tune.patterns[pattern].events) {
      if (!e.ins) continue
      const hit = hits[place * ROWS_A_PATTERN + e.row] ||= { loud: [0, 0, 0, 0, 0, 0] }
      hit.loud[e.ch] = e.vol / 64
      if (e.ins === number("kick")) hit.kick = true
      if (e.ins === number("snare") && e.vol > 40) hit.snare = true
    }
  })
  listenTo(soundOutput())          // the effects that draw the sound listen to everything that is played
  // The song is started here, not on the tap. A browser keeps a page silent until it is touched, so the
  // song waits for that touch by itself; where nothing has to wait (a video being recorded) it starts at once.
  music = playSong("megademo.json", { volume: 1 })
}

function skip(by) {
  if (!music || music.position.state !== "playing") return        // still loading, or still waiting for the sound to be let on
  const here = TIMELINE.indexOf(playing)
  music.seek(TIMELINE[(here + by + TIMELINE.length) % TIMELINE.length][0])
}

function onMouseDown() { skip(1) }                // the first tap lets the sound on, and the song begins; later ones skip
function onKeyDown(key) {
  if (key === "p" || key === "P") poster = !poster
  else skip(key === "ArrowLeft" ? -1 : 1)
}

function update(dt) {
  if (!tune) return
  clock += dt
  kick = Math.max(0, kick - dt * 5)
  snare = Math.max(0, snare - dt * 5)
  flash = Math.max(0, flash - dt * 4)
  for (let ch = 0; ch < 6; ch++) levels[ch] = Math.max(0, levels[ch] - dt * 2.5)
  let pattern = 0
  if (music && music.position.state === "playing") {
    // The song says where it is in whole ticks (a tick is a sixth of a row). Which part to show, and which
    // drums have hit, are taken from exactly that. For movement the picture runs on smoothly between the
    // song's words, never behind it and never more than three ticks ahead; a skip or the loop is a jump.
    const at = music.position
    const heard = at.order * ROWS_A_PATTERN + at.row + at.tick / at.speed
    rows += dt * ROWS_A_BEAT * at.tempo / 60
    if (Math.abs(heard - rows) > 2) { rows = heard; seen = Math.floor(heard) - 1 }
    rows = Math.min(Math.max(rows, heard), heard + 3 / at.speed)
    pattern = at.order
    // The drums and the notes: every row the song has reached since the last frame is looked up.
    for (seen = Math.max(seen, Math.floor(heard) - 8); seen < Math.floor(heard);) {
      const hit = hits[++seen]
      if (!hit) continue
      if (hit.kick) kick = 1
      if (hit.snare) snare = 1
      for (let ch = 0; ch < 6; ch++) levels[ch] = Math.max(levels[ch], hit.loud[ch])
    }
  }
  // Which part: the last line of the timeline that has begun.
  const now = poster ? POSTER : TIMELINE.findLast(([from]) => pattern >= from)
  if (now !== playing) {
    playing = now
    clearEffects()
    fx = {}
    now[1]()
    flash = 1
    console.log(`megademo: pattern ${pattern}, row ${Math.floor(rows) % ROWS_A_PATTERN}: ${now[1].name.replace("Start", "")}`)
  }
  count = Math.max(0, rows - playing[0] * ROWS_A_PATTERN) / ROWS_A_BEAT
  bar = Math.floor(count / 4)
  onBeat = 1 - (count % 1)
  u = Math.min(width, height) / 100
}

function draw() {
  if (!playing) return background("black")
  ctx.save()
  playing[2]()
  ctx.restore()
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.8
    rect(0, 0, width, height, "white")
    ctx.globalAlpha = 1
  }
}

// ---------------------------------------------------------------- the opening words
function prologueStart() {
  scanlines(0.3)
  vignette(0.5)
}
function prologueDraw() {
  // The screen of a Commodore 64: it waits for a tap, types the words a screen at a time, then loads the demo.
  const waiting = !music || music.position.state !== "playing"
  let words = null, since = count              // which screen of words is showing, and for how many beats it has been
  for (const [screen, beats] of PROLOGUE) {
    if (since < beats) { words = screen; break }
    since -= beats
  }
  const loading = !waiting && !words
  const columns = width > height ? 30 : 20       // letters across: fewer, and so bigger, on a tall phone
  const edge = Math.min(width, height) * 0.09, cell = (width - 2 * edge) / columns / 6
  background("#6c5eb5")
  if (loading) {
    // While a tape loaded, the border filled with stripes of colour. Each frame they are somewhere else.
    for (let y = 0; y < height; y += 3 * u) rect(0, y + random() * 2 * u, width, 2 * u, pick(["#352879", "#b8c76f", "#9a6759", "#ffffff", "#000000"]))
  }
  rect(edge, edge, width - 2 * edge, height - 2 * edge, "#352879")
  const lines = ["CIRCUITRY STUDIO 64", "38911 BYTES FREE", "", "READY."]
  if (loading) lines.push("LOAD \"MEGADEMO\",8,1", "", "LOADING" + "...".slice(0, Math.floor(count) % 4))
  if (!waiting && !loading) {
    // Sixteen letters a beat are typed, and a cursor blinks after the last of them.
    let typed = Math.floor(since * 16)
    lines.push("")
    for (const line of wrap(words, columns - 1)) {
      if (typed <= 0) break
      lines.push(line.slice(0, typed))
      typed -= line.length + 1
    }
    if (count % 1 < 0.5) lines[lines.length - 1] += "_"
  }
  lines.forEach((line, i) => blockText(line.padEnd(columns), width / 2, edge + cell * 4 + i * cell * 8, cell, "#c8c0ff"))
  // The prompt waits half a second: where the song can start by itself (a video being recorded) it has by then.
  if (waiting && !sound.asking && clock > 0.5 && clock % 1 < 0.6) blockText("TAP TO START", width / 2, height * 0.62, cell * 1.6, "white")
}

/** Words cut into lines of no more than so many letters, breaking at the spaces. */
function wrap(words, columns) {
  const lines = [""]
  for (const word of words.split(" ")) {
    const last = lines[lines.length - 1]
    if (last && (last + " " + word).length > columns) lines.push(word)
    else lines[lines.length - 1] = last ? last + " " + word : word
  }
  return lines
}

// ---------------------------------------------------------------- 1. the title
function titleStart() {
  fx.tear = glitch(0.1)
  fx.split = rgbSplit(2)
  scanlines(0.35)
  vignette(0.5)
}
function titleDraw() {
  background("#07021a")
  floorGrid("#5b2a9e", height * 0.62)
  // The letters arrive one a beat, each with a tear of the picture.
  const cell = width * 0.86 / 47
  const top = height * 0.36 - cell * 2.5
  blockText("MEGADEMO".slice(0, Math.floor(count) + 1).padEnd(8), width / 2, top - 2 * u * onBeat * (count > 12), cell, (row) => SUNSET[row])
  fx.tear.strength = count < 8 ? 0.15 + 0.8 * onBeat ** 2 : count > 28 ? (count - 28) / 4 : 0.04 + 0.4 * snare
  fx.split.size = count < 8 ? 3 : 0.8 + 1.2 * onBeat      // gentle once the mark is showing
  // Then who made it, and with what. The mark is drawn once the picture has stopped tearing.
  if (count >= 8) {
    picture(logo, width / 2, top / 2 + u, Math.min(top * 0.8, 22 * u))
    MADE_IN.slice(0, count >= 12 ? 2 : 1).forEach((words, i) => {
      blockText(words, width / 2, top + cell * 7.5 + i * cell * 2.6, Math.min(cell * 0.3, width * 0.94 / (words.length * 6)), i ? "#ff3ea5" : "#7df9ff")
    })
  }
}

/** The poster: the name and the mark, kept inside the middle of the picture, where a square tile shows them. */
function posterStart() {
  starfield(0.4, { stars: 1.6 })
  glow(0.9)
  scanlines(0.3)
  vignette(0.5)
}
function posterDraw() {
  background()
  floorGrid("#5b2a9e", height * 0.7)
  picture(logo, width / 2, height * 0.3, height * 0.44)
  blockText("MEGADEMO", width / 2, height * 0.57, height * 0.9 / 47, (row) => SUNSET[row])
}

// ---------------------------------------------------------------- 2. copper bars, a bouncing logo and a scroller
function copperStart() {
  copperBars("rainbow", { count: 7, size: 5 * u })
  // A shader of our own: everything under the water line is the picture above it, upside down and rippling.
  shader(`
    vec4 effect(vec2 uv) {
      if (uv.y < 0.66) return texture(picture, uv);
      float deep = uv.y - 0.66;
      vec2 above = vec2(uv.x + 0.01 * sin(deep * 120.0 - time * 5.0), 0.66 - deep * 1.7);
      return texture(picture, above) * vec4(0.5, 0.75, 1.0, 1.0) * (1.0 - deep * 1.5);
    }`)
  glow(0.5)
}
function copperDraw() {
  const water = height * 0.66
  background()                                   // no colour: wipe the picture clear, so the copper bars show
  // The Circuitry mark bounces off the water once every two beats, on a dark plate so that it stays clear.
  const size = Math.min(26 * u, water * 0.42)
  const high = Math.abs(Math.sin(count * Math.PI / 2)) * (water - size) * 0.7
  const x = width / 2 + width * 0.3 * Math.sin(count * 0.35)
  circle(x, water - high - size / 2, size * 0.62, "rgba(0, 0, 20, 0.8)")
  picture(logo, x, water - high - size / 2, size)
  scroller(SCROLL_TEXT, water * 0.1, Math.min(2 * u, width / 48), 3 * u, 48)
}

// ---------------------------------------------------------------- 3. a plasma in a kaleidoscope
function plasmaStart() {
  plasma("sunset", { speed: 0.6 })
  fx.fold = kaleidoscope(8)
  fx.turn = hue(0)
  vignette(0.5)
}
function plasmaDraw() {
  background()                                   // no colour: wipe the picture clear, so the plasma shows
  fx.fold.segments = [6, 8, 10, 12][bar % 4]
  fx.fold.angle = count * 14
  fx.fold.zoom = 1 + 0.3 * kick
  fx.turn.shift = count * 12
  // A kaleidoscope shows one thin slice, from the middle out to the right: the stars fly out along it.
  for (let i = 0; i < 7; i++) {
    const far = ((i / 7 + count / 8) % 1) * Math.max(width, height) * 0.6
    star(width / 2 + far * 0.97, height / 2 + far * 0.24, (1.5 + 5 * far / width) * u * (1 + snare), 5, "white", { outline: "#200040", thickness: 0.4 * u })
  }
}

// ---------------------------------------------------------------- 4. stars, and a tunnel of rings
function tunnelStart() {
  starfield(1.5)
  fx.rush = zoomBlur(0.15)
  glow(0.7)
}
function tunnelDraw() {
  background()
  // Fourteen rings, each a little bigger than the one inside it. Two a beat, every ring grows into the place
  // of the next, so they seem to fly past. The far end of the tunnel sways, and the near end stays put.
  const sides = [4, 6, 3, 8][Math.floor(bar / 2) % 4]
  const step = count * 2
  for (let i = 0; i < 14; i++) {
    const deep = i + (step % 1)
    const size = 1.6 * u * 1.42 ** deep
    const far = 1 - deep / 14
    ctx.save()
    ctx.translate(width / 2 + far * 16 * u * Math.sin(count * 0.5 + deep * 0.3), height / 2 + far * 12 * u * Math.cos(count * 0.4 + deep * 0.25))
    ctx.rotate(count * 0.3 + deep * 0.15)
    polygon(0, 0, size, sides, { outline: `hsl(${(i - Math.floor(step)) * 28}, 100%, ${30 + 30 * far + 30 * kick}%)`, thickness: size * 0.1 })
    ctx.restore()
  }
  fx.rush.strength = 0.1 + 0.3 * kick
}

// ---------------------------------------------------------------- 5. vectors: a cube and a glass shape
const CUBE = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1])
const CUBE_EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
const GEM = [[1.5, 0, 0], [-1.5, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1.5], [0, 0, -1.5]]
const GEM_FACES = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]]

function vectorsStart() {
  checkerFloor("#0e7f8f", { dark: "#04121a", speed: 0.6 })
  fx.tube = tunnel(0.5, { amount: 0 })           // the whole picture as the walls of a tunnel: not yet
  fx.shine = glow(1, { radius: 30 })
  fx.split = rgbSplit(0)
  fx.hit = punch(0)                              // a zoom in and out again, for the kick drum
}
function vectorsDraw() {
  background()
  solids(width / 2 + width * 0.1 * Math.sin(count * Math.PI / 8), height * 0.45, 95 * u)
  fx.split.size = 14 * snare
  fx.hit.strength = 0.12 * kick
  // Half way, the floor and the shapes are pulled down a tunnel: they are still being drawn as before, but
  // now as its walls. Each bar it goes round more times, its far end swings in a figure of eight and its
  // depth breathes; the kick punches harder, and the shapes go on turning all the way down.
  const down = count - 16                        // beats since the tunnel began
  fx.tube.amount = Math.max(0, Math.min(1, down / 2))
  if (down > 0) {
    fx.tube.repeat = [2, 3, 4, 6][Math.min(3, Math.floor(down / 4))]
    fx.tube.depth = 0.6 + 0.3 * Math.sin(down * Math.PI / 4)
    fx.tube.x = width / 2 + 16 * u * Math.sin(down * Math.PI / 4)
    fx.tube.y = height / 2 + 10 * u * Math.sin(down * Math.PI / 2)
    fx.hit.strength = 0.3 * kick
  }
}

/** The cube and the glass shape, turning, with their middle at x, y. */
function solids(x, y, size) {
  const a = count * 0.45, b = count * 0.31
  const flat = (p) => {
    const y1 = p[1] * Math.cos(a) - p[2] * Math.sin(a), z1 = p[1] * Math.sin(a) + p[2] * Math.cos(a)
    const x2 = p[0] * Math.cos(b) + z1 * Math.sin(b), z2 = z1 * Math.cos(b) - p[0] * Math.sin(b)
    const near = size / (z2 + 4)                 // far things are drawn smaller: that is all perspective is
    return [x + x2 * near, y + y1 * near]
  }
  // The glass shape: faces you can see through, each adding its light to what is behind it.
  const gem = GEM.map(flat)
  ctx.globalCompositeOperation = "lighter"
  GEM_FACES.forEach(([i, j, k], n) => {
    ctx.fillStyle = n % 2 ? "rgba(255, 60, 160, 0.4)" : "rgba(255, 255, 255, 0.3)"
    ctx.beginPath()
    ctx.moveTo(...gem[i])
    ctx.lineTo(...gem[j])
    ctx.lineTo(...gem[k])
    ctx.fill()
  })
  ctx.globalCompositeOperation = "source-over"
  const cube = CUBE.map(flat)
  for (const [i, j] of CUBE_EDGES) line(...cube[i], ...cube[j], "#40f0ff", 0.6 * u)
}

// ---------------------------------------------------------------- 6. an arcade game that plays itself
function arcadeStart() {
  pixelate(3)
  look("arcade")                                 // a glow and the curved glass of an old screen
}
function arcadeDraw() {
  background("#02030c")
  const cell = Math.min(width / 100, height / 66)
  const step = 12 * cell                         // from one invader to the next
  const left = width / 2 - 3.5 * step + 3 * cell * Math.sin(Math.floor(count * 2) * 0.8)
  const top = height * 0.2
  // One shot a beat, and thirty-two invaders: the last one goes on the last beat. 5 jumps round all of them.
  const shots = Math.floor(count)
  const place = (n) => [left + ((n * 5) % 8) * step, top + (Math.floor((n * 5) % 32 / 8)) * 8 * cell]
  for (let n = shots; n < 32; n++) {
    const [x, y] = place(n)
    blockText(Math.floor(count * 2) % 2 ? "@" : "&", x, y, cell, ["#ff5555", "#ffcc33", "#55ff88", "#55ccff"][Math.floor((n * 5) % 32 / 8)])
  }
  // The ship slides under its next target, fires on the beat, and the shot lands half a beat later.
  const [targetX, targetY] = place(Math.min(shots, 31))
  const [nextX] = place(Math.min(shots + 1, 31))
  const part = count % 1
  const shipY = height * 0.82
  blockText("^", part < 0.5 ? targetX : targetX + (nextX - targetX) * (part - 0.5) * 2, shipY, cell, "#7df9ff")
  if (part < 0.5) rect(targetX - cell / 2, shipY + (targetY - shipY) * part * 2, cell, 5 * cell, "white")
  else star(targetX, targetY + 2 * cell, (part - 0.3) * 14 * cell, 8, "white")
  blockText("1UP " + String(shots * 150).padStart(5, "0"), width * 0.24, height * 0.06, cell * 0.9, "white")
  blockText("HI 99990", width * 0.78, height * 0.06, cell * 0.9, "#ff5555")
  if (count % 2 < 1) blockText("INSERT COIN", width / 2, height * 0.92, cell, "#ffcc33")
}

// ---------------------------------------------------------------- 7. lava
function lavaStart() {
  metaballs("lava", { speed: 0.7, count: 9, size: 1.6 })
  fx.ring = ripple(0, { length: 90, speed: 2 })
  glow(0.5)
  vignette(0.7)
}
function lavaDraw() {
  background()                                   // nothing is drawn but a few words: the lava is all the graphics card's
  fx.ring.size = 16 * kick
  const cell = Math.min(1.2 * u, width / 110)
  ctx.globalAlpha = Math.min(1, count / 4, (32 - count) / 4)
  blockText(bar < 4 ? "AND BREATHE ..." : "... IT COMES BACK", width / 2, height * 0.85, cell, "#fff6c0")
}

// ---------------------------------------------------------------- 8. a rotozoom
function rotozoomStart() {
  fx.turn = rotozoom(0.5)
  fx.twist = swirl(0)
  fx.rush = zoomBlur(0)
  fx.flip = invert()
}
function rotozoomDraw() {
  // One picture is drawn, four squares with a word across them. The effect turns it, zooms it and repeats it.
  for (let i = 0; i < 4; i++) rect(i % 2 * width / 2, Math.floor(i / 2) * height / 2, width / 2, height / 2, `hsl(${[280, 235, 215, 320][i]}, 100%, ${28 + 22 * onBeat}%)`)
  blockText("MEGA", width / 2, height / 2 - 2.5 * width / 30, width / 30, (row) => SUNSET[row])
  // The second half bends it more and more, and the drum roll at the end flips black and white.
  fx.turn.zoom = 2 + Math.sin(count * Math.PI / 4)
  fx.twist.angle = count > 16 ? (count - 16) * 14 * Math.sin(count * Math.PI / 2) : 0
  fx.rush.strength = count > 16 ? ((count - 16) / 16) ** 2 * 0.5 : 0
  fx.flip.amount = count > 24 && (kick > 0.5 || snare > 0.5) ? 1 : 0
}

// ---------------------------------------------------------------- 9. the equaliser
function equaliserStart() {
  fx.ring = waveformRing("#7df9ff", { strength: 0.5 * u })      // the wave of the sound itself, bent into a ring
  mirror("left")                                 // only the left half is drawn: the right is its reflection
  fx.tail = trails(0.3, { zoom: 1.25 })
  glow(0.7)
}
function equaliserDraw() {
  background()
  // Six columns of lights, one for each channel of the song: a column jumps when its channel plays a note.
  // The graphics card draws the ring from the sound it hears; the columns come from reading the song.
  const gap = 24 * u, wide = (width / 2 - gap) / 6.4, light = height * 0.8 / 16
  for (let ch = 0; ch < 6; ch++) {
    for (let n = 0; n < Math.round(Math.min(1, levels[ch] * 1.2) * 16); n++) {
      rect(width / 2 - gap - (ch + 1) * wide, height * 0.92 - (n + 1) * light, wide * 0.82, light * 0.72, `hsl(${150 - n * 10}, 100%, 55%)`)
    }
  }
  fx.ring.size = (12 + 6 * kick) * u
  fx.tail.zoom = 1.1 + 0.5 * kick
}

// ---------------------------------------------------------------- 10. greetings
function greetingsStart() {
  flow(["#00061c", "#082a78", "#5a1a9a", "#001a40"], { speed: 0.5 })
  fx.whirl = spinBlur(0)
  glow(0.6)
}
function greetingsDraw() {
  background()
  const name = GREETINGS[bar % GREETINGS.length]
  const arrive = Math.min(1, (count % 4) * 2)     // each name takes half a beat to fly in
  const cell = Math.min(width * 0.9 / (name.length * 6), height / 22) * (3 - 2 * arrive) * (1 + 0.06 * onBeat)
  ctx.globalAlpha = arrive
  blockText(name, width / 2, height * 0.48 - cell * 2.5, cell, (row) => SUNSET[row])
  ctx.globalAlpha = 1
  blockText("GREETINGS TO", width / 2, height * 0.12, Math.min(1.4 * u, width / 80), "white")
  scroller(GREETINGS.join("  ...  "), height * 0.8, Math.min(1.8 * u, width / 55), 2 * u, 32)
  fx.whirl.angle = 14 * (1 - arrive) + 5 * snare
}

// ---------------------------------------------------------------- 11. the finale
// Each of these turns one effect on and gives it back, so that it can be taken away again.
const TRICKS = [
  () => mirror("four"), () => tile(3), () => hexagons(16), () => kaleidoscope(6),
  () => dither("c64", { size: 4 }), () => edges(3), () => swirl(220), () => colourCycle("neon"),
  () => dots(10), () => fisheye(0.8), () => led(9), () => wobble(22), () => dither("gameboy", { size: 4 }), () => tunnel(0.6),
  () => letters(11), () => kaleidoscope(12), () => solarize(), () => rainbowEdges(3), () => zoomBlur(0.5), () => pixelate(14),
  () => crt(0.35), () => mirror("top"), () => glitch(0.9), () => kaleidoscope(5),
]
function finaleStart() {
  copperBars("neon", { count: 4, size: 4 * u, speed: 1.5 })
  glow(0.8)
  fx.quake = shake(0)
  fx.trick = -1
}
function finaleDraw() {
  // A new trick every two beats for four bars, then every beat.
  const trick = count < 16 ? Math.floor(count / 2) : 8 + Math.floor(count - 16)
  if (trick !== fx.trick) {
    if (fx.guest) fx.guest.remove()
    fx.guest = TRICKS[trick % TRICKS.length]()
    fx.trick = trick
    flash = 0.5
  }
  background()
  fx.quake.strength = 4 * u * kick               // the kick drum shakes the screen
  solids(width / 2, height * 0.42, (85 + 25 * kick) * u)
  blockText("MEGADEMO", width / 2, height * 0.84 - 3 * u * onBeat, width * 0.7 / 47, (row) => SUNSET[row])
}

// ---------------------------------------------------------------- 12. the credits
function creditsStart() {
  starfield(0.12)
  glow(0.5, { radius: 24 })
  grain(0.15)
  vignette(0.6)
}
function creditsDraw() {
  background()
  // The mark stays at the top. Under it the words crawl up and away, as at the start of a certain space film:
  // every line comes in at the bottom at full size, and is drawn smaller and higher the further it has gone.
  const fade = Math.min(1, count / 2, (32 - count) / 2)      // the last two beats fade, and the opening cuts in
  ctx.globalAlpha = fade
  picture(logo, width / 2, height * 0.14, Math.min(height * 0.2, width * 0.3))
  const columns = width > height ? 26 : 22       // letters across: few enough to read in a video, or on a phone
  const cell = width * 0.9 / (columns * 6)
  const lines = CREDITS.flatMap((words) => [...wrap(words, columns), ""])
  const top = -0.4 * height                      // the point the words head for is above the picture: they are gone, half size, under the mark
  const gap = 8 * cell / (height - top)          // from one line to the next
  const gone = count / 30 * ((lines.length - 2) * gap + 0.33)      // how far away the first line is: the last is well in by beat 30
  lines.forEach((line, i) => {
    const away = gone - i * gap                  // 0 at the bottom edge of the picture
    const near = 1 / (1 + away)                  // its size: 1 at the bottom, a half when it is as far away again
    if (away < -0.3 || near < 0.5) return
    ctx.globalAlpha = fade * Math.min(1, (near - 0.5) / 0.1)
    // A floor leaning away gets narrower by `near`, and its lines get closer together by `near` twice over.
    ctx.save()
    ctx.translate(width / 2, top + (height - top) * near)
    ctx.scale(near, near * near)
    blockText(line, 0, 0, cell, i === 0 ? (row) => SUNSET[row] : i === lines.length - 2 ? "#7df9ff" : "#ffd84a")
    ctx.restore()
  })
}

// ---------------------------------------------------------------- things several parts draw
/** A floor of lines running away to the horizon at `top`, sliding towards you once a beat. */
function floorGrid(colour, top) {
  ctx.strokeStyle = colour
  ctx.lineWidth = 0.25 * u
  ctx.beginPath()
  for (let i = -14; i <= 14; i++) {
    ctx.moveTo(width / 2 + i * 3 * u, top)
    ctx.lineTo(width / 2 + i * width * 0.2, height)
  }
  for (let i = 0; i < 10; i++) {
    const down = top + ((i + (count % 1)) / 10) ** 2 * (height - top)
    ctx.moveTo(0, down)
    ctx.lineTo(width, down)
  }
  ctx.stroke()
}

/** Words that slide across from the right on a sine wave `swing` high, all of them passing in `beats` beats. */
function scroller(words, y, cell, swing, beats) {
  const step = 6 * cell
  const start = width - count * step * (words.length + width / step + 1) / beats
  for (let i = Math.max(0, Math.floor(-start / step) - 1); i < words.length && start + i * step < width; i++) {
    const x = start + i * step
    blockText(words[i], x, y + swing * Math.sin(count * 2 + i * 0.4), cell, `hsl(${i * 14 + count * 40}, 100%, 65%)`)
  }
}

// ---------------------------------------------------------------- the letters
// Every letter is five rows of five dots. "#" is a dot. Change one and see.
const FONT = {
  A: ".###. #...# ##### #...# #...#", B: "####. #...# ####. #...# ####.", C: ".#### #.... #.... #.... .####",
  D: "####. #...# #...# #...# ####.", E: "##### #.... ###.. #.... #####", F: "##### #.... ###.. #.... #....",
  G: ".#### #.... #..## #...# .####", H: "#...# #...# ##### #...# #...#", I: "##### ..#.. ..#.. ..#.. #####",
  J: "..### ...#. ...#. #..#. .##..", K: "#...# #..#. ###.. #..#. #...#", L: "#.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #...# #...#", N: "#...# ##..# #.#.# #..## #...#", O: ".###. #...# #...# #...# .###.",
  P: "####. #...# ####. #.... #....", Q: ".###. #...# #.#.# #..#. .##.#", R: "####. #...# ####. #..#. #...#",
  S: ".#### #.... .###. ....# ####.", T: "##### ..#.. ..#.. ..#.. ..#..", U: "#...# #...# #...# #...# .###.",
  V: "#...# #...# #...# .#.#. ..#..", W: "#...# #...# #.#.# ##.## #...#", X: "#...# .#.#. ..#.. .#.#. #...#",
  Y: "#...# .#.#. ..#.. ..#.. ..#..", Z: "##### ...#. ..#.. .#... #####", 0: ".###. #..## #.#.# ##..# .###.",
  1: "..#.. .##.. ..#.. ..#.. .###.", 2: "####. ....# .###. #.... #####", 3: "####. ....# .###. ....# ####.",
  4: "#..#. #..#. ##### ...#. ...#.", 5: "##### #.... ####. ....# ####.", 6: ".###. #.... ####. #...# .###.",
  7: "##### ....# ...#. ..#.. ..#..", 8: ".###. #...# .###. #...# .###.", 9: ".###. #...# .#### ....# .###.",
  ".": "..... ..... ..... ..... ..#..", ",": "..... ..... ..... ..#.. .#...", "!": "..#.. ..#.. ..#.. ..... ..#..",
  "?": ".###. ....# ..##. ..... ..#..", "-": "..... ..... .###. ..... .....", "+": "..... ..#.. .###. ..#.. .....",
  ":": "..... ..#.. ..... ..#.. .....", "'": "..#.. ..#.. ..... ..... .....", "/": "....# ...#. ..#.. .#... #....",
  "*": "..#.. #.#.# .###. #.#.# ..#..", '"': ".#.#. .#.#. ..... ..... .....", "_": "..... ..... ..... ..... #####",
  // and three that are not letters: two shapes of an invader, and a ship
  "@": "#...# .###. #.#.# ##### #...#", "&": ".#.#. .###. #.#.# ##### .#.#.", "^": "..#.. ..#.. .###. ##### ##.##",
}

/** Words in the blocky letters, with their middle at x and their top at y. `cell` is the size of one dot. */
function blockText(words, x, y, cell, colour) {
  let left = x - (words.length * 6 - 1) * cell / 2
  for (const letter of words) {
    const dots = FONT[letter]
    for (let row = 0; dots && row < 5; row++) {
      ctx.fillStyle = typeof colour === "function" ? colour(row) : colour
      for (let column = 0; column < 5; column++) {
        if (dots[row * 6 + column] === "#") ctx.fillRect(left + column * cell, y + row * cell, cell * 1.05, cell * 1.05)
      }
    }
    left += 6 * cell
  }
}
