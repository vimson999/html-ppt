import { toggleFullscreen } from '../../../../../shared/js/classroom.js';
import { CITIES, RAD, TAU, rotationForHour, solarHour, phaseAt, wrap } from './model.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = { city: CITIES.beijing, rotation: rotationForHour(CITIES.beijing, 12), yaw: .8, pitch: .18, grid: true, playing: false, speed: 1 };
let globe;
let dirty = true;
let lastTime = 0;
let lastRender = 0;
let activeView = 'default';
let pendingFrame = 0;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let cameraTween;
const requestRender = () => { dirty = true; if (!pendingFrame) pendingFrame = requestAnimationFrame(frame); };

const phaseCopy = {
  day: ['☀ 白昼', '此刻，这里朝向太阳', '太阳光照亮这一侧，所在地点处于昼半球。'],
  night: ['☾ 黑夜', '此刻，这里背向太阳', '地球遮挡了太阳光，所在地点处于夜半球。'],
  sunrise: ['◒ 日出', '正在从黑夜进入白昼', '地点经过晨线，开始进入太阳照亮的半球。'],
  sunset: ['◓ 日落', '正在从白昼进入黑夜', '地点经过昏线，开始进入背向太阳的半球。'],
};
function updateReadout() {
  const hour = solarHour(state.city, state.rotation);
  const minutes = Math.round(hour * 60) % 1440;
  const text = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const phase = phaseAt(hour);
  $('#local-time').textContent = text;
  $('#time').value = hour;
  $('#time').setAttribute('aria-valuetext', `${text}，${phaseCopy[phase][0]}`);
  $('#day-marker').style.left = `${hour / 24 * 100}%`;
  $('#day-state').textContent = phaseCopy[phase][0];
  $('#day-state').classList.toggle('night', phase === 'night');
  $('#finding-title').textContent = phaseCopy[phase][1];
  $('#finding-text').textContent = phaseCopy[phase][2];
  const { lat, lon } = state.city;
  $('#coordinates').textContent = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
}
function frame(now) {
  pendingFrame = 0;
  const elapsed = lastTime ? Math.min((now - lastTime) / 1000, .1) : 0;
  lastTime = now;
  if (state.playing && !document.hidden) {
    state.rotation = wrap(state.rotation + elapsed * TAU / 60 * state.speed, TAU);
    dirty = true;
  }
  if (dirty && now - lastRender > 32) {
    globe?.render(state);
    updateReadout();
    dirty = false; lastRender = now;
  }
  if (state.playing || dirty) pendingFrame = requestAnimationFrame(frame);
}
function setPlaying(playing) {
  state.playing = playing;
  lastTime = 0;
  $('#play').innerHTML = `${playing ? 'Ⅱ' : '▶'} <span>${playing ? '暂停自转' : '播放自转'}</span>`;
  $('#play').setAttribute('aria-label', playing ? '暂停自转' : '播放自转');
  $('#motion-status').textContent = playing ? `正在自转 · ${state.speed}×` : '自转已暂停';
  requestRender();
}
function setView(view, instant = false) {
  activeView = view;
  cameraTween?.kill();
  let target;
  if (view === 'default') target = { yaw: .8, pitch: .18 };
  if (view === 'north') target = { yaw: Math.PI / 2, pitch: Math.PI / 2 };
  if (view === 'city') target = { yaw: state.city.lon * RAD + state.rotation, pitch: state.city.lat * RAD };
  if (target) {
    target.yaw = state.yaw + wrap(target.yaw - state.yaw + Math.PI, TAU) - Math.PI;
    if (instant || motionPreference.matches || !window.gsap) Object.assign(state, target);
    else cameraTween = window.gsap.to(state, { ...target, duration: 1.15, ease: 'power2.inOut', onUpdate: requestRender });
  }
  $$('.view-buttons button').forEach(button => {
    const selected = button.id === `view-${view}`;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected);
  });
  requestRender();
}
function setHour(hour) {
  setPlaying(false);
  state.rotation = rotationForHour(state.city, hour);
  if (activeView === 'city') setView('city');
  requestRender();
}
$('#play').addEventListener('click', () => setPlaying(!state.playing));
$('#speed').addEventListener('change', event => { state.speed = Number(event.target.value); setPlaying(state.playing); });
$('#city').addEventListener('change', event => {
  state.city = CITIES[event.target.value];
  if (activeView === 'city') setView('city');
  requestRender();
});
$('#time').addEventListener('input', event => setHour(Number(event.target.value)));
$$('[data-hour]').forEach(button => button.addEventListener('click', () => setHour(Number(button.dataset.hour))));
$('#show-grid').addEventListener('change', event => { state.grid = event.target.checked; requestRender(); });
for (const view of ['default', 'north', 'city']) $(`#view-${view}`).addEventListener('click', () => setView(view));
$('#reset').addEventListener('click', () => {
  state.city = CITIES.beijing; state.speed = 1; state.grid = true;
  $('#city').value = 'beijing'; $('#speed').value = '1'; $('#show-grid').checked = true;
  setView('default', true); setHour(12);
  $('#message').textContent = '模型已重置：北京正午、斜侧视角、自转暂停。';
});
function bindCanvas() {
let drag;
$('#globe').addEventListener('pointerdown', event => {
  cameraTween?.kill();
  drag = { x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch };
  $('#globe').setPointerCapture(event.pointerId);
});
$('#globe').addEventListener('pointermove', event => {
  if (!drag) return;
  state.yaw = drag.yaw - (event.clientX - drag.x) * .008;
  state.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, drag.pitch + (event.clientY - drag.y) * .006));
  setView('custom');
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#globe').addEventListener(type, () => { drag = null; });
$('#globe').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft') state.yaw -= .12;
  if (event.key === 'ArrowRight') state.yaw += .12;
  if (event.key === 'ArrowUp') state.pitch = Math.min(Math.PI / 2, state.pitch + .12);
  if (event.key === 'ArrowDown') state.pitch = Math.max(-Math.PI / 2, state.pitch - .12);
  setView('custom');
});
new ResizeObserver(requestRender).observe($('#globe'));
}
document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
$('#fullscreen').addEventListener('click', async () => {
  try { await toggleFullscreen(); $('#message').textContent = ''; }
  catch (error) { $('#message').textContent = error.message; }
});

