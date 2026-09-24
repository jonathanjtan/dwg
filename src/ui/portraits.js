// 16x16 pixel-art pilot portraits drawn to canvases.
const PAL = {
  '.': null,
  h: '#6b3f22', H: '#43260f', s: '#f1c9a5', S: '#d49f7a', e: '#1e2030', w: '#ffffff', m: '#b0685a',
  b: '#2d5fb8', B: '#1c3a78', r: '#c0283a', R: '#861a28', W: '#dfe3ea', k: '#2a2a30', y: '#f0d060', Y: '#c9a53a',
  g: '#4f6e3e', G: '#34502a', o: '#d9772e', O: '#a4521c', n: '#1a1a1e', p: '#e67aa0', t: '#8c96a8',
};

const ART = {
  amuro: [
    '................',
    '.....hhhhhh.....',
    '...hhhhhhhhhh...',
    '..hhhhHhhhhhhh..',
    '..hhhhhhhhhHhh..',
    '.hhhsshhhsshhhh.',
    '.hhssssssssshhh.',
    '.hhssssssssshhh.',
    '..hsseessseesh..',
    '..hssssssssssh..',
    '...sssssSssss...',
    '...SsssmmsssS...',
    '....SssssssS....',
    '.....SSssSS.....',
    '...bbbbwwbbbb...',
    '..bbbbbwwbbbbb..',
  ],
  char: [
    '................',
    '....rrrrrrrr....',
    '...rrrrrrrrrr...',
    '..rrrRRRRRRrrr..',
    '..rWWWWWWWWWWr..',
    '.yrWkkkWWkkkWry.',
    '.yrWWWWWWWWWWry.',
    '.yysWWWWWWWWsyy.',
    '.yyssssssssssyy.',
    '..yssssSsssssy..',
    '...sssssssssss..',
    '....sssmmmsss...',
    '.....SSSSSSS....',
    '...rrrrYYrrrr...',
    '..rrrrrYYrrrrr..',
    '.rrrrrrYYrrrrrr.',
  ],
  denim: [
    '................',
    '.....gggggg.....',
    '...gggggggggg...',
    '..gggggggggggg..',
    '..ggGGGGGGGGgg..',
    '..gGssssssssGg..',
    '..gsseesseessg..',
    '..gssssssssssg..',
    '..gsssSssSsssg..',
    '...sHHHHHHHHs...',
    '...ssHHmmHHss...',
    '....sHHHHHHs....',
    '.....ssssss.....',
    '...ggggYYgggg...',
    '..gggggYYggggg..',
    '.ggggggYYgggggg.',
  ],
  gene: [
    '................',
    '....oooooooo....',
    '...oooOoooooo...',
    '..ooooooooOooo..',
    '..ooosssssoooo..',
    '.oosssssssssoo..',
    '.ossweesweessO..',
    '.osseesseessso..',
    '..sssssssssss...',
    '..ssssssSssss...',
    '...sssmmmmsss...',
    '....sssssssS....',
    '.....SSSSSS.....',
    '...ggggYYgggg...',
    '..gggggYYggggg..',
    '.ggggggYYgggggg.',
  ],
  bright: [
    '................',
    '....nnnnnnnn....',
    '...nnnnnnnnnn...',
    '..nnnnnnnnnnnn..',
    '..nnssssssssnn..',
    '..nsnnnsnnnssn..',
    '..nsseessseesn..',
    '..nssssssssssn..',
    '...sssssSsssss..',
    '...sssssssssss..',
    '....sssmmmsss...',
    '.....sssssss....',
    '......SSSSS.....',
    '...WWWWbbWWWW...',
    '..WWWWWbbWWWWW..',
    '.WWWWWWbbWWWWWW.',
  ],
};

// Optional image portraits listed in assets/portraits/manifest.json override the pixel art.
// An entry is either a file name (one image) or a sprite sheet of expressions:
//   { "file": "amuro.png", "cols": 3, "rows": 2, "gap": 1, "trimBottom": 10, "key": [32, 200, 248],
//     "frames": { "idle": 0, "talk": 1, "shout": 2, "blink": 3, "hurt": 4, "hurtTalk": 5 } }
const external = {};
const DEFAULT_FRAMES = { idle: 0, talk: 1, shout: 2, blink: 3, hurt: 4, hurtTalk: 5 };

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cropSheet(img, e) {
  const cols = e.cols || 1, rows = e.rows || 1, gap = e.gap ?? 1;
  const w = e.cellW || Math.floor((img.width - gap * (cols - 1)) / cols);
  const h = e.cellH || Math.floor((img.height - (e.trimBottom || 0) - gap * (rows - 1)) / rows);
  const out = {};
  for (const [expr, idx] of Object.entries(e.frames || DEFAULT_FRAMES)) {
    if (idx >= cols * rows) continue;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, (idx % cols) * (w + gap), Math.floor(idx / cols) * (h + gap), w, h, 0, 0, w, h);
    if (e.key) {
      // chroma-key the sheet's flat background colour to transparent
      const data = g.getImageData(0, 0, w, h);
      const d = data.data, [kr, kg, kb] = e.key;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - kr) + Math.abs(d[i + 1] - kg) + Math.abs(d[i + 2] - kb) < 24) d[i + 3] = 0;
      }
      g.putImageData(data, 0, 0);
    }
    out[expr] = c.toDataURL();
  }
  return out;
}

export async function loadPortraits() {
  try {
    const res = await fetch('assets/portraits/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const map = await res.json();
    await Promise.all(Object.entries(map).map(async ([name, entry]) => {
      const e = typeof entry === 'string' ? { file: entry } : entry;
      const img = await loadImage('assets/portraits/' + e.file);
      if (!img) return;
      external[name] = e.cols || e.rows ? cropSheet(img, e) : { idle: img.src };
    }));
    return Object.keys(external).length > 0;
  } catch (e) {
    return false;
  }
}

export function hasSheet(name) {
  return !!external[name];
}

const cache = {};
export function portrait(name, bg = '#0b1424', expr = 'idle') {
  const ext = external[name];
  if (ext) return ext[expr] || ext.idle;
  const key = name + bg;
  if (cache[key]) return cache[key];
  const art = ART[name] || ART.amuro;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 16, 16); }
  for (let y = 0; y < 16; y++) {
    const row = (art[y] || '').padEnd(16, '.');
    for (let x = 0; x < 16; x++) {
      const col = PAL[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  const url = c.toDataURL();
  cache[key] = url;
  return url;
}
