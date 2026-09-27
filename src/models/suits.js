// Voxel mobile suits. Characters face +Z; their right side is -X.
// Every part is authored around its own pivot at the origin.
import { Palette, VoxelModel } from '../core/voxel.js';

export const pal = new Palette();
const M = () => new VoxelModel(pal);
