import { RAD, TAU, wrap, toCamera, fromCamera, surfacePoint } from './model.js';

// Orthographic globe. Shading, city markers and solar time share world coordinates.
export class Globe {
  constructor(canvas, land) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sphere = document.createElement('canvas');
    this.sphere.width = this.sphere.height = 420;
    this.sctx = this.sphere.getContext('2d');
    this.pixels = this.sctx.createImageData(420, 420);
    this.normals = [];
    for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
      const nx = (x + 0.5 - 210) / 209, ny = -(y + 0.5 - 210) / 209;
      const squared = nx * nx + ny * ny;
      if (squared <= 1) this.normals.push([4 * (y * 420 + x), nx, ny, Math.sqrt(1 - squared)]);
    }
    const map = document.createElement('canvas');
    map.width = 1024; map.height = 512;
    const ctx = map.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#347b96'; ctx.fillRect(0, 0, 1024, 512);
    for (const feature of land.features) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const rings of polygons) {
        ctx.beginPath();
        for (const ring of rings) {
          ring.forEach(([lon, lat], index) => {
            const x = (lon + 180) / 360 * 1024, y = (90 - lat) / 180 * 512;
            if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
        ctx.fillStyle = '#a4c5a6'; ctx.fill('evenodd');
        ctx.strokeStyle = '#bfd8bd'; ctx.lineWidth = .65; ctx.stroke();
      }
    }
    this.texture = ctx.getImageData(0, 0, 1024, 512).data;
  }

  render(state) {
    const { rotation, yaw, pitch, grid, city } = state;
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = bounds.width, height = bounds.height;
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const radius = Math.min(height * .385, width * .32);
    const cx = width * .54, cy = height * .49;
    const project = point => { const [x, y, z] = toCamera(point, yaw, pitch); return [cx + radius * x, cy - radius * y, z]; };
    for (let i = 0; i < 68; i++) {
      ctx.fillStyle = `rgba(169,200,220,${.10 + (i % 4) * .055})`;
      ctx.fillRect(((i * 137.51) % 997) / 997 * width, ((i * 79.37) % 499) / 499 * height, i % 5 ? 1 : 1.6, i % 5 ? 1 : 1.6);
    }
    ctx.strokeStyle = '#91bace12'; ctx.lineWidth = 1;
    for (const size of [1.18, 1.44]) { ctx.beginPath(); ctx.ellipse(cx, cy, radius * size, radius * size, 0, 0, TAU); ctx.stroke(); }
    const glow = ctx.createRadialGradient(cx, cy, radius * .85, cx, cy, radius * 1.15);
    glow.addColorStop(0, '#6dbedf00'); glow.addColorStop(.55, '#70c9e421'); glow.addColorStop(1, '#70c9e400');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.15, 0, TAU); ctx.fill();
    const key = `${yaw.toFixed(5)},${pitch.toFixed(5)}`;
    if (this.cameraKey !== key) {
      this.cameraKey = key;
      this.worldNormals = this.normals.map(([index, x, y, z]) => {
        const [wx, wy, wz] = fromCamera(x, y, z, yaw, pitch);
        return [index, Math.atan2(wx, wz), Math.acos(Math.max(-1, Math.min(1, wy))) / Math.PI, wz, z];
      });
    }
    const pixels = this.pixels.data, texture = this.texture;
    for (const [index, longitude, latitude, sunlight, facing] of this.worldNormals) {
      const tx = Math.floor(wrap(longitude - rotation + Math.PI, TAU) / TAU * 1024);
      const ty = Math.min(511, Math.floor(latitude * 512));
      const source = 4 * (ty * 1024 + tx);
      const lighting = sunlight > 0 ? .43 + .56 * Math.sqrt(sunlight) : .105;
      const rim = Math.pow(1 - facing, 3) * 30;
      pixels[index] = texture[source] * lighting + rim * .35;
      pixels[index + 1] = texture[source + 1] * lighting + rim * .8;
      pixels[index + 2] = texture[source + 2] * lighting + rim;
      pixels[index + 3] = 255;
    }
    this.sctx.putImageData(this.pixels, 0, 0);
    ctx.drawImage(this.sphere, cx - radius, cy - radius, radius * 2, radius * 2);
    const drawCurve = (points, color, lineWidth = .65, dash = []) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash(dash);
      let drawing = false;
      for (const point of points) {
        const [x, y, z] = project(point);
        if (z > .015) { if (drawing) ctx.lineTo(x, y); else ctx.moveTo(x, y); drawing = true; } else drawing = false;
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    if (grid) {
      for (let lat = -60; lat <= 60; lat += 30) drawCurve(Array.from({ length: 181 }, (_, i) => surfacePoint(lat, i * 2, rotation)), lat === 0 ? '#dfedcf65' : '#d1ebea28', lat === 0 ? 1 : .6);
      for (let lon = 0; lon < 360; lon += 30) drawCurve(Array.from({ length: 91 }, (_, i) => surfacePoint(i * 2 - 90, lon, rotation)), '#d1ebea28');
    }
    drawCurve(Array.from({ length: 361 }, (_, i) => [Math.cos(i * RAD), Math.sin(i * RAD), 0]), '#f5d299b0', 1.1, [4, 4]);
    const [nx, ny] = project([0, 1.14, 0]), [sx, sy] = project([0, -1.14, 0]);
    ctx.strokeStyle = '#b3c6d769'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#cddfe9'; ctx.textAlign = 'center';
    ctx.fillText('N', nx, ny - 9); if (pitch < 1.2) ctx.fillText('S', sx, sy + 17);
    const [sunX, sunY] = toCamera([0, 0, 1], yaw, pitch);
    const sunLength = Math.hypot(sunX, sunY);
    if (sunLength > .2) {
      const ux = sunX / sunLength, uy = -sunY / sunLength;
      const tipX = cx + ux * radius * 1.13, tipY = cy + uy * radius * 1.13;
      const endX = cx + ux * radius * 1.62, endY = cy + uy * radius * 1.62;
      ctx.strokeStyle = '#e1c08688'; ctx.lineWidth = 1;
      for (const offset of [-12, 0, 12]) {
        const ax = tipX - uy * offset, ay = tipY + ux * offset;
        ctx.beginPath(); ctx.moveTo(endX - uy * offset, endY + ux * offset); ctx.lineTo(ax, ay); ctx.lineTo(ax + ux * 7 - uy * 3, ay + uy * 7 + ux * 3); ctx.moveTo(ax, ay); ctx.lineTo(ax + ux * 7 + uy * 3, ay + uy * 7 - ux * 3); ctx.stroke();
      }
      ctx.fillStyle = '#e4c894'; ctx.font = '10px system-ui';
      ctx.fillText('太阳光', Math.max(28, Math.min(width - 28, endX)), Math.max(20, Math.min(height - 48, endY - 22)));
    }
    const [x, y, z] = project(surfacePoint(city.lat, city.lon, rotation));
    if (z > .02) {
      ctx.fillStyle = '#a6edcb20'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d4ffe5'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#102824'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 11px system-ui'; ctx.textAlign = x > cx + radius * .55 ? 'right' : 'left';
      const labelX = x + (ctx.textAlign === 'right' ? -12 : 12);
      ctx.lineWidth = 4; ctx.strokeStyle = '#142831'; ctx.strokeText(city.name, labelX, y - 10); ctx.fillStyle = '#e4fff0'; ctx.fillText(city.name, labelX, y - 10);
    } else {
      ctx.textAlign = 'center'; ctx.fillStyle = '#adbfcd'; ctx.font = '10px system-ui';
      ctx.fillText(`${city.name}在地球背面 · 点击“面向地点”查看`, width / 2, height - 32);
    }
    const points = Array.from({ length: 45 }, (_, i) => surfacePoint(pitch > 1.2 ? 43 : -14, (yaw - rotation) / RAD - 37 + i * 1.35, rotation).map(v => v * 1.025));
    drawCurve(points, '#bdeddcaa', 1.4);
    const a = project(points.at(-3)), b = project(points.at(-1));
    if (a[2] > 0 && b[2] > 0) {
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.beginPath(); ctx.moveTo(b[0] - 8 * Math.cos(angle - .4), b[1] - 8 * Math.sin(angle - .4)); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] - 8 * Math.cos(angle + .4), b[1] - 8 * Math.sin(angle + .4)); ctx.strokeStyle = '#bdeddc'; ctx.stroke();
    }
  }
}
