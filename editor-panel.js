import { supabase } from './supabaseClient.js';
import { requireRole, logout } from './auth-guard.js';

const role = await requireRole(['editor', 'admin', 'super_admin'], 'editor-login.html');
if (!role) throw new Error('Redirecting - not authorized.');

document.getElementById('logout-btn').addEventListener('click', () => logout('editor-login.html'));

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

/* ---------- Load dropdown data (statuses, departments, ranks) ---------- */
let statuses = [], departments = [], ranks = [], staffMembers = [];

async function loadReferenceData() {
  const [statusRes, deptRes, rankRes] = await Promise.all([
    supabase.from('statuses').select('*').order('name'),
    supabase.from('departments').select('*').order('sort_order'),
    supabase.from('ranks').select('*').order('sort_order'),
  ]);
  statuses = statusRes.data || [];
  departments = deptRes.data || [];
  ranks = rankRes.data || [];

  fillSelect('status-select', statuses, 'Select status');
  fillSelect('primary-dept-select', departments, 'Select department');
  fillSelect('primary-rank-select', ranks, 'Select rank');
  fillSelect('secondary-dept-select', departments, 'None');
  fillSelect('secondary-rank-select', ranks, 'None');
  fillSelect('past-dept-status-select', statuses, 'Select status');
  fillSelect('past-dept-rank-select', ranks, 'Select former rank');
  fillSelect('past-dept-department-select', departments, 'Select department');
}

function fillSelect(id, items, placeholder) {
  const el = document.getElementById(id);
  el.innerHTML = `<option value="">${placeholder}</option>` +
    items.map((i) => `<option value="${i.id}">${i.name}</option>`).join('');
}

/* ---------- Staff Management ---------- */
const staffForm = document.getElementById('staff-form');
const staffList = document.getElementById('staff-list');
const cancelEditBtn = document.getElementById('cancel-edit-staff');
const pastUsernamesEditor = document.getElementById('past-usernames-editor');
const pastUsernamesList = document.getElementById('past-usernames-list');
const pastUsernameForm = document.getElementById('past-username-form');
const pastDeptEditor = document.getElementById('past-departments-editor');

let editingStaffId = null;

async function loadStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      *,
      status:status_id(name, color),
      primary_department:primary_department_id(name),
      current_rank:current_rank_id(name),
      secondary_department:secondary_department_id(name),
      secondary_rank:secondary_rank_id(name)
    `)
    .order('username');

  if (error) { staffList.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }
  staffMembers = data || [];
  renderStaffList(staffMembers);
  fillStaffSelects(staffMembers);
}

function renderStaffList(rows) {
  if (!rows.length) { staffList.innerHTML = '<p class="crud-empty">No staff members yet.</p>'; return; }

  staffList.innerHTML = rows.map((s) => `
    <div class="crud-row" data-id="${s.id}">
      <div class="crud-row-info">
        <span><strong>${s.username}</strong></span>
        <span><span class="swatch" style="background:${s.status?.color || '#ccc'}"></span>${s.status?.name || 'No status'}</span>
        <span>${s.primary_department?.name || '—'} · ${s.current_rank?.name || '—'}</span>
        <span>STOW: ${s.stow_count} · STOM: ${s.stom_count}</span>
      </div>
      <div class="crud-row-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    </div>
  `).join('');

  staffList.querySelectorAll('.crud-row').forEach((rowEl) => {
    const staff = rows.find((r) => r.id === rowEl.dataset.id);

    rowEl.querySelector('.edit-btn').addEventListener('click', () => loadStaffIntoForm(staff));

    rowEl.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${staff.username}? This cannot be undone.`)) return;
      await supabase.from('staff').delete().eq('id', staff.id);
      loadStaff();
    });
  });
}

function loadStaffIntoForm(staff) {
  editingStaffId = staff.id;
  staffForm.username.value = staff.username;
  staffForm.profile_pic_url.value = staff.profile_pic_url || '';
  staffForm.status_id.value = staff.status_id || '';
  staffForm.primary_department_id.value = staff.primary_department_id || '';
  staffForm.current_rank_id.value = staff.current_rank_id || '';
  staffForm.term_start.value = staff.term_start || '';
  staffForm.term_end.value = staff.term_end || '';
  staffForm.secondary_department_id.value = staff.secondary_department_id || '';
  staffForm.secondary_rank_id.value = staff.secondary_rank_id || '';
  staffForm.secondary_term_start.value = staff.secondary_term_start || '';
  staffForm.secondary_term_end.value = staff.secondary_term_end || '';
  staffForm.stow_count.value = staff.stow_count || 0;
  staffForm.stom_count.value = staff.stom_count || 0;
  staffForm.notes.value = staff.notes || '';

  staffForm.querySelector('.crud-submit').textContent = 'Save changes';
  cancelEditBtn.style.display = 'inline-block';
  pastDeptEditor.style.display = 'block';
  pastUsernamesEditor.style.display = 'block';
  loadPastDepartments(staff.id);
  loadPastUsernames(staff.id);
  staffForm.scrollIntoView({ behavior: 'smooth' });
}

function resetStaffForm() {
  editingStaffId = null;
  staffForm.reset();
  staffForm.querySelector('.crud-submit').textContent = 'Add staff member';
  cancelEditBtn.style.display = 'none';
  pastDeptEditor.style.display = 'none';
}

