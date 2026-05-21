export function openSidebar(node, data, selfId) {
  const sb = document.getElementById('sidebar');
  const body = document.getElementById('sidebar-body');
  body.innerHTML = `<div style="padding:16px">${node.name} (${node.id})</div>`;
  sb.classList.remove('hidden');
}
export function closeSidebar() {
  document.getElementById('sidebar').classList.add('hidden');
}
