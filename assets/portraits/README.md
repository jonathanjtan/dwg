# Pilot portraits

Drop portrait images here and list them in `manifest.json` to replace the built-in 16x16 pixel art. Names are
`amuro`, `char`, `denim`, `gene` and `bright`; any name left out keeps its pixel-art fallback.

A single image:

```json
{ "char": "char.png" }
```

A sprite sheet of expressions, like the SD Gundam G-Generation portrait sheets (3 x 2 cells, 1 px separators, a
caption strip along the bottom):

```json
{
  "amuro": {
    "file": "amuro.png", "cols": 3, "rows": 2, "gap": 1, "trimBottom": 10, "key": [32, 200, 248],
    "frames": { "idle": 0, "talk": 1, "shout": 2, "blink": 3, "hurtTalk": 4, "hurt": 5 }
  }
}
```

Frames are numbered left to right, top to bottom. `key` is an RGB background colour made transparent. `cellW` /
`cellH` override the computed cell size if a sheet's margins differ. The HUD uses `idle`, flaps between `idle` and `talk` while that pilot speaks, shows `shout` on the SP
cut-in, `hurt` when the Gundam takes a hit, and `blink` every few seconds.
