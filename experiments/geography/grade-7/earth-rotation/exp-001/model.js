export const TAU = Math.PI * 2;
export const RAD = Math.PI / 180;
export const CITIES = {
  beijing: { name: '北京', lat: 39.9, lon: 116.4 },
  london: { name: '伦敦', lat: 51.5, lon: -0.1 },
  'new-york': { name: '纽约', lat: 40.7, lon: -74 },
  sydney: { name: '悉尼', lat: -33.9, lon: 151.2 },
  quito: { name: '基多', lat: -0.2, lon: -78.5 },
};
export const wrap = (value, period) => ((value % period) + period) % period;
export const rotationForHour = (city, hour) => (hour - 12) * Math.PI / 12 - city.lon * RAD;
export const solarHour = (city, rotation) => wrap(12 + (city.lon * RAD + rotation) * 12 / Math.PI, 24);
export function phaseAt(hour) {
  if (Math.abs(hour - 6) < 0.04) return 'sunrise';
  if (Math.abs(hour - 18) < 0.04) return 'sunset';
  return hour > 6 && hour < 18 ? 'day' : 'night';
}
export function surfacePoint(lat, lon, rotation = 0) {
  const latitude = lat * RAD;
  const angle = lon * RAD + rotation;
  return [Math.cos(latitude) * Math.sin(angle), Math.sin(latitude), Math.cos(latitude) * Math.cos(angle)];
}
export function toCamera([x, y, z], yaw, pitch) {
  const sideways = Math.cos(yaw) * x - Math.sin(yaw) * z;
  const depth = Math.sin(yaw) * x + Math.cos(yaw) * z;
  return [sideways, Math.cos(pitch) * y - Math.sin(pitch) * depth, Math.sin(pitch) * y + Math.cos(pitch) * depth];
}
export function fromCamera(x, y, z, yaw, pitch) {
  const vertical = Math.cos(pitch) * y + Math.sin(pitch) * z;
  const depth = -Math.sin(pitch) * y + Math.cos(pitch) * z;
  return [Math.cos(yaw) * x + Math.sin(yaw) * depth, vertical, -Math.sin(yaw) * x + Math.cos(yaw) * depth];
}
