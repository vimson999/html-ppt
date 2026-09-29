const list = document.querySelector('#experiments');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
let experiments = [];
function render() {
  const query = search.value.trim().toLowerCase();
  const matches = experiments.filter(item => [item.title, item.subject, item.grade, item.topic].join(' ').toLowerCase().includes(query));
  list.replaceChildren();
  for (const item of matches) {
    const card = document.createElement('article');
    card.className = 'panel';
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.textContent = item.title;
    link.href = `./experiments/${item.subject}/${item.grade}/${item.topic}/${item.id}/index.html`;
    heading.append(link);
    const details = document.createElement('p');
    details.className = 'tag';
    details.textContent = `${item.subject} · ${item.grade} · ${item.topic} · ${item.id}`;
    card.append(heading, details);
    list.append(card);
  }
  status.textContent = experiments.length ? `共 ${experiments.length} 个实验，显示 ${matches.length} 个` : '暂无实验';
  document.querySelector('#empty').hidden = experiments.length > 0;
}
search.addEventListener('input', render);
try {
  const response = await fetch(new URL('./experiments.json', import.meta.url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  experiments = await response.json();
  render();
} catch (error) {
  status.textContent = `无法读取实验目录，请通过 npm run dev 启动并访问页面。${error.message}`;
}
