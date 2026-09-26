// SD mobile suit renders from the SD Gundam G Generation games (assets/units), shown beside names in the UI.
// Ids are the roster's suit ids plus the Zeon suits the officers fly.
export const UNITS = ['gundam', 'guncannon', 'ball', 'deltaplus', 'f91', 'x1kai', 'guntank', 'zaku2', 'zaku2c', 'zaku2s'];

export function unitSprite(id) {
  return UNITS.includes(id) ? `assets/units/${id}.png` : '';
}

// An <img> for a unit that removes itself if the file is missing.
export function unitImg(id, cls) {
  const src = unitSprite(id);
  return src ? `<img class="${cls}" src="${src}" alt="" onerror="this.remove()">` : '';
}
