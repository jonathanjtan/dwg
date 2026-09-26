# Mobile suit renders

SD renders cut from the SD Gundam G Generation Wars (PS2) unit sheets on The Spriters Resource: one posed render per
suit, trimmed to its bounds, scaled to 256 px on the long side and brightened (the game lights them dimly).

| File | Unit | Shown for |
| --- | --- | --- |
| `gundam.png` | RX-78-2 Gundam | Amuro |
| `guncannon.png` | RX-77-2 Guncannon | Kai |
| `guntank.png` | RX-75 Guntank | Hayato (co-op) |
| `zaku2.png` | MS-06F Zaku II | Gene, squad leaders |
| `zaku2c.png` | MS-06F Zaku II Commander Type | Denim |
| `zaku2s.png` | MS-06S Char's Zaku II | Char |

`src/ui/units.js` maps ids to files; the select cards and spec sheet, the player HUD, commander bars, the co-op lobby
and the ally bar use them.
