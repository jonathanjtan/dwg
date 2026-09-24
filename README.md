# Gundam Musou: Side 7

A voxel Dynasty Warriors: Gundam tribute running in the browser with three.js. You pilot Amuro's RX-78-2 through a Zeon raid on Side 7: cut through hundreds of Zaku IIs, defeat the squad leaders Denim and Gene, then drive off Char's red Zaku.

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

## Controls

| Action | Keyboard / mouse | Gamepad |
| --- | --- | --- |
| Move | WASD | Left stick |
| Camera | Mouse (click to lock), Q / E, wheel to zoom, R to recenter | Right stick |
| Attack (beam saber) | J / left click | X / Square |
| Charge attack | K / right click | Y / Triangle |
| Jump | Space | A / Cross |
| Boost dodge | L / Shift | B / Circle |
| SP attack | I / F | RB / R1 |
| Pause, mute, hide keys | Esc, M, H | Start |

Charge attacks change with how far into the combo you are, as in Dynasty Warriors:

- **K**: beam rifle shot (tap up to 3 times)
- **J K**: rising launcher slash
- **J J K**: spinning saber whirlwind
- **J J J K**: five-shot rifle spread
- **J J J J K**: shield rush
- **J J J J J K**: charged mega beam
- In the air: **J** aerial slash, **K** plunging slam

## How it's built

- `src/core/voxel.js`: voxel models authored with box, ellipsoid and mirror operations, then meshed with face culling, baked ambient occlusion, and greedy merging for the static town.
- `src/core/rig.js`: a 13-part humanoid rig with keyframed pose clips. It drives both Object3D rigs (the Gundam and the commanders) and `InstancedMesh` crowds of up to 300 Zakus.
- `src/game/`: the hero moveset (`moves.js`), the Guntank (`tank.js`), crowd AI with attack tokens, officers and Char, combat, projectiles and the stage script.
- `src/net/net.js`: co-op networking. The crowd is packed into an Int16Array per snapshot, and effect, sound and HUD events are replicated.
- `src/fx/fx.js`: instanced cube particles for sparks, fire, smoke and debris, plus shockwave rings and the saber ribbon trail.
- `src/audio/audio.js`: WebAudio-synthesized sound effects.
- `src/audio/music.js`: the score, synthesized live. It's original anime hard rock with double-tracked distorted guitars, bass, a rock kit, a gliding lead, pads and arps. There's a battle theme, a boss theme for Char, a title theme, and victory and defeat stingers.
- `src/world/world.js`: the Side 7 town and the O'Neill cylinder shell curving up into the sky.
- `src/post.js`: the MSAA HDR target, capped bloom, depth of field, grade and dither.

## Credits

- Several feel and rendering techniques are adapted from [voxel-musou](https://github.com/mike007jd/voxel-musou) (MIT, © 2026 BubuAi): the lens-side crowd clear and lens-clear shader, hero-local hit-stop with victim shudder, hit tint and flinch variants, the launch apex float and bounce, wind-up telegraphs with feints, and the post chain (square-bokeh DoF, split-tone grade, ordered-dither retro finish).
- Pilot portraits come from The Spriters Resource: Amuro Ray from *SD Gundam G Generation* (PlayStation, ripped by Arima), and Bright Noa and Hayato Kobayashi from *SD Gundam G Generation Wars* (PlayStation 2). See `assets/portraits/README.md` to add more pilots.

## Disclaimer

This is a non-commercial fan project. Mobile Suit Gundam and all related names are © Sotsu · Sunrise. It is not affiliated with Sotsu, Sunrise or Bandai Namco.
