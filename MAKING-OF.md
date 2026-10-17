# How the megademo was made

These are notes for someone who has seen the video, knows a little programming, and wants to know how it was done and how to make one. They say what happened, in the order it matters. Where something was not measured or not seen by the person who wrote the demo, it says so.

## 1. What it is

The megademo is a demo in the style of the ones people made on home computers in the 1980s and 1990s. It is one file of JavaScript, `main.js` (612 lines), and the same demo again in Python, `main.py`. An old computer boots, types a few words about what a demo was, and loads it; then twelve parts are cut to a chiptune, from a glitching title to credits that crawl away into the stars. That is thirteen entries in its timeline, and it lasts 3 minutes 5 seconds before it goes round again. It was made in Circuitry Studio with three free libraries: pictures.js draws, synths.js plays the tune, and visualfx.js makes the effects on the graphics card.

Beside the code there are two files: `megademo.json`, the tune, and `circuitry-logo.png`, the Circuitry mark. Everything else you see is drawn by the code.

## 2. The idea that holds it together

Nothing in the demo looks at the clock on the wall. Every cut, flash and bounce is worked out from where the song is.

A tracker song is made of patterns, a pattern of rows, a row of ticks. This tune has 64 rows to a pattern and 4 rows to a beat, so a pattern is 16 beats, 6.86 seconds. The timeline says which part runs from which pattern:

```js
const TIMELINE = [
  [0, prologueStart, prologueDraw],
  [2, titleStart, titleDraw],
  [4, copperStart, copperDraw],
  [7, plasmaStart, plasmaDraw],
  // ... thirteen lines in all
  [25, creditsStart, creditsDraw],
]
```

Each frame the demo asks the song where it is:

```js
const at = music.position        // { order, row, tick, speed, tempo, state, ... }
const heard = at.order * 64 + at.row + at.tick / at.speed
```

The part to show is the last line of the timeline that has begun, taken straight from the song's own pattern number:

```js
const now = TIMELINE.findLast(([from]) => at.order >= from)
if (now !== playing) {           // a cut
  playing = now
  clearEffects()
  now[1]()                       // the part's start function turns its effects on
}
```

Inside a part, everything is a function of `count`, the beats since the part began. A scroller's position is `count` times a speed. A bounce is `Math.abs(Math.sin(count * Math.PI / 2))`. A new card every eight beats is `Math.floor(count / 8)`.

The drums are known in advance. The demo reads `megademo.json` itself, once, and makes a table of which rows have a kick, a snare or a note on them. As the song reaches each row, the table is looked up:

```js
const hit = hits[row]
if (hit.kick) kick = 1           // and kick falls back towards 0 every frame
if (hit.snare) snare = 1
```

So `kick` and `snare` are numbers that jump to 1 on the drum and fall away, and any part can use them: `fx.hit.strength = 0.3 * kick`.

Why this matters: a slow device draws fewer frames, but each frame it draws is the right one for that moment of the music, because the music did not wait. And a video rendered a frame at a time comes out exactly in step, for the same reason (section 7).

## 3. The tune

### What it is

A minor, 140 beats a minute, 27 patterns, six channels, as a tracker tune for a three-voice sound chip stretched a little would have:

| Channel | What it does |
|---|---|
| lead | a pulse wave whose width moves, with vibrato and an echo |
| chords | one voice stepping through a chord's notes fifty times a second, the Commodore 64 trick |
| bass | a pulse that starts an octave high for a fiftieth of a second |
| drums | a kick that falls in pitch, and a snare of noise, then a tone, then noise |
| hats | very short noise |
| second | a quieter voice that harmonises the lead |

It has an intro that builds, a main tune, a second tune, a bouncy one for the arcade part, a breakdown, a build that leans on F sharp to change key to B minor, the tune again a tone higher, a finale, and an outro that comes home through E to loop.

### How it was written

Nobody typed 3,768 note events. A small program, `tools/make-song.mjs` (260 lines), writes `megademo.json` from short lines. A bar of melody is a line:

```js
'/E5:3 A5:3 B5:2 C6:2 B5:2 ~A5:4'
```

