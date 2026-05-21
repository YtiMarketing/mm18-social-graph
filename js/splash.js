// Возвращает { selfId | null }
export function initSplash() {
  return new Promise(resolve => {
    const splash = document.getElementById('splash');
    const input = document.getElementById('splash-input');
    const enterBtn = document.getElementById('splash-enter');
    const skipBtn = document.getElementById('splash-skip');

    const finish = (selfId) => {
      splash.classList.add('hidden');
      document.getElementById('header').classList.remove('hidden');
      document.getElementById('graph').classList.remove('hidden');
      document.getElementById('legend').classList.remove('hidden');
      resolve({ selfId });
    };

    enterBtn.addEventListener('click', () => {
      const raw = input.value.trim().replace(/^@/, '').toLowerCase();
      finish(raw || null);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') enterBtn.click();
    });
    skipBtn.addEventListener('click', () => finish(null));
  });
}

// Найти узел по введённому значению (username или имя)
export function resolveSelf(nodes, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  return nodes.find(n =>
    n.id.toLowerCase() === q ||
    n.telegram?.toLowerCase() === q ||
    n.name.toLowerCase().includes(q)
  ) || null;
}
