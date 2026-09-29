import { loadCases, filterCases, escapeHtml as e, subjectLabel, gradeLabel, statusLabel, detailUrl, coverUrl } from './data.js';
const $ = selector => document.querySelector(selector);
let items = [];
const controls = { query: $('#search'), subject: $('#subject'), grade: $('#grade'), interaction: $('#interaction') };
function render() {
  const filters = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));
  const selected = filterCases(items, filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size ? `?${params}` : '';
  history.replaceState(null, '', `${location.pathname}${query}${location.hash}`);
  try { sessionStorage.setItem('catalog-query', query); } catch { /* Storage is optional. */ }
  $('#clear-filters').hidden = !params.size;
  $('#status').textContent = `显示 ${selected.length} 个案例${params.size ? ` / 共 ${items.length} 个` : ' · 持续探索中'}`;
  $('#empty').hidden = selected.length > 0;
  $('#experiments').innerHTML = selected.map(item => `<article class="case-card"><a class="card-cover" href="${detailUrl(item)}" aria-label="查看${e(item.title)}详情"><img src="${coverUrl(item)}" alt="${e(item.title)}课件封面" loading="lazy"><span class="cover-badge">${e(subjectLabel(item.subject))} / ${e(gradeLabel(item.grade))}</span><span class="cover-arrow">↗</span></a><div class="card-content"><div class="card-meta"><span>${e(item.scenario)}</span><span>${item.durationMinutes ? `${item.durationMinutes} 分钟` : '课时待定'}</span></div><h3><a href="${detailUrl(item)}">${e(item.title)}</a></h3><p>${e(item.summary)}</p><div class="tags">${item.interactions.map(tag => `<span>${e(tag)}</span>`).join('')}</div><div class="card-footer"><span><i></i>${e(statusLabel(item.status))}</span><a href="${detailUrl(item)}">查看案例 <span>→</span></a></div></div></article>`).join('');
}
function clear() { Object.values(controls).forEach(control => { control.value = ''; }); render(); }
$('#clear-filters').addEventListener('click', clear);
$('#empty-clear').addEventListener('click', clear);
Object.values(controls).forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', render));
try {
  items = await loadCases();
  const fill = (key, values, label) => { for (const value of [...new Set(values)].sort()) { const option = new Option(label(value), value); controls[key].add(option); } };
  fill('subject', items.map(item => item.subject), subjectLabel);
  fill('grade', items.map(item => item.grade), gradeLabel);
  fill('interaction', items.flatMap(item => item.interactions), value => value);
  const params = new URLSearchParams(location.search);
  for (const [key, control] of Object.entries(controls)) control.value = params.get(key) || '';
  $('#collection-count').textContent = `${String(items.length).padStart(2, '0')} 个案例 · ${new Set(items.map(item => item.subject)).size} 个学科`;
  const featured = items.find(item => item.status !== 'draft') || items[0];
  $('#featured').innerHTML = featured ? `<a href="${detailUrl(featured)}" class="featured-link"><img src="${coverUrl(featured)}" alt="${e(featured.title)}"><div class="featured-top"><span>本期探索 / FEATURED</span><span>↗</span></div><div class="featured-bottom"><span>${e(gradeLabel(featured.grade))} · ${e(subjectLabel(featured.subject))}</span><h2>${e(featured.title)}</h2><p>打开案例，开始一次新的发现 <span>→</span></p></div></a>` : '<div class="no-feature"><span>◈</span><h2>新的探索，即将发生</h2><p>第一个课件案例正在等待创建。</p></div>';
  render();
} catch (error) { $('#status').textContent = error.message; $('#featured').textContent = '案例暂时无法加载'; $('#collection-count').textContent = '请刷新重试'; }
