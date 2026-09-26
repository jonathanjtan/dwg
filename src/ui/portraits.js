// 16x16 pixel-art pilot portraits drawn to canvases.
const PAL = {
  '.': null,
  h: '#6b3f22', H: '#43260f', s: '#f1c9a5', S: '#d49f7a', e: '#1e2030', w: '#ffffff', m: '#b0685a',
  b: '#2d5fb8', B: '#1c3a78', r: '#c0283a', R: '#861a28', W: '#dfe3ea', k: '#2a2a30', y: '#f0d060', Y: '#c9a53a',
  g: '#4f6e3e', G: '#34502a', o: '#d9772e', O: '#a4521c', n: '#1a1a1e', p: '#e67aa0', t: '#8c96a8',
  c: '#a8653a', C: '#74401f',
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
  kai: [
    '................',
    '.....cccccc.....',
    '...cccccccccc...',
    '..ccccCcccccCc..',
    '.cccccccccccccc.',
    '.cccCssssccCccc.',
    '.ccsssssssssscc.',
    '.ccssssssssssc..',
    '..ssCCsssCCsss..',
    '..sseessssessc..',
    '...ssssssSssss..',
    '...Sssssssmms...',
    '....SssssssS....',
    '.....SSssSS.....',
    '...WWWWttWWWW...',
    '..WWWWWttWWWWW..',
  ],
  hayato: [
    '................',
    '.....nnnnnn.....',
    '...nnnnnnnnnn...',
    '..nnnnnnnnnnnn..',
    '..nnnnnnnnnnnn..',
    '.nnnnnnnnnnnnnn.',
    '.nsssnnnnnnsssn.',
    '.sssnnsssnnnsss.',
    '.sssseessseesss.',
    '.ssssssssssssss.',
    '.SsssssSSsssssS.',
    '..SssssmmsssssS.',
    '...SSssssssSS...',
    '....SSSSSSSS....',
    '..bbbbbYYbbbbb..',
    '.bbbbbbYYbbbbbb.',
  ],
  ball: [
    '................',
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWWWWrrWWWWW..',
    '.WWWWWWrrWWWWWW.',
    '.WWttttttttttWW.',
    '.WtthhhhhhhhttW.',
    '.WtsssssssssstW.',
    '.WtsseesseesstW.',
    '.WtsssssSsssstW.',
    '.WtssssmmsssstW.',
    '.WtSssssssssStW.',
    '.WWttttttttttWW.',
    '..WWWWWWWWWWWW..',
    '..bbbbbWWbbbbb..',
    '.bbbbbbWWbbbbbb.',
  ],
  tobia: [
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
    '...bbbbwwbbbb...',
    '..bbbbbwwbbbbb..',
    '.bbbbbbwwbbbbbb.',
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
  for (const [expr, f] of Object.entries(e.frames || DEFAULT_FRAMES)) {
    // a frame is a grid index, or an explicit [x, y, w, h] rect for irregular cut-in sheets
    const [sx, sy, sw, sh] = Array.isArray(f)
      ? f
      : [(f % cols) * (w + gap), Math.floor(f / cols) * (h + gap), w, h];
    if (!Array.isArray(f) && f >= cols * rows) continue;
    const scale = Math.min(1, 256 / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const cw = c.width, chh = c.height;
    if (e.key) {
      // chroma-key the sheet's flat background colour to transparent
      const data = g.getImageData(0, 0, cw, chh);
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
      external[name] = e.cols || e.rows || e.frames ? cropSheet(img, e) : { idle: img.src };
      external[name].holdTalk = !!e.holdTalk;
    }));
    return Object.keys(external).length > 0;
  } catch (e) {
    return false;
  }
}

export function hasSheet(name) {
  return !!external[name];
}

// holdTalk: show the talk frame for the whole line instead of flapping (sheets whose talk frame is a different bust).
export function holdsTalk(name) {
  return !!external[name]?.holdTalk;
}

// Image portraits are downscaled art (smooth); the built-in 16x16 fallback is upscaled (pixelated).
export function renderingFor(name) {
  return external[name] ? 'auto' : 'pixelated';
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