`E5:3` is the note E5 for three rows. `/` scoops into a note: it starts a tone low for one row and slides up. `~` glides to a note from the one before without starting a new note. A bar of drums is sixteen letters, one a row:

```js
basic: 'k...s...k.k.s...',      // k a kick, s a snare
```

and the whole song is a table, one line a pattern, naming the chords, the tune and a style for each of the other channels.

The song file itself is the sound library's own format, which is text. A note is one line:

```json
{"row": 0, "ch": 0, "note": "E-4", "ins": 1, "vol": 46}
```

A chord on one channel is the same with the chord's notes, in semitones, and how fast to step through them:

```json
{"row": 0, "ch": 1, "note": "A-3", "ins": 2, "chord": [0, 3, 7], "chordHz": 50}
```

A glide is a tracker effect code on the note, `"fx": "304"`: slide to this note at speed 4. The two sirens are effect 2 (slide down) into the breakdown and effect 1 (slide up) into the finale. The vibrato is the lead instrument's own: it begins a fifth of a second into any held note.

An instrument is a ready-made chip sound with settings changed, and for drums a "step macro": a list of what the voice is fifty times a second. The snare is noise, a square wave at the note, the same four semitones lower, then five steps of noise getting quieter.

### How it was checked without ears

The person who wrote the tune could not hear it. `tools/check-song.mjs` renders the song with the same engine a browser uses, with no loudspeaker, and measures it: the peak, how loud each channel is in each pattern, whether the second time round matches the first, and the lead's pitch a quarter of a row at a time. The pitch measurements showed the marks working:

- a scoop: 200 cents low for a row, then in tune
- a glide from B to A: 183, 141, 87, 48, 6 cents on the way down
- a held note: steady for a row and a half, then wavering 27 cents each way
- the falling siren: 971 cents down in four rows; the rising one: 994 up

### The mix, as it was heard

Measurement did not make it sound right. The owner's ears did, over three rounds.

**Too screechy.** The owner, on an iPad: "a little bit screechy on the ears, what about the lead down an octave", and then: "it's ok to reach up that octave but not all the way through". So the lead's home moved down an octave, and it goes up to the old octave only as a peak: in 16 of its 88 bars, in four parts that never follow each other (the answer phrase of the tune, the end of the second tune, the build, the finale), and always reached by a scoop or a glide. The top end was softened as well: the lead, the chords and the second voice go through a low-pass filter, the chords lost their top note, the hats and chords are quieter.

| | before | after |
|---|---|---|
| energy above 4 kHz, whole song | 3.5% | 0.9% |
| energy above 4 kHz, lead alone | 7.8% | 0.3% |
| middle of the spectrum | 873 Hz | 499 Hz |

**The missing snares.** The owner then said: "we are missing a drum track with snares in the background, if there too quiet". That was not a matter of level. It was a bug in the program that writes the song: a drum bar was read only as far as the NAME of its style was long. The style called `basic` has five letters, so five of its sixteen rows were played; `full` has four, so four. Every part with the `full` beat had no snare at all. Nothing had measured it, because every channel still made sound in every pattern. Fixed, the two patterns of the main tune have 19 loud snare hits where they had 7. The snare was also given a longer, brighter tail.

| snare against everything else, in the 85 ms after each hit | before | after |
|---|---|---|
| all of it | +0.8 dB | +4.6 dB |
| its body, 150 to 300 Hz | +2.4 dB | +9.1 dB |
| its top, 2 to 5 kHz | -0.2 dB | +4.8 dB |

With the drums back, the energy above 4 kHz is 1.9% of the whole.

**The bass.** "The bass is a bit loud now", once the lead was lower. It came down 3 dB and moved to a narrower pulse, which has more second harmonic, because a small loudspeaker cannot play a 110 Hz note and follows a bass by the harmonic above it.

| bass | before | after |
|---|---|---|
| against the lead | +2.2 dB | -1.2 dB |
| against the whole mix | -3.4 dB | -7.0 dB |
| its second harmonic against its fundamental | -4.3 dB | -3.0 dB |

