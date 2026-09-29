/** Must be called from a user gesture; callers should display any failure. */
export async function toggleFullscreen(element = document.documentElement) {
  if (document.fullscreenElement) return document.exitFullscreen();
  if (!element.requestFullscreen) throw new Error('当前浏览器不支持全屏，请使用浏览器的全屏功能。');
  return element.requestFullscreen();
}