cancelEditBtn.addEventListener('click', resetStaffForm);

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    username: staffForm.username.value,
    profile_pic_url: staffForm.profile_pic_url.value || null,
    status_id: staffForm.status_id.value,
    primary_department_id: staffForm.primary_department_id.value,
    current_rank_id: staffForm.current_rank_id.value,
    term_start: staffForm.term_start.value,
    term_end: staffForm.term_end.value || null,
    secondary_department_id: staffForm.secondary_department_id.value || null,
    secondary_rank_id: staffForm.secondary_rank_id.value || null,
    secondary_term_start: staffForm.secondary_term_start.value || null,
    secondary_term_end: staffForm.secondary_term_end.value || null,
    stow_count: Number(staffForm.stow_count.value) || 0,
    stom_count: Number(staffForm.stom_count.value) || 0,
    notes: staffForm.notes.value || null,
  };

  const action = editingStaffId
    ? supabase.from('staff').update(payload).eq('id', editingStaffId)
    : supabase.from('staff').insert(payload);

  const { error } = await action;
  if (error) { alert(`Error: ${error.message}`); return; }

  resetStaffForm();
  loadStaff();
});

/* ---------- Past departments (per staff member being edited) ---------- */
async function loadPastDepartments(staffId) {
  const { data, error } = await supabase
    .from('staff_past_departments')
    .select('*, status:status_id(name, color), former_rank:former_rank_id(name, icon_url), department:department_id(name, logo_url, color)')
    .eq('staff_id', staffId)
    .order('term_start');

  if (error) { pastDeptList.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }

  if (!data.length) { pastDeptList.innerHTML = '<p class="crud-empty">No past departments recorded.</p>'; return; }

  pastDeptList.innerHTML = data.map((p) => `
    <div class="crud-row" data-id="${p.id}">
      <div class="crud-row-info">
        <span><strong>${p.department?.name || 'Unknown department'}</strong></span>
        <span>${p.former_rank?.name || 'No rank'}</span>
        <span><span class="swatch" style="background:${p.status?.color || '#ccc'}"></span>${p.status?.name || 'No status'}</span>
        <span>${p.term_start} - ${p.term_end || 'Current'}</span>
      </div>
      <div class="crud-row-actions">
        <button class="delete-btn">Delete</button>
      </div>
    </div>
  `).join('');

  pastDeptList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.crud-row').dataset.id;
      if (!confirm('Delete this past department entry?')) return;
      await supabase.from('staff_past_departments').delete().eq('id', id);
      loadPastDepartments(staffId);
    });
  });
}

pastDeptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingStaffId) return;

  const { error } = await supabase.from('staff_past_departments').insert({
    staff_id: editingStaffId,
    department_id: pastDeptForm.department_id.value,
    former_rank_id: pastDeptForm.former_rank_id.value,
    status_id: pastDeptForm.status_id.value,
    term_start: pastDeptForm.term_start.value,
    term_end: pastDeptForm.term_end.value || null,
  });

  if (error) { alert(`Error: ${error.message}`); return; }
  pastDeptForm.reset();
  loadPastDepartments(editingStaffId);
});

/* ---------- Staff Recognition (STOW / STOM) ---------- */
function fillStaffSelects(rows) {
  const options = `<option value="">Select staff member</option>` +
    rows.map((s) => `<option value="${s.id}">${s.username}</option>`).join('');
  document.getElementById('stow-select').innerHTML = options;
  document.getElementById('stom-select').innerHTML = options;
}

async function loadRecognition(type, listId) {
  const { data, error } = await supabase
    .from('staff_recognition_current')
    .select('id, staff:staff_id(id, username)')
    .eq('type', type)
    .order('slot_order');

  const listEl = document.getElementById(listId);
  if (error) { listEl.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }

  if (!data.length) { listEl.innerHTML = '<p class="crud-empty">No one currently listed.</p>'; return; }

  listEl.innerHTML = data.map((entry) => `
    <div class="crud-row" data-id="${entry.id}">
      <div class="crud-row-info"><span><strong>${entry.staff?.username || 'Unknown'}</strong></span></div>
      <div class="crud-row-actions"><button class="delete-btn">Remove</button></div>
    </div>
  `).join('');

  listEl.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.crud-row').dataset.id;
      // Removing a current pick does NOT decrement the count — it's a historical award.
      await supabase.from('staff_recognition_current').delete().eq('id', id);
      loadRecognition(type, listId);
    });
  });
}

async function addRecognition(type, staffId, listId, countField) {
  const { count } = await supabase
    .from('staff_recognition_current')
    .select('*', { count: 'exact', head: true })
    .eq('type', type);

  if (count >= 4) { alert(`${type} already has 4 people listed. Remove one before adding another.`); return; }

  const { error: insertError } = await supabase
    .from('staff_recognition_current')
    .insert({ type, staff_id: staffId, slot_order: count });

  if (insertError) { alert(`Error: ${insertError.message}`); return; }

  const { data: staffRow } = await supabase.from('staff').select(countField).eq('id', staffId).single();
  await supabase.from('staff')
    .update({ [countField]: (staffRow?.[countField] || 0) + 1 })
    .eq('id', staffId);

  loadRecognition(type, listId);
  loadStaff();
}

document.getElementById('stow-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const select = document.getElementById('stow-select');
  if (!select.value) return;
  addRecognition('STOW', select.value, 'stow-list', 'stow_count');
  select.value = '';
});

document.getElementById('stom-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const select = document.getElementById('stom-select');
  if (!select.value) return;
  addRecognition('STOM', select.value, 'stom-list', 'stom_count');
  select.value = '';
});

/* ---------- Init ---------- */
await loadReferenceData();
await loadStaff();
loadRecognition('STOW', 'stow-list');
loadRecognition('STOM', 'stom-list');