The owner's verdict on that version: "sounds much better, drums are there now". The tune has not changed since. Its peak is 0.927 of full scale with no clipped samples.

The lesson worth keeping: a check that every channel makes sound is not a check that every note is there. Count the notes you meant to write.

## 4. The parts

Each part is two functions. The start function turns effects on, in the order they are applied, never more than four at once. The draw function paints the picture, and sets effect settings from the song. `contact-sheet.jpg` has two frames of every part.

### The opening: an old computer

A Commodore 64's screen: a border, a darker box, "READY.". Three screens of words are typed sixteen letters a beat with a blinking cursor, then `LOAD "MEGADEMO",8,1` and a border full of flickering stripes, as a tape loader had. The words are the owner's, for people too young to remember: "Back in the 1980s and 1990s developers used to make demos like this on computers like the C64 and Amiga. It was a fun and creative artform."

Effects: scanlines and a vignette, nothing more, so the title's arrival is a contrast.

*Worth stealing:* typing is one line. `words.slice(0, Math.floor(beats * 16))`.

### 1. The title

MEGADEMO arrives a letter a beat over a floor of lines running to the horizon. Each letter tears the picture (`glitch`), the colours split (`rgbSplit`), and when the picture has settled the Circuitry mark and "MADE IN CIRCUITRY STUDIO" appear.

*Worth stealing:* an effect's setting is a plain property, so a tear on every beat is `fx.tear.strength = 0.15 + 0.8 * onBeat ** 2`.

### 2. Copper bars

Seven bright bars (`copperBars`, drawn entirely by the graphics card), the Circuitry mark bouncing on a dark plate, and a sine scroller carrying the owner's line about Circuitry Studio. The bottom third of the picture is water: everything above is reflected in it, upside down and rippling.

The water is a shader of the demo's own, seven lines of the graphics card's language, passed to `shader()` as text. For every point below the water line it takes the colour from the mirrored point above, pushed sideways by a sine.

*Worth stealing:* the scroller works out its own speed, so the whole text always passes in the time the part has: `(words.length + width / step + 1) / beats` letters a beat.

### 3. Plasma in a kaleidoscope

A rolling plasma folded by a kaleidoscope whose number of segments changes each bar and which zooms on the kick. Nothing is drawn but a few stars.

*Worth stealing:* a "backdrop" effect is behind what you draw, so wipe the picture clear with `background()` and no colour.

### 4. The rings

Fourteen polygons, each 1.42 times the size of the one inside it. Twice a beat every ring grows into the place of the next, so they seem to fly past for ever. The far end sways and the number of sides changes every two bars.

*Worth stealing:* an endless zoom is a short loop. Only the fraction `(count * 2) % 1` moves.

### 5. The cube, and the tunnel

A wireframe cube round a glass shape, over a chessboard floor (`checkerFloor`). The shapes are eight and six points turned about two axes and drawn with ordinary lines; "far things are drawn smaller" is one division. The glass is eight triangles drawn with the `lighter` blend, so each adds its light to what is behind it.

Half way, the library's `tunnel` effect fades in, and the floor and shapes are pulled down a tunnel while still turning. It wraps round more times each bar and its far end swings in a figure of eight.

This section exists because of a misunderstanding worth recording. The owner said "the tunnel effect only shows for a split second". The rings part was rebuilt as a new fly-through before the owner explained: "not talking about the fly-through tunnel, I'm talking about when it rapidly cycles different fx near the end over the 3D shape; that tunnel could have a few seconds on its own elsewhere." The rings were put back, and the effect he had noticed for one beat in the finale was given these four bars.

*Worth stealing:* an effect has `amount` from 0 to 1, so anything can fade in: `fx.tube.amount = Math.min(1, beats / 2)`.

### 6. The arcade

A game that plays itself on the curved glass of an old screen (`pixelate`, then `look("arcade")`). There are thirty-two invaders and thirty-two beats. The ship slides under its target, fires on the beat, and the shot lands half a beat later.

*Worth stealing:* nothing is remembered. Which invaders are alive is `n >= Math.floor(count)`, so the game is the same every time and at any point you skip to.

