# Gundam Musou: Side 7

A voxel Dynasty Warriors: Gundam tribute running in the browser with three.js. You pilot Amuro's RX-78-2 through a Zeon raid on Side 7: clear the plaza, take the three Zeon landing zones, defeat Denim and Gene, then drive off Char's red Zaku.

Inspired by [voxel-musou](https://github.com/mike007jd/voxel-musou), the Zhao Yun voxel musou demo. Models, animation, effects, audio and music are procedural and written from scratch. The only image assets are the pilot portrait sheets.

## Play

**https://jonathanjtan.github.io/dwg/** (desktop browser with keyboard, mouse or gamepad)

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

If the Guntank is destroyed it redeploys after 8 seconds. The mission fails only if the Gundam falls.

Connectivity: players connect directly, which works on most home networks. There's no TURN relay, so two players who are both behind strict or symmetric NATs (some corporate or mobile networks) may not be able to connect. For local testing, add `?localnet` to the URL to use a same-browser BroadcastChannel transport between two tabs.

## The mission

Zeon comes in squads, as in Dynasty Warriors: Gundam. Garrisons hold their posts until you come close. Only the front rank presses in to swing at you, while the rest form a watching ring further out.

1. **The plaza.** Four squads meet the Gundam as it lands. Clear 30 Zaku.
2. **Landing zones.** Three supply pods drop out of the colony sky, each with a garrison and a squad leader. Pods keep dropping reinforcements until you defeat the squad leader and take the zone. An on-screen marker and the minimap point to the nearest one.
3. **Denim, then Gene.** Commander-type Zaku arrive with a camera cut and name card.
4. **Char.** Drive off the Red Comet.

Staying alive:

- **Armor recovery:** part of every hit (the striped red segment of the HP bar) repairs itself if you avoid damage for a few seconds.
- **Repair kits** drop every 20 KOs or so, and sooner when you're hurt. Squad leaders and commanders drop large kits. Kits drift toward you when you're close.
- Zaku telegraph their heat hawk swings with a glint. A red glint means the blow is real.

## Controls

| Action | Keyboard / mouse | Gamepad |
| --- | --- | --- |
| Move | WASD | Left stick |
| Camera | Mouse (click to lock), Q / E, wheel to zoom, R to recenter | Right stick |
| Attack (beam saber) | J / left click | X / Square |
| Charge attack (hold for a charge shot) | K / right click | Y / Triangle |
| Jump (hold to hover on the thrusters) | Space | A / Cross |
| Boost dodge (hold to boost dash) | L / Shift | B / Circle |
| SP attack (hold for the charge SP) | I / F | RB / R1 |
| Pause, sound on/off, hide keys | Esc, M, H | Start |

Sound starts off. Press M, or use the SOUND button in the pause menu, to turn it on.

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

The boost gauge under the SP bar drains while you dash or hover and refills once the thrusters rest.

## How it's built

- `src/core/voxel.js`: voxel models authored with box, ellipsoid and mirror operations, then meshed with face culling, baked ambient occlusion, and greedy merging for the static town.
- `src/core/rig.js`: a 13-part humanoid rig with keyframed pose clips. It drives both Object3D rigs (the Gundam and the commanders) and `InstancedMesh` crowds of up to 300 Zakus.
- `src/game/`: the hero moveset (`moves.js`: poses, hit shapes, weapon timelines, timed effects), the Guntank (`tank.js`), squad AI with attack tokens and a front-rank cap (`crowd.js`), landing zones (`bases.js`), officers and Char, combat, projectiles and the stage script.
- `src/net/net.js`: co-op networking. The crowd is packed into an Int16Array per snapshot, and effect, sound and HUD events are replicated.
- `src/fx/fx.js`: instanced cube particles for sparks, fire, smoke, embers and debris, anime impact stars, beam afterglow, ground scorch decals, shockwave rings and the Catmull-Rom smoothed saber ribbon trail.
- `src/audio/sfx.js`: the sound bank. Every effect is synthesized at load in an `OfflineAudioContext`, several takes per sound, each tuned differently, so no two triggers in a row are identical. Each saber move has its own voice, and the slash sweeps across the stereo field with the blade. Hits, footsteps, boosts and explosions are layered from a transient, a saturated body, ringing armor resonances, debris crackle and a low push. The weapon voices are tuned to *DW: Gundam Reborn*'s gameplay audio, measured band by band. Beams buzz around 160 Hz. Saber hits crunch near 2 kHz and ring at the game's armor partials between 0.7 and 1.15 kHz. There is little air above 6 kHz.
- `src/audio/audio.js`: plays the bank's takes, panned against the camera and dulled with distance, through a generated colony-hall reverb. It also runs the continuous beam-saber hum and thruster roar, and falls back to live synthesis until the bank is ready.
- `src/audio/music.js`: the score, synthesized live. It's original anime hard rock with double-tracked distorted guitars, bass, a rock kit, a gliding lead, pads and arps. There's a battle theme, a boss theme for Char, a title theme, and victory and defeat stingers.
- `src/world/world.js`: the Side 7 town and the O'Neill cylinder shell curving up into the sky.
- `src/post.js`: the MSAA HDR target, capped bloom, depth of field, grade and dither.

## Credits

- Several feel and rendering techniques are adapted from [voxel-musou](https://github.com/mike007jd/voxel-musou) (MIT, © 2026 BubuAi): the lens-side crowd clear and lens-clear shader, hero-local hit-stop with victim shudder, hit tint and flinch variants, the launch apex float and bounce, wind-up telegraphs with feints, and the post chain (square-bokeh DoF, split-tone grade, ordered-dither retro finish).
- Pilot portraits come from The Spriters Resource: Amuro Ray from *SD Gundam G Generation* (PlayStation, ripped by Arima), and Bright Noa and Hayato Kobayashi from *SD Gundam G Generation Wars* (PlayStation 2). See `assets/portraits/README.md` to add more pilots.

## Disclaimer

This is a non-commercial fan project. Mobile Suit Gundam and all related names are © Sotsu · Sunrise. It is not affiliated with Sotsu, Sunrise or Bandai Namco.
