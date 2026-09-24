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

const cache = {};
export function portrait(name, bg = '#0b1424') {
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
