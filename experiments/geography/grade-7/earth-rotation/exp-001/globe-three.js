import * as THREE from '../../../../../shared/vendor/three/0.186.1/three.module.js';
import { RAD, TAU, surfacePoint } from './model.js';

function makeMap(land) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#225e82'; ctx.fillRect(0, 0, 2048, 1024);
  const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
  ocean.addColorStop(0, '#79aeb9'); ocean.addColorStop(.28, '#225c82'); ocean.addColorStop(.5, '#246687'); ocean.addColorStop(.72, '#235677'); ocean.addColorStop(1, '#9abcbd');
  ctx.fillStyle = ocean; ctx.fillRect(0, 0, 2048, 1024);
  for (const feature of land.features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const rings of polygons) {
      ctx.beginPath();
      for (const ring of rings) {
        ring.forEach(([lon, lat], index) => { const x = (lon + 180) / 360 * 2048, y = (90 - lat) / 180 * 1024; if (!index) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.closePath();
      }
      const color = ctx.createLinearGradient(0, 0, 0, 1024);
      color.addColorStop(0, '#e3e7d6'); color.addColorStop(.18, '#a5bd91'); color.addColorStop(.38, '#bcbd85'); color.addColorStop(.5, '#779b75'); color.addColorStop(.62, '#a9b882'); color.addColorStop(.85, '#c4d2bc'); color.addColorStop(1, '#edf1e5');
      ctx.fillStyle = color; ctx.fill('evenodd'); ctx.strokeStyle = '#cee0b2'; ctx.lineWidth = .8; ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
function line(points, color, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
  const material = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .035, gapSize: .025 }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const object = new THREE.Line(geometry, material); if (dashed) object.computeLineDistances(); return object;
}

export class ThreeGlobe {
  constructor(canvas, land) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x0d1c29, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, .01, 100);
    this.earth = new THREE.Group(); this.scene.add(this.earth);
    this.material = new THREE.ShaderMaterial({
      uniforms: { earthMap: { value: makeMap(land) } },
      vertexShader: `varying vec3 vLocal; varying vec3 vNormalWorld; varying vec3 vWorld;
        void main(){ vLocal=position; vNormalWorld=normalize(mat3(modelMatrix)*normal); vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
      fragmentShader: `uniform sampler2D earthMap; varying vec3 vLocal; varying vec3 vNormalWorld; varying vec3 vWorld;
        void main(){ vec3 p=normalize(vLocal); vec2 uv=vec2((atan(p.x,p.z)+3.14159265)/6.2831853,asin(clamp(p.y,-1.0,1.0))/3.14159265+0.5);
          vec3 base=texture2D(earthMap,uv).rgb; vec3 n=normalize(vNormalWorld); vec3 eye=normalize(cameraPosition-vWorld); vec3 sun=vec3(0.0,0.0,1.0);
          float light=dot(n,sun); float day=smoothstep(-0.012,0.018,light); float diffuse=0.25+0.9*pow(max(light,0.0),0.65);
          vec3 color=base*mix(0.10,diffuse,day); float rim=pow(1.0-max(dot(n,eye),0.0),3.4);
          color+=vec3(0.08,0.35,0.53)*rim*(0.12+day*0.65);
          float water=step(base.g,base.b); color+=vec3(0.7,0.86,0.82)*pow(max(dot(reflect(-sun,n),eye),0.0),35.0)*0.17*water*day;
          gl_FragColor=vec4(color,1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), this.material));
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.045, 64, 48), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: `varying vec3 n; varying vec3 p; void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);}`,
      fragmentShader: `varying vec3 n; varying vec3 p; void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(cameraPosition-p))),3.0); float sunlight=0.2+0.8*max(normalize(n).z,0.0);gl_FragColor=vec4(0.22,0.59,0.9,rim*sunlight*0.44);}`,
    })); this.scene.add(atmosphere);
    this.grid = new THREE.Group(); this.earth.add(this.grid);
    for (let latitude = -60; latitude <= 60; latitude += 30) this.grid.add(line(Array.from({ length: 181 }, (_, i) => surfacePoint(latitude, i * 2).map(x => x * 1.003)), latitude === 0 ? 0xc2e4ca : 0xb4d8dc, latitude === 0 ? .35 : .12));
    for (let longitude = 0; longitude < 360; longitude += 30) this.grid.add(line(Array.from({ length: 91 }, (_, i) => surfacePoint(i * 2 - 90, longitude).map(x => x * 1.003)), 0xb4d8dc, .12));
    this.scene.add(line(Array.from({ length: 241 }, (_, i) => [1.008 * Math.cos(i / 240 * TAU), 1.008 * Math.sin(i / 240 * TAU), 0]), 0xe8ca8a, .7, true));
    this.scene.add(line([[0, -1.2, 0], [0, 1.2, 0]], 0xa3c5d4, .5, true));
    this.marker = new THREE.Mesh(new THREE.SphereGeometry(.018, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdbffe9 })); this.scene.add(this.marker);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(.027, .033, 36), new THREE.MeshBasicMaterial({ color: 0xa9efc8, side: THREE.DoubleSide, transparent: true, opacity: .7 })); this.scene.add(this.halo);
    const starPositions = [];
    for (let i = 0; i < 900; i++) { const a = i * 2.39996, z = 1 - 2 * (i + .5) / 900, r = Math.sqrt(1 - z * z); starPositions.push(Math.cos(a) * r * 15, z * 15, Math.sin(a) * r * 15); }
    const stars = new THREE.BufferGeometry(); stars.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xb0d1dc, size: .025, transparent: true, opacity: .45, sizeAttenuation: true })));
    for (const x of [-.15, 0, .15]) this.scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(x, -.2, 1.75), .5, 0xe3c488, .07, .035));
    this.overlay = document.createElement('div'); this.overlay.className = 'three-labels';
    this.label = document.createElement('span'); this.label.className = 'three-city-label';
    this.north = document.createElement('span'); this.north.className = 'three-pole-label'; this.north.textContent = 'N';
    this.sunLabel = document.createElement('span'); this.sunLabel.className = 'three-sun-label'; this.sunLabel.textContent = '太阳光';
    this.behind = document.createElement('span'); this.behind.className = 'three-behind-label';
    this.overlay.append(this.label, this.north, this.sunLabel, this.behind); canvas.after(this.overlay);
    canvas.dataset.renderer = 'three';
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); document.querySelector('#message').textContent = '三维渲染暂时中断，请刷新页面或切换“二维兼容模式”。'; });
  }
  place(element, vector, width, height) {
    const point = vector.clone().project(this.camera);
    element.style.left = `${Math.max(25, Math.min(width - 35, (point.x + 1) / 2 * width))}px`;
    element.style.top = `${Math.max(18, Math.min(height - 44, (-point.y + 1) / 2 * height))}px`;
  }
  render(state) {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    if (width !== this.width || height !== this.height) { this.width = width; this.height = height; this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
    const { yaw, pitch } = state;
    const distance = width / height < 1.1 ? 4.35 : 3.85;
    this.camera.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
    // Match the original camera basis even at the poles, where lookAt's default up is singular.
    this.camera.up.set(-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch));
    this.camera.lookAt(0, 0, 0); this.camera.updateMatrixWorld();
    this.earth.rotation.y = state.rotation; this.grid.visible = state.grid;
    const position = new THREE.Vector3(...surfacePoint(state.city.lat, state.city.lon, state.rotation));
    this.marker.position.copy(position).multiplyScalar(1.02);
    this.halo.position.copy(position).multiplyScalar(1.023); this.halo.lookAt(position.clone().multiplyScalar(2));
    const visible = position.dot(this.camera.position.clone().sub(position)) > 0;
    this.label.hidden = !visible; this.behind.hidden = visible;
    this.label.textContent = state.city.name;
    this.behind.textContent = `${state.city.name}在地球背面 · 点击“面向地点”查看`;
    this.place(this.label, position.clone().multiplyScalar(1.08), width, height);
    this.place(this.north, new THREE.Vector3(0, 1.23, 0), width, height);
    this.place(this.sunLabel, new THREE.Vector3(-.1, -.12, 1.83), width, height);
    this.sunLabel.hidden = this.camera.position.z < -1;
    this.renderer.render(this.scene, this.camera);
  }
}