### 7. Lava

The music drops away. Blobs that melt together (`metaballs`), a ripple on the kick, a glow, and two lines of words.

### 8. Rotozoom

The scene draws one picture, four coloured squares with a word across them. `rotozoom` turns it, zooms it and repeats it. As the music builds a `swirl` bends it harder, a `zoomBlur` rushes it, and on the drum roll `invert` flips black and white on every hit.

### 9. The equaliser

Six columns of lights, one for each channel of the song, and the wave of the sound bent into a ring (`waveformRing`). Only the left half is drawn; `mirror` makes the right.

The columns do not listen to the sound. They are driven from the song file's rows, like the drums, because the sound library could not report the level of a channel that plays a synth.

### 10. Greetings

Every demo greets its friends. A name flies in each bar over a dark ink backdrop (`flow`), with a spin blur as it lands.

### 11. The finale

The cube again over copper bars, with a different effect turned on every two beats and then every beat: twenty-four in thirty-two beats. The kick shakes the screen.

*Worth stealing:* the list is functions that turn an effect on and hand it back, so the last one can be taken away:

```js
const TRICKS = [() => mirror("four"), () => tile(3), () => hexagons(16), /* ... */]
if (fx.guest) fx.guest.remove()
fx.guest = TRICKS[trick % TRICKS.length]()
```

### 12. The credits

The mark at the top, and the words crawling up and away over a starfield, as at the start of a certain space film. Each line enters at the bottom at full size and is drawn smaller and higher the further it has gone. A floor leaning away gets narrower by a factor, and its lines get closer together by that factor twice over, so each line is drawn with `ctx.scale(near, near * near)`.

## 5. The letters

There is no font file. Every letter is five rows of five dots, written so you can see it:

```js
const FONT = {
  A: ".###. #...# ##### #...# #...#",
  B: "####. #...# ####. #...# ####.",
  // ... 51 in all, two of them invaders and one a ship
}
```

One function draws all the text in the demo. It takes the words, where their middle is, the size of a dot and a colour, and fills a small square for every `#`:

```js
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
```

The colour can be a function of the row, which is how the big letters get five colours from top to bottom.

## 6. Fitting any screen

No size in the demo is a number of pixels. `u` is a hundredth of the picture's smaller side, worked out every frame, and sizes are written in `u` or as fractions of `width` and `height`. Text is sized so that its longest line fits: `width * 0.9 / (columns * 6)`. Long lines are wrapped to fewer letters on a tall screen.

What was looked at, in WebKit (the engine every browser on an iPad uses): 1180 x 820, portrait iPad at 1249 x 1750, 1920 x 1080, 1080 x 1920, a phone at 390 x 760, and the size changing under the opening, the scroller and the credits while they ran.

One thing was missed. The first credits were a stack of lines, one more each bar. On the owner's iPad in portrait the stack ran off the bottom. The owner's words: "it should scroll up, a little bit Star Wars like". A crawl cannot run off the bottom, because that is where it comes from. Its first version put the vanishing line inside the picture, which made the text small in a 16:9 video; the vanishing point is now above the picture, so a line is still three-quarters size at mid-screen.

## 7. Recording it

The video is a render, not a capture of a screen: a recorder steps the page forward one frame at a time, and takes each picture when it is ready, however long it took to draw.

Everything in this section about the recorder, and every figure about the video, comes from the people who built the recorder and measured its output. The writer of the demo did not see the recordings.

### Why the first recording played fast, with no sound

The owner's first recording, of an early version, "plays back very fast, has no sound".

The app's recorder already drew one frame at a time and stamped each picture a sixtieth of a second after the last. But the sound library had no way to be stepped: the song played in real time on the sound card while the frames were being made. The demo takes its time from the song. At 1080p and 60 frames a second the iPad needed longer than a sixtieth of a second to draw, copy and encode a frame, so the song moved on by several frames' worth for every video frame, and the video ran several times too fast. And since nothing could make the sound for one frame, no sound was written into the file at all.

