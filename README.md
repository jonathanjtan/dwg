# Gundam Musou: Side 7

A voxel Dynasty Warriors: Gundam tribute running in the browser with three.js. Pick Amuro's RX-78-2 Gundam or Kai's RX-77-2 Guncannon and fight off a Zeon raid on Side 7: clear the plaza, take the three Zeon landing zones, defeat Denim and Gene, then drive off Char's red Zaku.

Inspired by [voxel-musou](https://github.com/mike007jd/voxel-musou), the Zhao Yun voxel musou demo. Models, animation, effects, audio and music are procedural and written from scratch. The only image assets are the pilot portrait sheets.

## Play

**https://jonathanjtan.github.io/dwg/** — keyboard, mouse, gamepad, or touch on a phone or tablet.

To run it locally, serve the folder with any static file server:

```bash
python3 tools/serve.py 8766
```

Then visit http://localhost:8766.

## Co-op: RX-75 Guntank

Click **HOST CO-OP** on the title screen and send the invite link to a friend. They join as Hayato Kobayashi in the Guntank, either from the lobby or mid-mission. The host runs the whole simulation. The guest's browser streams input to the host and renders snapshots, peer to peer over WebRTC. [PeerJS](https://peerjs.com)'s free public broker is only used for the initial handshake.

The Guntank is a long-range support unit:

| Action | Keys |
| --- | --- |
| Drive (the treads turn the hull, the torso tracks targets) | WASD |
| Missile burst (the 4th press fires an 8-missile salvo) | J / left click |
| Twin 120mm cannon lob (after two bursts, a 6-shell barrage) | K / right click |
| Thruster hop / tread boost | Space / L, Shift |
| Full-burst SP attack | I / F |

If the Guntank is destroyed it redeploys after 8 seconds. The mission fails only if the host's suit falls. The host picks the Gundam or the Guncannon as usual; the guest always pilots the Guntank.

Connectivity: players connect directly, which works on most home networks. There's no TURN relay, so two players who are both behind strict or symmetric NATs (some corporate or mobile networks) may not be able to connect. For local testing, add `?localnet` to the URL to use a same-browser BroadcastChannel transport between two tabs.

## The mission

Side 7 is laid out like a Dynasty Warriors: Gundam stage: big open fields (the plaza in the middle and three military yards) a few blocks apart, with boulevards and town blocks in between.

Zeon comes in squads, as in the game. Garrisons hold their posts until you come close. Then the mob packs in around you, the front rank at arm's length and the rest a body or two behind, and a few at a time step in to swing. Gunners on the edge of the crowd fire the odd short burst, one at a time. A red aim line shows where it will go, so you can step out of it. Commanders mostly fight hand to hand and paint the same line before they open fire.

1. **The plaza.** Four squads meet you as you land. Clear 50 Zaku.
2. **Landing zones.** Three supply pods drop into the military yards, each with a garrison and a squad leader. Pods keep dropping reinforcements until you defeat the squad leader and take the zone. An on-screen marker and the minimap point to the nearest one.
3. **Denim, then Gene.** Commander-type Zaku arrive with a camera cut and name card.
4. **Char.** Drive off the Red Comet.

Staying alive:

- **Armor recovery:** part of every hit (the striped red segment of the HP bar) repairs itself if you avoid damage for a few seconds.
- **Repair kits** drop every 20 KOs or so, and sooner when you're hurt. Squad leaders and commanders drop large kits. Kits drift toward you when you're close.
- Zaku telegraph their heat hawk swings with a glint. A red glint means the blow is real.

## Controls

| Action | Keyboard / mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD | Left stick | Left thumb, anywhere on the left half |
| Camera | Mouse (click to lock), Q / E, wheel to zoom | Right stick (LT recenters) | Drag the right half |
| Lock on to a commander (again to release) | R / middle click | Right stick click | LOCK |
| Attack | J / left click | X / Square | ATK |
| Charge attack (hold for a charge shot) | K / right click | Y / Triangle | CHG |
| Jump (hold to hover on the thrusters) | Space | A / Cross | JUMP |
| Boost dodge (hold to boost dash, keep holding to sprint) | L / Shift | B / Circle | BOOST |
| SP attack (hold for the charge SP) | I / F | RB / R1 | SP |
| Pause, sound on/off, hide keys | Esc, M, H | Start | ⏸ (sound lives in the pause menu) |

Sound starts off. Press M, or use the SOUND button in the pause menu, to turn it on.

**Lock-on** works on commanders only: squad leaders, Denim, Gene and Char. Press R to lock on to the one nearest the middle of the view. The camera swings round behind you to keep it in frame, attacks and shots aim at it while it's in reach, and a red reticle marks it (pinned to the screen edge when it's out of view). While locked on, your suit keeps facing the target: left and right strafe round it, back backs off, and boost dashes, the boost sprint and dodges strafe the same way. Press R again to let go. With no commander around, R recenters the camera.

