// SD mobile suit renders from SD Gundam G Generation Wars (assets/units), shown beside names in the UI; the Ball's is a
// render of the game's own voxel model. Ids are the roster's suit ids plus the Zeon suits the officers fly.
export const UNITS = ['gundam', 'guncannon', 'ball', 'f91', 'guntank', 'zaku2', 'zaku2c', 'zaku2s'];

export function unitSprite(id) {
  return UNITS.includes(id) ? `assets/units/${id}.png` : '';
}

// An <img> for a unit that removes itself if the file is missing.
export function unitImg(id, cls) {
  const src = unitSprite(id);
  return src ? `<img class="${cls}" src="${src}" alt="" onerror="this.remove()">` : '';
}