const sections = {
  intro: ['01', '想一想 · 再验证', '太阳真的“下班”了吗？', '讨论 2 分钟', '同一时刻，为什么我们迎着阳光，地球另一边却已是深夜？'],
  explore: ['02', '观察 · 预测 · 验证', '让地球告诉你答案', '探索 8 分钟', '改变时间、切换地点，再到北极上空看看地球的自转方向。'],
  quiz: ['03', '检验你的发现', '把观察变成解释', '挑战 4 分钟', '完成三个小挑战；需要线索时，随时回到上方模型验证。'],
  recap: ['04', '建立知识联系', '把今天的发现带走', '总结 2 分钟', '把“不透明的球体”和“自西向东的自转”，连成一个完整的解释。'],
};
function showSection(section) {
  $$('.chapter').forEach(button => {
    const active = button.dataset.section === section;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
  for (const key of Object.keys(sections)) $(`#${key}-content`).hidden = key !== section;
  ['activity-number', 'activity-label', 'activity-title', 'activity-time', 'section-subtitle'].forEach((id, i) => { $(`#${id}`).textContent = sections[section][i]; });
  if (section === 'quiz') setPlaying(false);
  $('#learning-panel').scrollIntoView({ behavior: 'instant', block: 'nearest' });
}
$$('.chapter').forEach(button => {
  button.setAttribute('aria-label', `${sections[button.dataset.section][0]} ${button.querySelector('div').firstChild.textContent}`);
  button.addEventListener('click', () => showSection(button.dataset.section));
});
$('#start-explore').addEventListener('click', () => showSection('explore'));
$('#reveal').addEventListener('click', () => { $('#hypothesis').hidden = !$('#hypothesis').hidden; $('#reveal').setAttribute('aria-expanded', !$('#hypothesis').hidden); });
$$('[data-task]').forEach(button => button.addEventListener('click', () => {
  state.city = CITIES.beijing; $('#city').value = 'beijing';
  setView('default', true); setHour(12);
  $$('.task').forEach(task => task.classList.toggle('done', task === button));
  const task = button.dataset.task;
  if (task === 'day') $('#task-feedback').textContent = '已回到北京正午。将右侧观察地点切换为纽约：模型时间没有推进，为什么昼夜状态不同？';
  if (task === 'sunset') { setHour(17); state.yaw = 1.5; setView('custom'); requestRender(); $('#task-feedback').textContent = '已到北京地方太阳时 17:00。先预测，再点击“播放自转”，观察北京经过昏线。'; }
  if (task === 'north') { setView('north'); $('#task-feedback').textContent = '现在从北极正上方俯视。点击“播放自转”，跟随北京的亮点，判断旋转方向。'; }
  $('.globe-card').scrollIntoView({ behavior: 'instant', block: 'nearest' });
}));

const questions = [
  { question: '地球上同一时刻存在白昼和黑夜，主要是因为……', options: ['太阳每天会熄灭一次', '地球是不透明的球体，太阳只能照亮一半', '月亮挡住了另一半太阳光', '地球离太阳忽远忽近'], answer: 1, explanation: '地球是不透明的球体，朝向太阳的一半受到照射，背向太阳的一半被地球自身遮挡。自转使同一地点的昼夜不断交替。' },
  { question: '从北极上空俯视，地球的自转方向是……', options: ['顺时针，自东向西', '逆时针，自西向东', '顺时针，自西向东', '每天改变方向'], answer: 1, explanation: '地球自西向东自转。从北极上空看是逆时针；从南极上空看是顺时针，改变的是观察位置。' },
  { question: '在本课模型中，北京从正午继续自转约 12 小时，将会……', options: ['仍然是正午', '来到日出时刻', '进入午夜，背向太阳', '地球完成绕太阳一周'], answer: 2, explanation: '约 12 小时相当于转过半周，北京从朝向太阳转到背向太阳。这里忽略了公转，讨论的是地方太阳时。' },
];
let questionIndex = 0, answers = [];
function renderQuiz() {
  const question = questions[questionIndex];
  $('#quiz-position').textContent = `问题 ${questionIndex + 1} / ${questions.length}`;
  $('#quiz-score').textContent = `已答对 ${answers.filter(Boolean).length} 题`;
  $('#quiz-question').textContent = question.question;
  $('#quiz-options').replaceChildren();
  $('#quiz-feedback').textContent = '';
  $('#quiz-next').hidden = true; $('#quiz-restart').hidden = true;
  question.options.forEach((option, index) => {
    const button = document.createElement('button'); button.textContent = `${'ABCD'[index]}　${option}`;
    button.addEventListener('click', () => {
      const correct = index === question.answer;
      answers[questionIndex] = correct;
      $$('#quiz-options button').forEach((item, i) => { item.disabled = true; item.classList.toggle('correct', i === question.answer); item.classList.toggle('wrong', i === index && !correct); });
      $('#quiz-score').textContent = `已答对 ${answers.filter(Boolean).length} 题`;
      $('#quiz-feedback').textContent = `${correct ? '✓ 回答正确。' : `再想一想，正确答案是 ${'ABCD'[question.answer]}。`}${question.explanation}${questionIndex === 2 ? ` 本轮完成：${answers.filter(Boolean).length} / 3 题正确。` : ''}`;
      $('#quiz-next').hidden = false; $('#quiz-next').textContent = questionIndex === 2 ? '查看知识总结 →' : '下一题 →';
      $('#quiz-restart').hidden = questionIndex !== 2;
    });
    $('#quiz-options').append(button);
  });
}
$('#quiz-next').addEventListener('click', () => { if (questionIndex === 2) showSection('recap'); else { questionIndex++; renderQuiz(); } });
$('#quiz-restart').addEventListener('click', () => { questionIndex = 0; answers = []; renderQuiz(); });
renderQuiz();

const dialogContent = {
  teacher: ['教学提示', '<p>适用：初中七年级。建议作为一节课中的 15–20 分钟互动探究环节。</p><ol><li><strong>导入（2 分钟）</strong>：北京午间与纽约深夜的通话，引导学生提出猜想。</li><li><strong>探究（8 分钟）</strong>：比较两地昼夜 → 观察北京穿过昏线 → 从北极上空判断自转方向。</li><li><strong>练习（4 分钟）</strong>：先独立回答，再用模型解释。重点区分“昼夜现象”和“昼夜交替”。</li><li><strong>总结（2 分钟）</strong>：用手电筒和球复述成因。追问：只暂停本模型的自转，明暗两半是否仍存在？</li></ol><p>模型约定：太阳直射赤道，不用于解释四季、极昼极夜或真实日出时刻。1× 播放约 60 秒模拟一天。默认暂停，避免未经操作的持续动画。</p><p>周期精度：本课采用约 24 小时的日常尺度；恒星日约 23 时 56 分，与太阳日有区别，非本课重点。</p>'],
  sources: ['资料与来源', '<p>陆地轮廓：<a href="https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/" target="_blank" rel="noopener noreferrer">Natural Earth · 1:110m Land</a>，公共领域数据，已存入本项目。仅显示海陆轮廓，不显示国界。</p><p>科学内容参考：<a href="https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-earth-grades-5-8/" target="_blank" rel="noopener noreferrer">NASA · What Is Earth?（Grades 5–8）</a>。</p><p>城市经纬度为教学近似值。地方太阳时按经度和模型自转角计算，不等同于时区钟表时间。</p><p>页面、字体回退、地图和交互均不需要外部网络；离线使用时仍需启动项目本地服务。</p>'],
};
for (const id of ['teacher', 'sources']) $(`#${id}`).addEventListener('click', () => {
  setPlaying(false);
  $('#dialog-title').textContent = dialogContent[id][0]; $('#dialog-body').innerHTML = dialogContent[id][1]; $('#info-dialog').showModal();
});
$('#close-dialog').addEventListener('click', () => $('#info-dialog').close());

try {
  const response = await fetch(new URL('./data/land.geojson', import.meta.url));
  if (!response.ok) throw new Error(`陆地数据加载失败（${response.status}）`);
  const land = await response.json();
  const requested2d = new URLSearchParams(location.search).get('renderer') === '2d';
  let supports3d = false;
  if (!requested2d) {
    const probe = document.createElement('canvas').getContext('webgl2');
    supports3d = Boolean(probe);
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
  }
  if (supports3d) {
    try {
      const { ThreeGlobe } = await import('./globe-three.js');
      globe = new ThreeGlobe($('#globe'), land);
    } catch (error) {
      // A WebGL context cannot subsequently become a 2D context. Replace before binding input.
      const freshCanvas = $('#globe').cloneNode(); $('#globe').replaceWith(freshCanvas);
      $('#message').textContent = '三维模式暂不可用，已使用二维兼容模式。';
    }
  }
  if (!globe) {
    const { Globe } = await import('./globe.js');
    globe = new Globe($('#globe'), land); $('#globe').dataset.renderer = 'canvas';
    $('#renderer-switch').textContent = '尝试三维模式'; $('#renderer-switch').href = '?renderer=3d';
    if (!requested2d) $('#message').textContent = '当前设备未能启用三维模式，已切换二维兼容模式，教学功能仍可使用。';
  }
  bindCanvas();
  $('#loading').hidden = true;
  requestRender();
} catch (error) {
  $('#loading').textContent = `${error.message}。请从实验台本地服务打开课件，刷新重试。`;
  $('#play').disabled = true;
}
updateReadout();