### Touch

Hold the phone sideways. The movement stick appears wherever your left thumb lands and follows it if you drag past the ring, so you never run out of travel; drag anywhere on the right half to swing the camera. The action buttons sit in a diamond under your right thumb and hold exactly like the keys do — hold BOOST to dash (and keep holding to sprint), JUMP to hover, CHG to charge a shot, SP for the charge SP. The SP button lights up when the gauge is full. Lock-on is worth leaning on here: it aims your attacks for you and saves a lot of camera work.

Tap **FULLSCREEN** on the title screen, or sortie — the game asks for fullscreen and a landscape lock on the way in, which is worth a third of the screen back from the browser's address bar and tab strip. iPhone Safari supports neither, so there the game offers **Share → Add to Home Screen** instead; launched from the home screen it runs without browser chrome. Rendering is capped at 1x device pixels on touch devices and steps down to 0.5x if frames get long.

## Mobile suits

LAUNCH opens the mobile suit select. A / D or the arrow keys choose, Enter sorties, and the choice is remembered for next time. On touch, tap a card to select it and SORTIE to launch; the combos are listed as button names rather than keys. Both movesets follow *Dynasty Warriors: Gundam Reborn*, with reach scaled from gameplay footage in suit heights. Charge attacks change with how far into the combo you are.

### RX-78-2 Gundam (Amuro Ray)

Amuro's moveset follows the RX-78-2's in *Dynasty Warriors: Gundam Reborn*, with its beam saber, beam rifle, beam javelin, hyper bazooka and Gundam hammer. Reach is scaled from gameplay footage: the saber blade is about 1.3 Gundam heights long, as in the game. Charge attacks change with how far into the combo you are:

- **J × 6**: six saber cuts. The sixth is a thruster hop into a full-circle cut that launches everything around you.
- **K**: beam rifle shot. Mash it for a shot combo, or hold it for a charge shot that throws its target.
- **J K**: rising launcher cut, a spin under the falling target, then the beam javelin speared up into it
- **J J K**: the hyper bazooka comes off the back and fires four rounds point-blank
- **J J J K**: a flurry of cuts, a crescent sweep, then a thruster dash straight through the target
- **J J J J K**: a spin, then a huge rising crescent that carries the Gundam up with its target
- **J J J J J K**: a spin, a hop, and a saber stab into the ground that sends out a shockwave about 2.8 Gundam heights across
- In the air: **J** aerial slash, **K** plunging slam
- During a boost dash: **J** dash rush (keep pressing J for up to 12 cuts and a launcher), **K** point-blank bazooka, **Space** boost jump

SP attacks: on the ground, a long saber flurry, then the javelin skewers, lifts and slams, and purple lightning erupts. Hold SP through the starburst for the charge SP: the Gundam hammer, whirled around you on its chain. In the air, the Gundam hovers and shells the crowd with the hyper bazooka.

### RX-77-2 Guncannon (Kai Shiden)

