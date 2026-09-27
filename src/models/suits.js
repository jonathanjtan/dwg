// The palette every voxel suit shares. Each suit's model lives in its own module (gundam.js, zaku.js, ...), sculpted
// with core/sculpt.js. Characters face +Z; their right side is -X; every part is authored around its own pivot.
import { Palette } from '../core/voxel.js';

export const pal = new Palette();
