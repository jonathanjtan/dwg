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
| Voxel model `xxxDef()` (+ weapons) | `src/models/<id>.js`, sculpted with `src/core/sculpt.js` on the shared `pal` from `suits.js` (see step 2) |
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

Two sources, both treated as the source of truth:
- **Footage:** the user's playlist of Dynasty Warriors: Gundam Reborn "ALL MOVES" videos
  (https://www.youtube.com/playlist?list=PL-jigc1D_YGKF_Idbsx0UOG_cSuNQ7Zzb, one per suit; list it with
  `yt-dlp --flat-playlist --print "%(playlist_index)s|%(id)s|%(title)s"`). It shows how each move looks and plays.
- **The Koei wiki** (e.g. https://koei.fandom.com/wiki/Gundam, "Battle Data > Moveset"). It says what each input IS
  in DWG1-3, and Reborn keeps the DWG3 input list for UC suits. The page itself sits behind Cloudflare (WebFetch and
  curl get a 402 or a challenge), but the MediaWiki API works:
  `curl -sL -A "Mozilla/5.0 ... Chrome/140.0 Safari/537.36" "https://koei.fandom.com/api.php?action=parse&page=<Page>&prop=wikitext&format=json&formatversion=2"`
  (find page names with `action=opensearch&search=<name>`). Notation: `{{S}}` square = our J, `{{T}}` triangle = our
  K, `{{C}}` circle = SP, `{{X}}` = boost. So `{{S}}, {{T}}` is C2, and a bracketed `({{T}})` is a K follow-up
  (C2F). Reborn-only suits (DLC like the X1 Kai) may have no entry.

Take what each input is from the wiki and how it looks from the footage; where they disagree, the footage wins
(Reborn reanimated some moves, e.g. the Sazabi's C2 and dash charge). Before building anything, write an audit
table: for every input (J string, K and its mash/hold, C2-C6 and their K follow-ups, DA and its follow-ups, DC, JA,
JC, tap/held/air SP) give the footage timestamp, the wiki line and what the move does, then build from it.

Downloading the linked video is authorized by the request, and so are G Generation sprite sheets for portraits and
unit cards (see step 7).

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
- Reborn "ALL MOVES" videos usually skip C3-C6 and jump attacks. Take those from the wiki's list first. Invent only
  what neither source has, from the suit's own tools and in the spirit of the moves shown, and say so in the moves
  file header. Mass-produced suits only get C1-C2 (plus a dash charge) in DWG3; invented extras are fine (the Ball
  keeps its C3-C6) but they get the `new` source tag (step 7).
- Misreads to avoid (the Gundam's C2 was built as a 360 spin that brought the javelin 0.6 s late, with no shield
  follow-up):
  - Cut 15-20 fps close-ups of the exact beat where each weapon comes out or changes.
  - The gold/violet charge swirl is the `flash` event, not body motion.
  - Check the wiki for bracketed K follow-ups and build them as `charge: 'C2F'` moves.
  - A juggle's launch height has to meet its follow-up's reach: measure the target's height in the harness.
  - A video doesn't show everything a suit can do. The wiki's general Reborn page lists system moves the move videos
    skip (e.g. a held K firing the charge shot mid-combo), so check it before concluding a move doesn't exist.
- Recoil: for every firing move, note whether the suit slides back and whether the body rocks back, and roughly how
  far in suit heights. Measure against the ground (register frames to the floor, or track the shadow/feet), not
  against the target, since charge shots knock the target back too. See "Guns and shots" in step 4 for the rules.
- SP: the Reborn HUD's SP bar has three segments. Note how many stocks each SP spends and how long the held SP runs
  per stock (step 3).
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

**Start from reference, not memory.** Suits built from memory came out generic (the first Sazabi had a scorpion-tail
crest, a green eye, a black chest and black slabs for funnel racks). Before modelling, gather reference and write down
what makes the suit read as itself: silhouette, proportions (shoulder span, where the knees and skirt hem sit as a
fraction of height), colour blocking, and the three or four signature features.

- **Sketchfab** (the user suggested it): the public API works with curl even though the browser pane blocks the site.
  `https://api.sketchfab.com/v3/search?type=models&q=<suit>&count=24&sort_by=-likeCount` returns thumbnails
  (`results[].thumbnails.images`). Lay them out as one contact sheet with PIL and pick the clean full-body ones; low-poly
  game-style models are the best voxel reference. The G Generation unit render in `assets/units/` helps too.
- **Proportions:** crop the best reference and measure it before touching coordinates.

**Model with `src/core/sculpt.js`** (every suit in `src/models/` is an example: `sazabi.js` for curved armour,
`gundam.js` for a classic humanoid, `ball.js` for a non-humanoid, `zaku.js` for one model at two densities). Parts are solid shapes in
design units (one unit = one voxel at the old density), rasterized at `R` voxels per unit; `rigDef(R, scale, hipHeight,
parts)` scales pivots so the suit keeps its world size, and weapons meshed apart use `scale / R`. Shapes: `box`,
`rbox` (rounded), `ell`, `cyl` (tapers), `prism` (a polygon extruded), `hull(front, side, top)` (silhouettes as
`[x,y]`, `[z,y]`, `[x,z]` extruded and intersected: the workhorse for armour), `half` (a chamfer plane), `fn` (custom),
combined with `and`, `or`, `sub`, `move`, `rot`, `mirror` and `both` (shape plus its mirror). `Sculpt` has `add`, `cut`,
`paint` (recolour what's there, e.g. a panel line or rim band), `decal` and `project` (pixel art stamped onto slanted
or curved armour), `mirror`, and `Sculpt.on(model, R)` to keep working on a mirrored clone (the F91 letters "F" and
"91" on its two shoulders that way). Author the suit's left half (+x), mirror, then add asymmetric bits.

- **Density:** playable suits and officers build at `R = 2`; the crowd Zaku at `R = 1`, since up to 300 are drawn at
  once (a 2x suit is about 25-40k triangles, the 1x grunt about 6k). `zakuDef(colors, horn, R)` serves both.
- **Thin features vanish at low R:** a voxel is solid only if its centre is inside the shape, and centres sit at
  (i + 0.5) / R. A 0.4-unit antenna from x 2.7 to 3.1 has no centre inside it at R = 1 or R = 2. Give anything that
  must survive at least one full unit, or span a centre at every density you use.
- **`half(nx, ny, nz, d)` keeps n·p <= d:** `half(0, 1, 0, -2)` is everything below y = -2, `half(0, -1, 0, 2)` everything
  above y = -2. Getting the sign backwards cost the Zaku its shins once; check isolated parts with `&show=`.
- **Anchors in the suit class are in world units,** relative to the node (the Sazabi's first funnel home was
  `(0, 13, -9)`: voxel units, 13 world units in the air). When a model moves, update its muzzles, nozzles and trail
  points to design units x scale, or export the numbers from the model module (the Guncannon's `GC_CANNON_TOP`).

**Look at it every few edits:** `tools/turnaround.sh out.png "only=<id>&views=front,rside,back,q" 1600,560` renders an
orthographic model sheet with headless Chrome (no dev server, no browser pane); `&show=head,torso` isolates parts and
frames them, `&pose=rest` drops the stance, `&R=1` renders a sculpted suit at another density. Put the sheet next to
the reference crop and fix the biggest difference first: silhouette and proportion before colour, colour before detail.
Then check it in game from behind (the camera's usual view) as well as from the front.

Under the sculpt layer, `VoxelModel` has `box`, `sbox` (symmetric in x), `ellipsoid`, `set`, `clearBox`, `paint`,
`mirrorX`, `flipX`, `clone` and `recolor`. Colors are hex values; `{ glow, jitter }` opts make emissive voxels. Conventions:

- Characters face +Z, and their right side is -X. Each part is authored around its own pivot at the origin; `scale: 0.1`
  per design unit for an 18m suit (the Sazabi uses 0.11, the X1 0.088).
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
- **The K mash (C1/C1R), as in Reborn:** five shots (`maxRepeat: 5`), no ammo or reload. Measure the gap I between
  shots and when the gun comes down in the footage; recovery R is that plus ~0.1 s (0.35-0.47 s).
  - C1R: shot at 0.03, `chain = I - 0.03` (a connecting shot's hit-stop adds ~0.03), `dur = 0.03 + R - 0.05`.
  - C1: shot at 0.10-0.12, `chain ≈ C1R.chain + 0.09`, `dur = shotT + R - 0.05`.
  - The tap shot is `{ dmg: 13, kb: 2.5, up: 0, pierce: 1 }` in `heroBeam`: a flinch, never a knockdown, stopped by
    the first body. A shell's damage radius stays about 0.5 H (r ~1.7, `up: 0`); draw the fireball bigger with
    `heroBlast`'s `fxR`.
  - Targets: a full mash does 60-70% of the J string's damage per second to one target. The charge shot is the
    payoff, at least 1.3x a mash (~85-120 on one target), and pierces, throws and knocks down.
- **Events and sounds:** `ev` is `[[t, name, arg]]`. Shared names are `flash` (gold/violet/red/pink swirl), `burst`,
  `charge` and `land`; any other name goes to `suitEvent`. `sfxs` is `[[t, name]]`, or give `sfx` + `swing` for one
  swing voice.
- **Air moves and super armor:** `armor`, `invuln`, `isAir`, `hang`, `plunge {hang, land}`.
- **SP:** `sp`, `spNext`, `spHold` (taken while SP is still held: the charge SP), `spRepeat`, `loop`, `steer`,
  `chargeAura` and `rushFx` (radial blur).
- **SP stocks (Reborn):** the gauge holds three stocks of 100 (`SP_STOCK` in hero.js). The ground and aerial SP need
  one and spend one; there's no weaker SP on a partial stock. Holding SP through the charge SP's wind-up (the
  `chargeAura` phase) commits another banked stock every `spcStep` seconds (default 0.6; the footage shows 0.5-0.8),
  and the clip holds short of its burst while it does. The stocks spent then set the frenzy:
  - `stockDur: [s1, s2, s3]` on the frenzy phase: its length in seconds by stocks spent. Reborn runs about 3.3-3.6 s
    a stock for most suits (the Guncannon about 2.5, the X1 Kai's vortex about 2.1); measure it on the HUD.
  - `stockPower: [p1, p2, p3]` (optional): a damage multiplier by stocks spent, for a finisher that should scale.
  - Build the frenzy's hits and shots over one pass with `every()`/`times()`: the hero replays the phase in passes
    until the time is spent, cutting the last one short.
  - Without these, a `loop` phase runs 1 / 1.6 / 2.2 times as long, an `spRepeat` phase repeats that many times
    more, and a charge SP with neither hits 1 / 1.3 / 1.6 times as hard.
- **Follow-ups:** a K follow-up to a charge attack is its own move reached through `charge` (`C2: { charge: 'C2F' }`;
  extra K taps that lengthen a move are `C6X`), and a dash string's later hits chain through `next` (`DA`, `DA2`,
  `DAF`). `guideRow` in hud.js keeps `CnF`/`CnX` on the charge attack's row and `DA2`-`DAF` on the dash row. A
  connect-gated follow-up (the Delta Plus's C3F only comes out if C3 hit) is a `startMove` override in the suit class.
- **The charge shot after a combo:** as in Reborn, K held on through a charge attack (`C2`-`C6` and their follow-ups)
  starts `CS` from that move's `chain` point on, once per hold (`CHARGE_COMBO` in hero.js). A suit needs nothing for
  it beyond having a `CS` and sensible `chain` points; movetest's `c3cs` chain checks it.
- **String length follows the source.** If the wiki gives a four-press J string, there is no N5/N6 and no C6 (the
  Delta Plus), and a dash string with a fixed length chains through `next` instead of `rush`.
- **A suit's own input** (the Delta Plus's Transform Shot: a second boost press during the quick boost) goes in the
  suit's `update()` override before `super.update`: start the move and strip the press from `act`, so the base
  state machine and the other suits never see it.
- Suit-specific fields are read in the suit's `onMoveTick` (the Guncannon's `can`/`hold`/`barrage`, the Ball's
  `tr`/`blur`/`roll`/`dive`).

Names matter: `N1-N6`, `C1` (+`C1R` repeat, `CS` charge shot), `C2-C6`, `DA`/`DAF`/`DC`, `JA`/`JC`, `SP_IN`...,
`SPA_*` (air) and `SPC_*` (charge). The HUD's combo guide maps moves to rows by these prefixes (`guideRow` in hud.js).

Gotchas:
- `VoxelModel` reads any colour value below 0x10000 as a palette id, not a colour: write dark colours with a nonzero
  high byte or pick them from the palette.
- A shield hangs along the forearm, so a face-forward bash needs the forearm raised past vertical. The GM's working
  pose: torso yaw ~0.7, `uArmL [-0.6, 0, 0.1]`, `fArmL [-2.1, 0, 0]`, `handL [0, 1.4, 0]`. The sign of `handL`'s y
  flips with whether the forearm points up or down.
- `combat.inShape` only hits targets between `hy - 2.5` and `hy + (spec.hy || 3.2)` of the suit's height, so an aerial
  blow misses ground troops unless the suit comes down. The Ball's air-SP ram sets `spAirY` lower through `dive`.
- `combat.acquire` returns `{x, z}` (no y) for commanders: read heights as `t.y ?? t.pos?.y ?? 0`.
- `Hero.airborneAhead()` finds a launched target for anti-air shots.
- Hit-stop: every hero hit freezes the suit for a few frames unless the spec has `sp` and isn't `big`. `heroBlast`
  defaults to `big: true` (a 10-frame stop per blast), so a barrage of blasts crawls: pass `big: false` for rain and
  volleys. Beams from remote weapons (funnels) take `sp: true` in `heroBeam` so a hit far away doesn't freeze the suit;
  without it the Sazabi's 3.2 s funnel rain ran over 5 s.

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
- **Gait:** walking and running come from `src/core/gait.js`, shared by the suits, the commanders and the grunts.
  The legs are IK with planted feet, and the cycle is driven by distance travelled, so steps always match ground
  speed. The defaults are the Gundam's; a new walker only adds `gait: {...}` to its config:
  - `stride`: leg lengths per step at its `run`. Bigger means slower, heavier steps: 1.6 for the Guncannon or
    Sazabi, 1.4 for the F91.
  - `duty: [walk, run]`: the share of the cycle each foot is down. Longer contact reads heavier.
  - `impact`, `sway`, `roll`, `lat`: the weight in each footfall. `lean`: the forward pitch at a run.
  - `arm` and `carry`: how the weapon and shield arms are held. Zero `carry[2]` for a long gun that would swing into
    the legs.
  - `keep`: how near the line between the hips a foot may come, as a share of its footing out from it (0.6). Turns
    and strafes set the stance out or slide a planted foot along that line rather than step across it, so the legs
    never pass through each other.

  The model needs `thighR`/`shinR` pivots and must stand on straight legs in its rest pose, since the leg lengths
  come from `rigDef`. A suit without legs (the Ball) overrides `locomotion` and returns `this.beat(dt, sp)` for its
  footfalls. Check it by filming side and 3/4 runs, and by stepping the harness while reading the foot's world
  position (the end of `hero.rig.nodes.shinR`) each frame: a planted foot should barely move while it's down. Then
  `(await import('/tools/legtest.js')).run(null, ['<id>'])` drives runs, walks, turns, reversals and lock-on strafes
  and reports, per run in leg lengths, the closest the feet, knees and legs come and how many frames they crossed
  (0), plus `slip`, how far planted feet slide against the distance covered; `shape(['<id>'])` gives a straight run's
  highest thigh, deepest knee and foot lift.

Hooks: `buildWeapons` (anything in the scene goes through `this.own()`, so it attaches and detaches with the suit),
`preUpdate`, `onMoveStart`, `onMoveTick`, `onMoveEnd`, `onInterrupt` and `onEndMusou`. Then `carryPose(target)`,
which runs on every pose each frame, just before blending. The Ball adds its hover there and tips over when downed.
Also `locomotion` (override for non-walkers), `suitEvent`, `muzzle` / `fire`, `preVisuals` / `postVisuals`, `reset`,
and `netExtras` / `applyNetExtras`.

**Guns and shots.** Rounds must leave down the barrel, and a shot aims the gun, not the whole suit. Shooting poses
twist the torso into a bladed stance and snap keys kick the arm up, so a keyframed gun points 20-35 degrees right of
and 10-20 up from the heading. `Hero.aimGun` fixes it for you: while a weapon named in the suit's `guns` (default
`rifle`, `bazooka`, `launcher`) is out in a move, it twists the waist part of the way toward `aimYaw` and swings the
right arm at the shoulder so the barrel lies along the line of fire, and writes both into the pose (so guests see
them). That reaches `AIM_REACH` (about 70 degrees) either side of the heading; past that the body turns, smoothly, just
far enough. What it needs from a suit:
- Hang every hand-held gun off `hand` with no rotation of its own, barrel along +Z: the layer takes the hand's +Z as
  the barrel, and `muzzle()` should be a point on that line (`gun.localToWorld(out.set(0, y, z))`).
- Straight shots: look for the target around `this.aimYaw` (where the gun already points; it follows the heading
  when nothing is tracked), call `this.aimShot(aim, tgt)` before reading `muzzle()`, then fire level along `aim`.
  Fan volleys (`shot.ang` offsets) centre on `aimYaw` and skip `aimShot`. Never set `heading` or
  `rig.root.rotation.y` onto a shot yourself: snapping the whole suit round on every shot is what this replaced.
- A move that only shoots (`shots`, no `hits`, not SP) doesn't turn the suit when it starts: `startMove` gives its
  target to `trackAim`, which keeps the aim on it through a mashed string and turns the body only when the target
  leaves the reach. Moves with blows still snap onto their target.
- Shots that aren't level (down from a hover, up at a launched target): `const from = this.aimGunTo(x, y, z, out)`
  points the gun at the world point and returns the muzzle after the arm has moved; fire along `point - from`.
- Other gun names (a buster, a launcher) go in `guns` on the config. Guns that aren't in the hand (the Guncannon's
  shoulder cannons, the Ball's turret, the Delta Plus's shield launcher) stay out of `guns`: they pitch on their own
  node, `aimShot` turns the body for them, and `trackAim` swings it round smoothly beforehand, so little is left to
  snap at the shot.
- Recoil follows the footage, move by move; there's no blanket rule. Regular and mashed shots never move the suit,
  and neither do sustained barrages or funnels: their punch is the muzzle flash, smoke, sound and camera shake/kick,
  plus at most a small barrel or arm kick (the arm snap keys, the Ball's head kick, the Guncannon's `canKick`). A
  single heavy shot (the charge shot, a point-blank finisher, an SP blast) recoils only where the footage shows it:
  - Gundam CS: slides back about half its height. F91 CS: skids about a third. X1 Kai CS: the X-thrusters hop it
    back about 0.4 H *before* it fires (a `hopback` event).
  - Ball CS and DC: back about one pod width, rocking back; its SP blasts throw it 1-2 widths.
  - Guncannon, Delta Plus and Sazabi: nothing, charge shots included (braced, or planted).

  Push along `-dir` (the shot's line), not the heading, since the arm aims away from it. Ground moves damp velocity
  at rate 10, so a shove of `vel -= dir * N` in `fire()` slides about N/10 units: about `0.35 x H x 10` for a third
  of the suit's height. A backward `lunge` curve and a torso key rocking back go with it only when the footage shows
  the lean. Air moves don't apply velocity, so air recoil needs a `lunge` or its own event.
- Remote weapons (funnels, bits, a squadron) are world-space meshes owned through `this.own()`. Keep their state as a
  mode, an anchor and a clock, compute positions from those in one function, and send just those in `netExtras` so
  the guest runs the same function (the Sazabi's `funnelSlot`). Fire their beams from the mesh's position.
- Check it with `tools/aimtest.js` (section 8): every row should read 0-2 degrees. A fan fired all at once (the GM's
  C3) reads up to ~25 degrees on its outer rounds, by design: the gun points down the middle. A sweep fired shot by
  shot should aim the gun per shot with `aimGunTo`.

Scratch vectors: `Hero` owns `_v _w _q _r`. Make your own in `buildWeapons` and don't reuse one while another call
still holds it.

## 5. Co-op

The host simulates everything. Guests get `netState()` (position, pose, state, `moves` name) plus whatever
`netExtras()` returns, and replay it in `applyNetExtras()`: trail bits, flags, and state for extra rigs (the Ball's
squadron sends `[t, out, anchor x/z/heading, yaws]`, and the guest places the wingmen from that). `g.fx.*`, audio and
projectiles replicate on their own. `thruster` and `aura` fx stay local (`LOCAL_FX` in net.js), so call them on each
machine. Anything written into `this.pose` (like the gun-aim layer's arm swing and waist twist) replicates for free;
prefer that to touching rig nodes directly after the pose is applied.

## 6. Sounds

Recipes live in `RECIPES` (`{ n takes, dur, level, build(synth, take) }`) and render offline at load. The Synth has
`tone noise click metal bell crackle fm bus filter`. Reuse the builders (`swingGC(o)`, `blade(o)`), then add the
recipe's `REV` send and a `FALLBACK` in audio.js. Keep takes short, and put weight in the band the footage measured.

## 7. UI and story

- **Roster entry:** `id`, `cls`, `pilot`, `unit`, `unitShort`, `unitJp`, `pilotName`, `pilotJp`, `stats` (spec sheet),
  `equipment`, `role`, `moves` (the select screen's six lines, `[keys, text, src]`) and `guide` rows
  `[keys, text, firstMove, src]`, where keys use J K B U S. The pilot's first name ends up in co-op radio ("I'll back
  you up, Ball!").
- **Source tags:** every `moves` line and `guide` row says where the move comes from, and the select screen and combo
  guide show it: `'reborn'` (shown in the Reborn footage), `'dwg'` (in the wiki's DWG1-3 list but not in the footage)
  or `'new'` (invented for this game). Tag a row by its main move, and use your audit table from step 1. A row that
  mixes sources ("tap · hold: …") takes an array in the order of its parts, e.g. the Ball's SP `['reborn', 'new']`.
  Rendering lives in `srcTag`/`srcLegend` (select.js), used by the select screen, the guide and the co-op lobby.
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
    scale it to 256 px. Unit sheets pack parts tightly, so a bounding-box crop drags in bits of the neighbours: keep
    only the largest connected alpha blob (a flood fill over alpha > 10) before trimming. Find candidate renders by
    flood-filling the whole sheet's alpha at 1/4 scale and listing blobs by area; full-body renders are the big ones.
  - Pilot: pack idle, talk and shout crops into a strip (4 px gaps, frames of 256 px at most), save it as
    `assets/portraits/<pilot>.png`, and add a `manifest.json` entry with `[x, y, w, h]` frames. Add `holdTalk` when the
    talk frame is a different bust.
  - Cut-in sheets come per era: the Wars page has both *Char Aznable* and *Char Aznable (CCA)*. A pilot who already
    exists in the game as an NPC (Char is the mission boss) gets a new pilot id (`charcca`) so the NPC keeps its own
    portrait and red dialogue styling; write the radio lines knowing the two meet (the Sazabi's `char`/`meet` lines
    play the mirror match).
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
- **Guns:** `(await import('/tools/aimtest.js')).run(['<id>'])` plays every movetest chain with an enemy 30 degrees
  off and reports, per move and gun, the worst angle between barrel and round and how far the round starts off the
  barrel's line. Expect 0-2 degrees; 20+ means a shot skips `aimShot`/`aimGunTo` or the gun isn't mounted along +Z.
- **Recoil:** step each firing move with `render: false` and read how far `hero.pos` moves back along the shot
  (put the enemy 30+ units away, or a dash move reads as recoil when it separates from its target). It should
  match your footage table: 0 for regular shots.
- **SP stocks:** set `game.hero.sp` to 100/200/300 and check the tap and air SP spend exactly one stock, and that a
  held SP spends what it commits and runs `stockDur` long. movetest's `spHold` holds SP for 120 frames so it commits
  all three.
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
  instance's `applyNet()` while the suit runs combos and SPs. Any exception is a replication bug. Set the copy's
  `pos` from the state (`b.pos.set(s.x, s.y, s.z)`) first, as net.js does, or anything placed around the suit on the
  guest (funnels, wingmen) will look wrong when it isn't. Compare extra meshes' world positions host vs copy: they
  should match to 0.
- **The shared browser pane:** agents fight over the one browser pane, so every call needs a tabId, and each agent
  should front its own tab right before a screenshot. When the pane is hidden the canvas has zero size: set a size
  with `resize_window` (e.g. 1100x620) and reload, then reset it to `desktop` afterwards.
- **Budget:** a Sonnet agent spends about 400-450k tokens per suit. Agents stopped by a usage limit keep what they
  committed, and SendMessage resumes them once the limit resets.

## 9. Balance

- Char's evade counter (`commander.js`) dodges out after 5 recent hits, so a suit whose presses land two hits each
  (the GM's paired cuts) triggers it twice as fast and struggles against him. Balance for it with `hp`/`defense`/
  `power` and heavier second cuts rather than dropping hits the footage shows.
- The browser tool times out at 45 s: run autoplay missions async in the page and poll the result (each mission
  takes ~6 s with rendering off).

Suits don't need to be even (the user's words): some can be weak, some overpowered. What matters is that no suit is
unwinnable or unfun. A mass-produced or joke unit should sit below a real mobile suit. The Ball has 960 HP, defense
1.06, power 0.8 and a slow drift, and wins about half its autoplay runs while scraping past Char. Tune with `power`,
`hp`, `defense` and `run` before touching individual moves. Fix a single move only when it's out of line in aistats.

## 10. Ship

Standing permission: commit and push to main when a piece is done and verified. Run `git add -A` first, because a new
module left out of the commit hangs the live site on its loading spinner. Then check GitHub Pages: fetch each changed
file from `https://jonathanjtan.github.io/dwg/<path>?v=<sha>` with curl and `cmp` it against the local copy. The
browser pane can't open github.io.

Other chats work in the same checkout on main and ship with `git add -A` too, so a half-done file of yours can land
in their commit (the Sazabi's sounds and sprites went out in a training-mode commit). Check `git log` before
committing and say so at hand-off; don't rewrite their history.