The fix was a sound engine that can be stepped, with no sound card. For each picture the recorder moves the engine on by exactly one frame of time and takes the samples it made. The song's position then moves a sixtieth of a second for every frame, whatever the speed of the device.

A second fault was found on the owner's iPad. Apple's players remove 2,112 samples from the start of every AAC sound track by themselves, and were then applying the file's own trim as well, so the sound was 44 milliseconds early there, though exact in Chrome. The file now carries the marker Apple's own files use, and Apple's decoder and Chrome's read the same samples.

### What changed in the demo

Three things, so that a render is exact:

- **The part is taken straight from the song's position.** At first the demo followed the song with a smoothed clock that chased the reported position by 15% a frame. In a render, where the position is exact for each frame, that chase put cuts a frame late: in the render made before this change, ten of the twelve cuts were one frame late. Now the part comes from `music.position.order` itself, and the drums from the reported row. Only movement uses a running clock, and it is kept between the reported position and three ticks ahead of it. The demo does not need to know it is being recorded.
- **The song is asked for in `setup()`.** A browser keeps a page silent until it is touched, so live, the song waits for the first tap by itself. A recorder has no such lock, so the song starts on frame 0, with nobody tapping.
- **The prompt is held back half a second.** When the very first frame is drawn the song has been asked for but has not yet made a sound, so that one frame showed "TAP TO START". The prompt now appears only if the song is still not playing after half a second.

### The final render

Made from the finished demo untouched (only its random numbers were given a fixed start, so the loading stripes are the same every time):

- 1920 x 1080, 60 frames a second, H.264 pictures with AAC sound, both starting at 0 and lasting 185.150000 seconds: 11,109 frames. One round of the song is 27 patterns of 64 rows at 6 ticks a row and 140 beats a minute, which is 185.14 seconds.
- The first frame is the boot screen with READY and no prompt, and the typing has begun by frame 2.
- All twelve cuts are on the first frame at or after their pattern's first row: frames 823, 1646, 2880, 3703, 4526, 5349, 6172, 6995, 7818, 8640, 9463 and 10286.
- It was rendered twice. The 11,109 pictures and the 8,887,200 samples of sound were identical.

The owner watched the corrected video on the iPad's own player and said it "looks good". It was then uploaded to YouTube, unlisted until the release.

## 8. The Python version

`main.py` is the same demo for Pyctures with its sound and effects libraries: the same timeline, the same constants, the same words, the same song file, written to be read beside `main.js`. Names are spelled Python's way (`rgb_split`, `checker_floor`), and settings are given by name (`glow(1, radius=30)`).

Two things differ on purpose, and the file says where:

- The timeline table comes after the functions it names. JavaScript lets a table at the top of a file name functions written below it; Python does not.
- A letter is made once. In Pyctures every drawing call Python makes is sent to the page, and the credits can have 250 letters of 13 dots each on screen. So each letter is built once as a shape the page keeps (a `Path2D`), and drawing it is one call.

It also does not print a line at each cut as the JavaScript does, because under `pyctures run` a `print()` opens a console over the picture.

Played right through in WebKit, its cuts land at the same times as the JavaScript's to within 0.02 seconds. Python's own work is 0.1 to 2.4 milliseconds a frame, and it held 59 to 60 frames a second in every part.

## 9. What it cost

Milliseconds a frame in WebKit on an M-series Mac, at 1180 x 820 with two real pixels to the point, measured as the time the browser's frame callback ran:

| Part | mean | 95% of frames within |
|---|---|---|
| opening | 3.2 | 4 |
| title | 3.2 | 4 |
| copper bars | 3.0 | 4 |
| plasma | 3.1 | 4 |
| rings | 3.5 | 4 |
| cube and tunnel | 3.0 | 3 |
| arcade | 2.9 | 3 |
| lava | 2.7 | 3 |
| rotozoom | 2.7 | 3 |
| equaliser | 2.7 | 3 |
| greetings | 3.1 | 4 |
| finale | 3.2 | 4 |
| credits | 3.3 | 4 |

