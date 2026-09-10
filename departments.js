import { supabase } from './supabaseClient.js';

function deptInitial(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

let departments = [];

async function loadDepartments() {
  const { data } = await supabase
    .from('departments')
    .select('*')
    .eq('hidden', false)
    .order('sort_order');

  departments = data || [];
  const grid = document.getElementById('department-grid');

  if (!departments.length) {
    grid.innerHTML = '<p class="crud-empty">No departments to show yet.</p>';
    return;
  }

  grid.innerHTML = departments.map((dept, i) => `
    <div class="dept-card" tabindex="0" data-index="${i}">
      <div class="dept-logo" style="background:${dept.color}33;">
        ${dept.logo_url ? `<img src="${dept.logo_url}" alt="${dept.name} logo">` : deptInitial(dept.name)}
      </div>
      <div class="dept-name">${dept.name}</div>
      <div class="dept-heads">Current head(s): ${dept.heads || 'TBA'}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.dept-card').forEach((card) => {
    card.addEventListener('click', () => openModal(departments[card.dataset.index]));
    card.addEventListener('keypress', (e) => { if (e.key === 'Enter') openModal(departments[card.dataset.index]); });
  });
}

const overlay = document.getElementById('modal-overlay');
const modal = document.getElementById('department-modal');
const modalContent = document.getElementById('modal-content');

function fieldRow(label, value) {
  return `<div class="field-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

async function openModal(dept) {
  modal.style.background = dept.color;

  const { data: seniorStaff } = await supabase
    .from('staff')
    .select('username')
    .eq('primary_department_id', dept.id)
    .eq('is_senior', true);

  modalContent.innerHTML = `
    <div class="dept-logo-large">
      ${dept.logo_url ? `<img src="${dept.logo_url}" alt="${dept.name} logo" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : deptInitial(dept.name)}
    </div>
    <div class="dept-name-large">${dept.name}</div>
    ${fieldRow('Creation date', dept.creation_date || 'TBA')}
    ${fieldRow('Head(s)', dept.heads || 'TBA')}
    <hr class="full-divider">
    <h3>Senior department staff</h3>
    ${seniorStaff && seniorStaff.length
      ? `<p class="senior-note">${seniorStaff.map((s) => s.username).join(', ')}</p>`
      : `<p class="senior-note">TBA</p>`}
  `;

  overlay.classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.remove('open'); });

loadDepartments();