Slower, with less armor but more defense than the Gundam (the game's spec sheet: armor 8429, mobility 667, thruster 790 against 10000, 800 and 1000). The right hand keeps the beam rifle; the left fist and the feet do the close work, and the twin 240mm shoulder cannons swing down over the shoulders for everything heavy. As in the game, a blow lands a little past its swing arc, reaching about as far into a crowd as the Gundam's saber.

- **J × 6**: left hook, backhand, stepping straight, spinning back kick, roundhouse, then a thruster hop into a spin with both arms out that launches everything around it
- **K**: beam rifle. Mash it for a shot combo, or hold it for a charge shot: the suit braces and both cannons fire, blowing the target away
- **J K**: a thruster uppercut that carries the Guncannon up with its target
- **J J K**: grabs the soldier in front, hoists it overhead, hurls it into the sky and shells it with both cannons on the way down
- **J J J K**: the cannons level and pound the target point-blank, four times
- **J J J J K**: braced on its thrusters, a rapid string of shells that juggles the target higher with every hit
- **J J J J J K**: grab, then the giant swing: round and round with the soldier as a club, and let go
- In the air: **J** punch, **K** both cannons fired down at the ground ahead
- During a boost dash: **J** a rush of punches ending in an uppercut, **K** launch the target, blast it with both cannons as it comes down, and back-flip clear

SP attacks: on the ground, a storm of punches that walks forward (afterimage fists) and a last blow that blasts the target away. Hold SP through the starburst for the charge SP: shells fired out in every direction while the suit turns on the spot, then a ring of blasts. In the air, the Guncannon hovers low and shells its target point-blank.

The boost gauge under the SP bar drains while you dash or hover and refills once the thrusters rest. Keep holding boost after the dash runs out and the suit settles into a **boost sprint**, skating on its thrusters at about twice its running speed without using the gauge. It's the quick way from one field to the next, and attacks come out of it as dash attacks.

## How it's built

- `src/core/voxel.js`: voxel models authored with box, ellipsoid and mirror operations, then meshed with face culling, baked ambient occlusion, and greedy merging for the static town.
- `src/core/rig.js`: a 13-part humanoid rig with keyframed pose clips. It drives both Object3D rigs (the player suits and the commanders) and `InstancedMesh` crowds of up to 300 Zakus.
- `src/game/`: the player suit controller (`hero.js`: locomotion, boost, the attack runner and the SP state machine), the two suits (`gundam.js` and `guncannon.js` with their movesets in `moves.js` and `guncannon_moves.js`: poses, hit shapes, weapon timelines, timed effects), the select screen roster (`roster.js`), the Guntank (`tank.js`), squad AI with attack tokens, a front-rank cap, rationed and telegraphed gunfire, and grabs (`crowd.js`), landing zones (`bases.js`), officers and Char, combat, projectiles and the stage script.
- `src/net/net.js`: co-op networking. The crowd is packed into an Int16Array per snapshot, and effect, sound and HUD events are replicated.
- `src/fx/fx.js`: instanced cube particles for sparks, fire, smoke, embers and debris, anime impact stars, beam afterglow, ground scorch decals, shockwave rings and the Catmull-Rom smoothed saber ribbon trail.
- `src/audio/sfx.js`: the sound bank. Every effect is synthesized at load in an `OfflineAudioContext`, several takes per sound, each tuned differently, so no two triggers in a row are identical. Each saber move has its own voice, and the slash sweeps across the stereo field with the blade. Hits, footsteps, boosts and explosions are layered from a transient, a saturated body, ringing armor resonances, debris crackle and a low push. The weapon voices are tuned to *DW: Gundam Reborn*'s gameplay audio, measured band by band. Beams buzz around 160 Hz. Saber hits crunch near 2 kHz and ring at the game's armor partials between 0.7 and 1.15 kHz. There is little air above 6 kHz. The Guncannon's blows are a 300-400 Hz thump with a thin swish on top, and its 240mm cannons boom at 100-200 Hz under a bright 1.5-4 kHz blast.
- `src/audio/audio.js`: plays the bank's takes, panned against the camera and dulled with distance, through a generated colony-hall reverb. It also runs the continuous beam-saber hum and thruster roar, and falls back to live synthesis until the bank is ready.
- `src/audio/music.js`: the score, synthesized live: original pieces in the style of late-70s anime orchestral funk, with a brass section (trumpets, horns, chord stabs), strings, a plucked funk bass, glockenspiel, timpani and a march-funk kit. The battle theme is transcribed from a reference track onto that band: an A minor riff over a pumping pedal bass and a four-on-the-floor kick, which later climbs a half step to Bb minor. There's also a boss theme for Char, a title theme, and victory and defeat stingers.
- `src/world/world.js`: the Side 7 town (a boulevard grid with four open fields cut out of it) and the O'Neill cylinder shell curving up into the sky. Static props are baked into one mesh per 60-unit chunk, and colliders sit in a lookup grid.
- `src/post.js`: the MSAA HDR target, capped bloom, depth of field, grade and dither.

## Credits

- Several feel and rendering techniques are adapted from [voxel-musou](https://github.com/mike007jd/voxel-musou) (MIT, © 2026 BubuAi): the lens-side crowd clear and lens-clear shader, hero-local hit-stop with victim shudder, hit tint and flinch variants, the launch apex float and bounce, wind-up telegraphs with feints, and the post chain (square-bokeh DoF, split-tone grade, ordered-dither retro finish).
- Pilot portraits come from The Spriters Resource: Amuro Ray from *SD Gundam G Generation* (PlayStation, ripped by Arima), and Bright Noa and Hayato Kobayashi from *SD Gundam G Generation Wars* (PlayStation 2). Kai Shiden uses the built-in pixel art. See `assets/portraits/README.md` to add more pilots.

## Disclaimer

This is a non-commercial fan project. Mobile Suit Gundam and all related names are © Sotsu · Sunrise. It is not affiliated with Sotsu, Sunrise or Bandai Namco.