A frame at 60 a second has 16.7. Most of those three milliseconds is not the demo: in Safari's engine, handing the drawn picture to the graphics card costs about that much whatever is drawn. In Chromium the same parts cost 0.2 to 0.4 milliseconds. These are a Mac's numbers, not an iPad's. The frame cost was never measured on the iPad itself.

File sizes: `main.js` 33 KB, `main.py` 34 KB, `megademo.json` 221 KB, `circuitry-logo.png` 40 KB.

## 10. Make your own

The smallest demo of this kind is a song, a timeline of two parts, and a start and a draw function for each:

```js
const TIMELINE = [
  [0, calmStart, calmDraw],
  [2, loudStart, loudDraw],
]
let music = null, playing = null, count = 0, fx = {}

function setup() {
  music = playSong("tune.json")          // or a .mod or .xm from a tracker
}

function update(dt) {
  const at = music.position
  if (at.state !== "playing") return
  const now = TIMELINE.findLast(([from]) => at.order >= from)
  if (now !== playing) {
    playing = now
    clearEffects()
    fx = {}
    now[1]()
  }
  count = ((at.order - playing[0]) * 64 + at.row + at.tick / at.speed) / 4
}

function draw() {
  if (playing) playing[2]()
}

function calmStart() { plasma("ocean"); vignette() }
function calmDraw() { background() }

function loudStart() { fx.shine = glow(1) }
function loudDraw() {
  background("black")
  const beat = 1 - (count % 1)           // 1 on each beat, falling to 0
  circle(width / 2, height / 2, 40 + 60 * beat, "gold")
  fx.shine.strength = 0.5 + beat
}
```

That is the whole machine. The megademo adds a smoother clock for movement, the drum table, and a flash on each cut.

What to change first in the megademo itself: the words at the top (`PROLOGUE`, `PITCH`, `DOWNLOAD`, `GREETINGS`, `CREDITS`); two lines of `TIMELINE` swapped; the colours in `SUNSET`; the list of `TRICKS`; a letter in `FONT`; your own picture in place of `circuitry-logo.png`.

Ideas it did not use:

- A fly-through whose walls you draw. One was built and set aside (section 4, part 5): a second shader wraps a flat picture round as a tunnel's walls, so a chessboard, stripes or rows of lights become the tunnel, and the flight is steered from the song.
- A twister, the twisting bar of the old demos. The effects library has one (`twister`); the megademo never gave it a part.
- Words on a tunnel's walls. The wrap mirrors every other copy, which reverses text, so it would need its own shader.
- The sheet music of the tune scrolling by, and on-screen dials: the sibling libraries for both exist and were left out.
- A drawn transition between parts. Every cut is a white flash.
- The effects library has 94 effects. The megademo uses about forty.
- Several scenes in one file, with transitions, arrived in pictures.js while this was being made. The megademo keeps its own timeline table.

## 11. What is not done, and what was not checked

- **By ear.** The tune was judged by ear only by the owner. The person who wrote it measured it and never heard it.
- **On an iPhone.** It has never been run on one. A phone-sized view was looked at in a desktop browser only.
- **On the iPad, by its writer.** The owner ran it there, version after version; the writer saw only desktop WebKit and Chromium. Frame costs on the iPad were never measured.
- **In motion.** The writer checked still frames, a contact sheet of every part, and timings. Whether a movement feels right was the owner's judgement.
- **Chromium, lately.** The full play-through was run in Chromium for the early versions and not again after the tune was softened. In that headless Chromium the audio thread never answered and the song started about 8.6 seconds late on a fallback; that was not seen in WebKit and was not chased.
- **The Python version in the app.** It runs under `pyctures run` on a Mac. It had not been run inside Circuitry Studio when this was written, because the app's Python preview did not yet have the effects.
- **The recording, by its writer.** The writer of the demo never saw a recording. Everything said about the video in section 7 was measured by the people who built the recorder.
- **The sound question.** The demo now begins with one line, `askAboutSound({ wait: false })`, which lays a card over the boot screen: "This demo has sound", play with or without. It came after the video was rendered. Under a recording the card is never shown, by its author's account; the megademo has not been rendered again to prove it.
