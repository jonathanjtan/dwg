# Gundam Musou: Side 7

A voxel Dynasty Warriors: Gundam tribute running in the browser with three.js. You pilot Amuro's RX-78-2 through a Zeon raid on Side 7: cut through hundreds of Zaku IIs, defeat the squad leaders Denim and Gene, then drive off Char's red Zaku.

Inspired by [voxel-musou](https://github.com/mike007jd/voxel-musou), the Zhao Yun voxel musou demo. Everything here (models, animation, effects, audio, music) is procedural and written from scratch. There are no asset files.

## Play

Open `index.html` through any static file server, or use the GitHub Pages deployment.

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
- `src/audio/audio.js`: WebAudio-synthesized sound effects and two original chiptune-rock tracks.
- `src/world/world.js`: the Side 7 town and the O'Neill cylinder shell curving up into the sky.

## Disclaimer

This is a non-commercial fan project. Mobile Suit Gundam and all related names are © Sotsu · Sunrise. It is not affiliated with Sotsu, Sunrise or Bandai Namco.
