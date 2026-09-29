export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
export const subjects = { geography: '地理', mathematics: '数学', math: '数学', physics: '物理', chemistry: '化学', biology: '生物', chinese: '语文', english: '英语', history: '历史', science: '科学', art: '美术' };
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三'];
export const subjectLabel = value => subjects[value] || value;
export const gradeLabel = value => value === 'mixed' ? '跨年级' : grades[Number(value.replace('grade-', '')) - 1] || value;
export const statusLabel = value => ({ draft: '制作中', prototype: '可试讲', ready: '可使用' })[value] || value;
export const detailUrl = item => `./case.html?id=${encodeURIComponent(item.key)}`;
export const entryUrl = item => `./${item.path}/index.html`;
export const coverUrl = item => item.cover ? `./${item.path}/${item.cover}` : './platform/placeholder.svg';
export async function loadCases() {
  const response = await fetch(new URL('../catalog/experiments.json', import.meta.url));
  if (!response.ok) throw new Error('无法读取案例目录，请启动项目服务后重试。');
  return response.json();
}
export function filterCases(items, { query = '', subject = '', grade = '', interaction = '' } = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const haystack = [item.title, item.summary, subjectLabel(item.subject), gradeLabel(item.grade), item.subject, item.grade, item.topic, ...item.tags, ...item.interactions].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term)) && (!subject || subject === item.subject) && (!grade || grade === item.grade) && (!interaction || item.interactions.includes(interaction));
  });
}
