import { supabase } from './supabaseClient.js';

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

let memories = [];

async function loadMemories() {
  const { data, error } = await supabase
    .from('staff_memories')
    .select(`
      *,
      tags:staff_memories_tags(
        staff:staff_id(id, username, profile_pic_url, primary_department:primary_department_id(name))
      )
    `)
    .order('date_taken', { ascending: true });

  const grid = document.getElementById('memories-grid');

  if (error) { grid.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }
  memories = data || [];

  populateYearFilter();
  applyFilters();
}

function populateYearFilter() {
  const years = [...new Set(memories.map((m) => m.date_taken.slice(0, 4)))].sort();
  const yearSelect = document.getElementById('filter-year');
  yearSelect.innerHTML = '<option value="">All years</option>' +
    years.map((y) => `<option value="${y}">${y}</option>`).join('');
}

function applyFilters() {
  const year = document.getElementById('filter-year').value;
  const exactDate = document.getElementById('filter-exact-date').value;

  const filtered = memories.filter((m) => {
    if (exactDate && m.date_taken !== exactDate) return false;
    if (!exactDate && year && !m.date_taken.startsWith(year)) return false;
    return true;
  });

  document.getElementById('memories-count').textContent =
    `${filtered.length} ${filtered.length === 1 ? 'memory' : 'memories'} shown (${memories.length} total)`;

  renderGrid(filtered);
}

function renderGrid(rows) {
  const grid = document.getElementById('memories-grid');

  if (!rows.length) {
    grid.innerHTML = '<p class="crud-empty">No memories match this filter.</p>';
    return;
  }

  grid.innerHTML = rows.map((m, i) => `
    <div class="memory-card" tabindex="0" data-id="${m.id}">
      <img src="${m.image_url}" alt="Staff memory from ${formatDate(m.date_taken)}">
      <div class="memory-date">${formatDate(m.date_taken)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.memory-card').forEach((card) => {
    const memory = rows.find((m) => m.id === card.dataset.id);
    card.addEventListener('click', () => openModal(memory));
    card.addEventListener('keypress', (e) => { if (e.key === 'Enter') openModal(memory); });
  });
}

document.getElementById('filter-year').addEventListener('change', () => {
  document.getElementById('filter-exact-date').value = '';
  applyFilters();
});

document.getElementById('filter-exact-date').addEventListener('change', () => {
  document.getElementById('filter-year').value = '';
  applyFilters();
});

document.getElementById('clear-date-filter').addEventListener('click', () => {
  document.getElementById('filter-exact-date').value = '';
  document.getElementById('filter-year').value = '';
  applyFilters();
});

const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

function openModal(memory) {
  const taggedStaff = (memory.tags || []).map((t) => t.staff).filter(Boolean);

  modalContent.innerHTML = `
    <img class="memory-full-image" src="${memory.image_url}" alt="Staff memory from ${formatDate(memory.date_taken)}">
    <div class="memory-date-large">${formatDate(memory.date_taken)}</div>
    <h3>Staff in this photo</h3>
    <div class="tagged-staff-list">
      ${taggedStaff.length ? taggedStaff.map((s) => `
        <div class="tagged-staff-row">
          ${s.profile_pic_url
            ? `<img src="${s.profile_pic_url}" alt="${s.username}">`
            : `<div style="width:2.5rem;height:2.5rem;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">?</div>`}
          <div class="tagged-info">
            <span class="tagged-username">${s.username}</span>
            <span class="tagged-department">${s.primary_department?.name || 'No department listed'}</span>
          </div>
        </div>
      `).join('') : '<p class="notes-text">No one has been tagged in this photo yet.</p>'}
    </div>
  `;

  overlay.classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.remove('open'); });

loadMemories();
