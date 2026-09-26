# Mobile suit renders

SD renders cut from SD Gundam G Generation unit sheets on The Spriters Resource, mostly G Generation Wars (PS2): one
posed render per suit, trimmed to its bounds, scaled to 256 px on the long side and brightened (the games light them
dimly: gain up to 1.8 so the 97th-percentile brightness reaches 235, then gamma 0.85). Mixing games is fine when Wars
lacks a suit.

| File | Unit | Shown for |
| --- | --- | --- |
| `gundam.png` | RX-78-2 Gundam | Amuro |
| `guncannon.png` | RX-77-2 Guncannon | Kai |
| `ball.png` | RB-79 Ball | the Ball squad leader |
| `deltaplus.png` | MSN-001A1 Delta Plus | Riddhe (from *SD Gundam G Generation Genesis*, PS4: an evade frame) |
| `f91.png` | F91 Gundam F91 | Seabook |
| `x1kai.png` | XM-X1 Crossbone Gundam X1 Kai | Tobia (the Wars sheet's X1, which the Kai barely differs from) |
| `guntank.png` | RX-75 Guntank | Hayato (co-op) |
| `zaku2.png` | MS-06F Zaku II | Gene, squad leaders |
| `zaku2c.png` | MS-06F Zaku II Commander Type | Denim |
| `zaku2s.png` | MS-06S Char's Zaku II | Char |

`src/ui/units.js` maps ids to files; the select cards and spec sheet, the player HUD, commander bars, the co-op lobby
and the ally bar use them.
