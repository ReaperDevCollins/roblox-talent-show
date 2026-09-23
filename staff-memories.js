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

  if (!memories.length) {
    grid.innerHTML = '<p class="crud-empty">No memories have been added yet.</p>';
    return;
  }

  grid.innerHTML = memories.map((m, i) => `
    <div class="memory-card" tabindex="0" data-index="${i}">
      <img src="${m.image_url}" alt="Staff memory from ${formatDate(m.date_taken)}">
      <div class="memory-date">${formatDate(m.date_taken)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.memory-card').forEach((card) => {
    card.addEventListener('click', () => openModal(memories[card.dataset.index]));
    card.addEventListener('keypress', (e) => { if (e.key === 'Enter') openModal(memories[card.dataset.index]); });
  });
}

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