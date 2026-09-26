---
name: add-playable-suit
description: Add (or rework) a playable mobile suit in this voxel Dynasty Warriors: Gundam game, from studying gameplay footage to model, moveset, sounds, UI, co-op, testing, balance and deploy. Use when asked to add a character/suit/unit, port a moveset from a video, or tune an existing suit.
---

# Adding a playable suit

The Gundam (`gundam.js`), Guncannon (`guncannon.js`) and Ball (`ball.js`) were all built this way. Read the one closest
to the new suit first: the Guncannon for a humanoid with guns and grabs, the Ball for anything not built like a person.

## Checklist (every file a suit touches)

| Piece | Where |
| --- | --- |
| Voxel model `xxxDef()` (+ weapons) | `src/models/<id>.js` for new suits (`import { pal } from './suits.js'` and build with `new VoxelModel(pal)`; the older suits live in `suits.js`) |
| Moveset `XX_MOVES`, `XX_STANCE` | `src/game/xxx_moves.js` |
| Suit class (extends `Hero`) + config object | `src/game/xxx.js` |
| Roster entry (select card, spec sheet, combo guide), with `cfg` (the suit config) | `src/game/roster.js` |
| Sounds | `src/audio/sfx.js` (recipes), `src/audio/audio.js` (`REV` reverb send, `FALLBACK` live stand-in) |
| Pilot portrait | `src/ui/portraits.js` `ART` (16x16) or `assets/portraits/manifest.json` sheet |
| Unit render for cards / HUD | `assets/units/<id>.png` + `UNITS` in `src/ui/units.js` + `assets/units/README.md` |
| Radio lines for the pilot | `LINES` in `src/game/stage.js` |
| Title text, docs | `index.html` (meta description, mission-desc, combo-guide), `README.md` (intro, co-op list, suit section, how-it's-built, credits) |
| Dev tools | nothing to do: `tools/poses.html?suit=<id>` and `tools/viewer.html?only=<id>` read the model and moves from the roster's `cfg` |

Co-op, the select screens, the HUD and the combo guide all key off the roster entry, so nothing else needs touching.

## 1. Study the footage

The user usually links a "ALL MOVES" video. Downloading the linked video is authorized by the request, and so are G Generation
sprite sheets for portraits and unit cards (see step 7).

```bash
cd <scratchpad>/<suit> && yt-dlp --no-playlist -F "<url>"          # pick a 720p60 mp4 (298) + m4a (140)
yt-dlp --no-playlist -q -f 298 -o video.mp4 "<url>"; yt-dlp --no-playlist -q -f 140 -o audio.m4a "<url>"
mkdir -p sheets && ffmpeg -loglevel error -i video.mp4 -vf "fps=4,scale=400:-1,tile=4x4" sheets/s%02d.png   # 4 s per sheet
```

- This ffmpeg has no `drawtext`: label nothing, compute times from the tile index (fps x position).
- Map segments from the on-screen captions ("Basic Combo", "Charge 2", "Dash Charge", "Musou"...), then cut a close-up
  sheet per segment: `-ss <t> -t <dur> -vf "fps=10,crop=640:500:320:80,scale=320:250,tile=6x5"`.
- Crop the select screen's spec sheet at full size: MELEE, SHOT, DEFENSE, ARMOR, MOBILITY, THRUSTER, burst type and
  equipment go straight into the roster entry.
- Reborn "ALL MOVES" videos usually skip C3-C6 and jump attacks. Invent those from the suit's own tools, in the spirit
  of the ones shown, and say so in the moves file header.
- Reach: measure swing arcs in suit heights (H ~ 3.4 units for the Gundam). Normal blows land ~5-5.8 units out (the
  effect reaches past the limb), spins 5-6, shells ~2.6-4 across, big slams 7-7.5.

### Audio

The battle music runs under everything, and its kick (every ~0.43 s) swamps plain onset detection. Take transients
from the band above 600 Hz relative to a 1 s running median, then look at the excess spectrum around them (numpy
only: there's no scipy):

```python
# x: mono float samples at sr (ffmpeg -i audio.m4a -ac 1 -ar 22050 a.wav)
N=4096; f=np.fft.rfftfreq(N,1/sr)
spec=lambda t: np.abs(np.fft.rfft(x[int(t*sr):int(t*sr)+N]*np.hanning(N)))**2
excess=lambda ts: sum(np.clip(spec(t)-(spec(t-.25)+spec(t-.35))/2,0,None) for t in ts)/len(ts)
# then: the top peaks per band (<300, 300-1500, 1.5-6k) and each band's share of the total
```

Write the numbers into the sfx comment ("claw blows are a 55-170 Hz body with a clank ringing near 1 kHz...") and
build recipes to match.

## 2. The model

`VoxelModel` API: `box`, `sbox` (symmetric in x), `ellipsoid`, `set`, `clearBox`, `paint`, `mirrorX`, `flipX`,
`clone`, and `recolor`. Colors are hex values; `{ glow, jitter }` opts make emissive voxels. Conventions:

- Characters face +Z, and their right side is -X. Each part is authored around its own pivot at the origin; `scale: 0.1`.
- Rig parts (`src/core/rig.js`): `hips torso head uArmL fArmL uArmR fArmR thighL shinL thighR shinR hand handL`. Any may be
  missing or model-less, but `hips`, `torso` and `hand` must exist (Hero hangs the thruster flames on `torso`, and the
  default muzzle uses `hand`). Extra nodes (the Guncannon's `cannons`) are fine: pose them yourself in `preVisuals`.
- A non-humanoid maps its parts onto the rig. The Ball: `hips` empty at `hipHeight` (the sphere centre), `torso` is
  the sphere, pivoting at its centre so torso rotations tumble it in place, and `head` is the cannon turret, aimed by
  head pitch. The arms are the manipulators, and there are no leg nodes (poses that set legs are harmless).
- Look at it: `http://localhost:<port>/tools/viewer.html?only=ball,gundam&yaw=0.6&pose={"uArmR":[-0.4,0,-1.8]}`. It
  loads at canvas size 0 if the pane was hidden. Just navigate again.

## 3. Poses and moves

Euler order is XYZ per joint. Signs:
- **Arms:** a negative arm x raises the arm forward; `uArmR` z negative (`uArmL` z positive) lifts it out to the side,
  and ~±1.55 is horizontal. y sweeps it round the front (`R_IN` is `[0, 1.75, -1.5]`).
- **Torso:** positive x pitches forward, positive y turns left, and positive z tips it to its right.
- **Root:** `yaw`, `pitch` and `roll` keys rotate the whole body about the **ground point** (use `yaw` for spins; tumble a
  ball with `torso` instead). `y` is the hips' height offset.

`Hero.snapshotPose` wraps every angle channel, so a clip may end a full turn round (torso `PI * 2`, `yaw: PI * 12`) and
blend out the short way.

Clips: `new Clip([k(t, {part: [x, y, z], y, yaw...}, ease)], STANCE)`. Each key inherits unspecified channels from the
previous key. Eases: `linear smooth in out snap`.

Move fields (see the headers of `moves.js`, `guncannon_moves.js` and `ball_moves.js`):
- **Timing:** `dur`, `chain` (the earliest buffered input takes over), and `rate` (default 0.86 of keyframe speed; charges
  use 1).
- **Chaining:** `next` (the attack chain), `charge` (what K starts), `shot` + `maxRepeat` (mash-K repeats), `rush`
  (dash-combo repeats; `RUSH_MAX` in hero.js leads to `DAF`).
- **Motion:** `lunge` curve (forward distance), `slide [t0, t1, speed]`, `air` curve (height), `jets [t0, t1, up]`.
- **Hits:** `hits` entries are `{ t, t1, shape: 'arc' | 'circle' | 'line', range, arc (deg), len, width, off, hy, dmg,
  kb, up, pull, stop, big, sp }`. Use `every(t0, t1, step, spec)` for flurries.
- **Shots:** `shots` are `[{ t, kind, ... }]`, passed to the suit's `fire()`.
- **Events and sounds:** `ev` is `[[t, name, arg]]`. Shared names are `flash` (gold/violet/red/pink swirl), `burst`,
  `charge` and `land`; any other name goes to `suitEvent`. `sfxs` is `[[t, name]]`, or give `sfx` + `swing` for one
  swing voice.
- **Air moves and super armor:** `armor`, `invuln`, `isAir`, `hang`, `plunge {hang, land}`.
- **SP:** `sp`, `spNext`, `spHold` (taken while SP is still held: the charge SP), `spRepeat`, `loop`, `steer`,
  `chargeAura` and `rushFx` (radial blur).
- Suit-specific fields are read in the suit's `onMoveTick` (the Guncannon's `can`/`hold`/`barrage`, the Ball's
  `tr`/`blur`/`roll`/`dive`).

Names matter: `N1-N6`, `C1` (+`C1R` repeat, `CS` charge shot), `C2-C6`, `DA`/`DAF`/`DC`, `JA`/`JC`, `SP_IN`...,
`SPA_*` (air) and `SPC_*` (charge). The HUD's combo guide maps moves to rows by these prefixes (`guideRow` in hud.js).

Gotchas:
- `combat.inShape` only hits targets between `hy - 2.5` and `hy + (spec.hy || 3.2)` of the suit's height, so an aerial
  blow misses ground troops unless the suit comes down. The Ball's air-SP ram sets `spAirY` lower through `dive`.
- `combat.acquire` returns `{x, z}` (no y) for commanders: read heights as `t.y ?? t.pos?.y ?? 0`.
- `Hero.airborneAhead()` finds a launched target for anti-air shots.

## 4. The suit class

Config fields (doc comment above `class Hero`) are `hp`, `run`, `boostSpeed`, `boostTime`, `sprintSpeed`, `defense`
(multiplies damage taken) and `power` (multiplies damage dealt, applied in `combat.heroStrike` / `aoe`). Also:
- **Thrusters:** `nozzles` (torso-local), `flameScale`, `exhaust`.
- **Colours:** `impactColor`, `ringColor`, `impactLight`, `domeColor`, `spColor`, `spDome`, `spAura`, `hitColor`,
  `debris`.
- **Sounds:** `hitSfx`, `hitSfxHeavy`, `stepVol`, `stepPitch`.
- **Poses:** `airPose` and `boostPose` (merged over the humanoid defaults).
- **Air SP:** `spAirY`, `spAirReach`.
- **Hovering:** `hover` (no footsteps).

Hooks: `buildWeapons` (anything in the scene goes through `this.own()`, so it attaches and detaches with the suit),
`preUpdate`, `onMoveStart`, `onMoveTick`, `onMoveEnd`, `onInterrupt` and `onEndMusou`. Then `carryPose(target)`,
which runs on every pose each frame, just before blending. The Ball adds its hover there and tips over when downed.
Also `locomotion` (override for non-walkers), `suitEvent`, `muzzle` / `fire`, `preVisuals` / `postVisuals`, `reset`,
and `netExtras` / `applyNetExtras`.

Scratch vectors: `Hero` owns `_v _w _q _r`. Make your own in `buildWeapons` and don't reuse one while another call
still holds it.

## 5. Co-op

The host simulates everything. Guests get `netState()` (position, pose, state, `moves` name) plus whatever
`netExtras()` returns, and replay it in `applyNetExtras()`: trail bits, flags, and state for extra rigs (the Ball's
squadron sends `[t, out, anchor x/z/heading, yaws]`, and the guest places the wingmen from that). `g.fx.*`, audio and
projectiles replicate on their own. `thruster` and `aura` fx stay local (`LOCAL_FX` in net.js), so call them on each
machine.

## 6. Sounds

Recipes live in `RECIPES` (`{ n takes, dur, level, build(synth, take) }`) and render offline at load. The Synth has
`tone noise click metal bell crackle fm bus filter`. Reuse the builders (`swingGC(o)`, `blade(o)`), then add the
recipe's `REV` send and a `FALLBACK` in audio.js. Keep takes short, and put weight in the band the footage measured.

## 7. UI and story

- **Roster entry:** `id`, `cls`, `pilot`, `unit`, `unitShort`, `unitJp`, `pilotName`, `pilotJp`, `stats` (spec sheet),
  `equipment`, `role`, `moves` (the select screen's six lines) and `guide` rows `[keys, text, firstMove]`, where keys use
  J K B U S. The pilot's first name ends up in co-op radio ("I'll back you up, Ball!").
- **Portrait and unit render.** The user has OK'd G Generation sprites from The Spriters Resource, and mixing games or
  art styles is fine. First look on the G Gen Wars (PS2) page
  (`/playstation_2/sdgundamggenerationwars/`) and list its assets by grepping `asset/<id>/` links out of the page
  HTML. The site's search can't be scripted.
  - Pilots: *Character Cutins* has one sheet per named pilot, and *Dialogue Portraits* has one per series, with generic
    soldiers in 3-expression rows of 256 px cells.
  - Later series (Unicorn and after) are on the *G Generation World*, *Overworld* (PSP) and *Genesis* (PS4) pages. The
    World and Overworld unit sheets are mostly model parts. Genesis units come as zips with full-body pose frames.
  - Download: fetch `/<platform>/<game>/asset/<id>/`, find `/media/assets/<n>/<id>.png`, then fetch that.
  - Unit card: crop one posed render, trim it to its alpha bounds, brighten it (see `assets/units/README.md`) and
    scale it to 256 px.
  - Pilot: pack idle, talk and shout crops into a strip (4 px gaps, frames of 256 px at most), save it as
    `assets/portraits/<pilot>.png`, and add a `manifest.json` entry with `[x, y, w, h]` frames. Add `holdTalk` when the
    talk frame is a different bust.
  - Keep a 16x16 `ART` fallback in `portraits.js` anyway (rows exactly 16 characters, using `PAL` keys).
  - With no sprite available, render the voxel model instead: build a `WebGLRenderer({ alpha: true,
    preserveDrawingBuffer: true })` with a 3/4 camera, POST `toDataURL()` as a text/plain Blob to a one-shot python
    receiver on 127.0.0.1, then trim and scale the image.
- **Radio lines:** the `LINES[pilot]` keys are `order launch wing bases denim zone warn char meet kit bye`. Bright
  speaks `order`, `zone`, `warn` and `kit`; Char speaks `char` and `bye`.

## 8. Test

- **Dev server:** the `dwg` launch config (port 8766) is often held by another chat, and navigating to it still works.
  Otherwise add your own config on a spare port, `preview_start` it, and remove it plus `preview_stop` when done. The
  laptop runs hot, so close game tabs right after each check.
- **Harness:** in the page console, run `game.setSuit('<id>'); await import('/tools/harness.js')`, then
  `(await import('/tools/movetest.js')).run()`. Every chain in `CHAINS` / `SPS` should list the expected moves and
  no errors.
- **Seeing moves:** `await import('/tools/shoot.js'); arena(10, 5000, '<id>')`, then
  `film(events, stops, camYaw, camDist, cols)` lays in-game frames out as one contact sheet over the page. Hide the
  HUD first (`game.hud.guideOn = false; document.getElementById('hud').style.opacity = 0`). For a clean read of the
  poses, use `arena(0)` or step the suit away from the crowd. The pane's screenshots can come back stale, so take a
  second one if the image didn't change.
- **Hit areas:** `tools/poses.html?suit=<id>&move=C2&t=0,0.1,0.2&view=front&gap=3` (small suits need a small `gap`).
- **Numbers:** `(await import('/tools/aistats.js')).run(5400)` reports connect rate and hits per swing for each move.
  Compare against the other suits in the same scene (for example, SP flurries run about 2 hits per swing).
- **Missions:** loop `bot(3600)` until `mode !== 'play'`, logging phase changes through `stop`. Runs vary by ±40 s, and
  the bot never dodges, so Char is where suits lose. Run several and compare with the Gundam and Guncannon run the same
  session.
- **Co-op:** open the host tab with `?localnet` and run `await game.hostCoop()` to get the join link, then open that
  link in a second tab and call `game.pickGuestSuit('<id>')`. A background tab's rAF stops, so drive the host by hand:
  `game.renderer.setAnimationLoop(null)` and loops of `tick()` with `await` gaps so BroadcastChannel messages flow.
  Guest input is `game.input.pressed/down`.

## 8b. Building several suits in parallel

This has worked: one agent per suit, each in its own git worktree on its own branch, with a dev server per worktree
(`tools/serve.py <port> <worktree>` from a launch.json entry). Each agent gets a self-contained brief: the video, the
suit and pilot ids, its paths, port and receiver port, the shared-file rules, the done bar and the report format. The
lead then merges the branches one at a time.

- **Shared files:** tell each agent to touch shared files only by appending entries at fixed anchors. Roster entries go
  before the Guntank's, radio `LINES` before `hayato:`, `ART` before `bright:`, sounds above the movement section, and
  recipes, `REV` and `FALLBACK` at their ends. Keep README, index.html and tools/ for the lead.
- **Merging:** git splices two suits' entries together around their shared lines (`  {`, `  },`), and a naive "keep
  both" gives broken entries. Rebuild each conflicted file from main's version, and insert the branch's whole block,
  cut with a regex from `git show suit/<id>:<file>`, at the same anchor. Check afterwards that every entry is whole and
  in order. Take main's side for one-line lists like `UNITS`.
- **After a merge:** rerun movetest on main for the new suit and for the ones merged before it, and check the select
  screen still fits. With six suits, SORTIE had to be pinned to the bottom of the scroll.
- **Co-op without a second tab:** each frame, feed `game.hero.netState()` (round-tripped through JSON) into a second
  instance's `applyNet()` while the suit runs combos and SPs. Any exception is a replication bug.
- **The shared browser pane:** agents fight over the one browser pane, so every call needs a tabId, and each agent
  should front its own tab right before a screenshot. When the pane is hidden the canvas has zero size: set a size
  with `resize_window` (e.g. 1100x620) and reload, then reset it to `desktop` afterwards.
- **Budget:** a Sonnet agent spends about 400-450k tokens per suit. Agents stopped by a usage limit keep what they
  committed, and SendMessage resumes them once the limit resets.

## 9. Balance

Suits don't need to be even (the user's words): some can be weak, some overpowered. What matters is that no suit is
unwinnable or unfun. A mass-produced or joke unit should sit below a real mobile suit. The Ball has 960 HP, defense
1.06, power 0.8 and a slow drift, and wins about half its autoplay runs while scraping past Char. Tune with `power`,
`hp`, `defense` and `run` before touching individual moves. Fix a single move only when it's out of line in aistats.

## 10. Ship

Standing permission: commit and push to main when a piece is done and verified. Run `git add -A` first, because a new
module left out of the commit hangs the live site on its loading spinner. Then check GitHub Pages: fetch each changed
file from `https://jonathanjtan.github.io/dwg/<path>?v=<sha>` with curl and `cmp` it against the local copy. The
browser pane can't open github.io.
