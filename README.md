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
- `src/game/`: the hero moveset (`moves.js`), crowd AI with attack tokens, officers and Char, combat, projectiles and the stage script.
- `src/fx/fx.js`: instanced cube particles for sparks, fire, smoke and debris, plus shockwave rings and the saber ribbon trail.
- `src/audio/audio.js`: WebAudio-synthesized sound effects.
- `src/audio/music.js`: the score, synthesized live. It's original anime hard rock with double-tracked distorted guitars, bass, a rock kit, a gliding lead, pads and arps. There's a battle theme, a boss theme for Char, a title theme, and victory and defeat stingers.
- `src/world/world.js`: the Side 7 town and the O'Neill cylinder shell curving up into the sky.
- `src/post.js`: the MSAA HDR target, capped bloom, depth of field, grade and dither.

## Credits

- Several feel and rendering techniques are adapted from [voxel-musou](https://github.com/mike007jd/voxel-musou) (MIT, © 2026 BubuAi): the lens-side crowd clear and lens-clear shader, hero-local hit-stop with victim shudder, hit tint and flinch variants, the launch apex float and bounce, wind-up telegraphs with feints, and the post chain (square-bokeh DoF, split-tone grade, ordered-dither retro finish).
- Pilot portraits come from The Spriters Resource: Amuro Ray from *SD Gundam G Generation* (PlayStation, ripped by Arima), and Bright Noa from *SD Gundam G Generation Wars* (PlayStation 2). See `assets/portraits/README.md` to add more pilots.

## Disclaimer

This is a non-commercial fan project. Mobile Suit Gundam and all related names are © Sotsu · Sunrise. It is not affiliated with Sotsu, Sunrise or Bandai Namco.
