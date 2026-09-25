import { supabase } from './supabaseClient.js';
import { requireRole, logout } from './auth-guard.js';

const role = await requireRole(['admin', 'super_admin'], 'admin-login.html');
if (!role) throw new Error('Redirecting - not authorized.');

if (role === 'super_admin') {
  document.querySelectorAll('.super-only').forEach((el) => (el.style.display = 'inline-block'));
}

document.getElementById('logout-btn').addEventListener('click', () => logout('admin-login.html'));

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

/* ---------- Generic CRUD engine ---------- */
function setupCrud({ table, fields, formEl, listEl, orderBy = 'sort_order' }) {
  let editingId = null;

  async function load() {
    const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: true });
    if (error) { listEl.innerHTML = `<p class="crud-empty">Failed to load: ${error.message}</p>`; return; }
    render(data || []);
  }

  function render(rows) {
    if (!rows.length) { listEl.innerHTML = '<p class="crud-empty">Nothing added yet.</p>'; return; }

    listEl.innerHTML = rows.map((row) => `
      <div class="crud-row" data-id="${row.id}">
        <div class="crud-row-info">
          ${fields.map((f) => {
            if (f.type === 'color') {
              return `<span><span class="swatch" style="background:${row[f.name]}"></span>${row[f.name]}</span>`;
            }
            if (f.type === 'checkbox') {
              return `<span><strong>${f.label}:</strong> ${row[f.name] ? 'Yes' : 'No'}</span>`;
            }
            return `<span><strong>${f.label}:</strong> ${row[f.name] ?? ''}</span>`;
          }).join('')}
        </div>
        <div class="crud-row-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.crud-row').forEach((rowEl) => {
      const row = rows.find((r) => r.id === rowEl.dataset.id);

      rowEl.querySelector('.edit-btn').addEventListener('click', () => {
        editingId = row.id;
        fields.forEach((f) => {
          const input = formEl.querySelector(`[name="${f.name}"]`);
          if (!input) return;
          if (f.type === 'checkbox') input.checked = !!row[f.name];
          else input.value = row[f.name] ?? '';
        });
        formEl.querySelector('.crud-submit').textContent = 'Save changes';
        formEl.scrollIntoView({ behavior: 'smooth' });
      });

      rowEl.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this entry? This cannot be undone.')) return;
        await supabase.from(table).delete().eq('id', row.id);
        load();
      });
    });
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    fields.forEach((f) => {
      const input = formEl.querySelector(`[name="${f.name}"]`);
      payload[f.name] = f.type === 'checkbox' ? input.checked : input.value;
    });

    const action = editingId
      ? supabase.from(table).update(payload).eq('id', editingId)
      : supabase.from(table).insert(payload);

    const { error } = await action;
    if (error) { alert(`Error: ${error.message}`); return; }

    editingId = null;
    formEl.reset();
    formEl.querySelector('.crud-submit').textContent = 'Add';
    load();
  });

  load();
}

/* ---------- Wire up each section ---------- */
setupCrud({
  table: 'ranks',
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'icon_url', label: 'Icon' },
    { name: 'sort_order', label: 'Order' },
  ],
  formEl: document.getElementById('ranks-form'),
  listEl: document.getElementById('ranks-list'),
});

setupCrud({
  table: 'departments',
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'logo_url', label: 'Logo' },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'heads', label: 'Head(s)' },
    { name: 'creation_date', label: 'Created' },
    { name: 'hidden', label: 'Hidden', type: 'checkbox' },
    { name: 'sort_order', label: 'Order' },
  ],
  formEl: document.getElementById('departments-form'),
  listEl: document.getElementById('departments-list'),
});

setupCrud({
  table: 'statuses',
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'color', label: 'Color', type: 'color' },
  ],
  formEl: document.getElementById('statuses-form'),
  listEl: document.getElementById('statuses-list'),
  orderBy: 'name',
});

setupCrud({
  table: 'editors',
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'photo_url', label: 'Photo' },
    { name: 'bio', label: 'Bio' },
    { name: 'sort_order', label: 'Order' },
  ],
  formEl: document.getElementById('editor-bios-form'),
  listEl: document.getElementById('editor-bios-list'),
});

setupCrud({
  table: 'social_posts',
  fields: [
    { name: 'title', label: 'Title' },
    { name: 'link', label: 'Link' },
    { name: 'thumbnail_url', label: 'Thumbnail' },
    { name: 'sort_order', label: 'Order' },
  ],
  formEl: document.getElementById('social-form'),
  listEl: document.getElementById('social-list'),
});

setupCrud({
  table: 'newspapers',
  fields: [
    { name: 'title', label: 'Title' },
    { name: 'link', label: 'Link' },
    { name: 'thumbnail_url', label: 'Thumbnail' },
  ],
  formEl: document.getElementById('newspapers-form'),
  listEl: document.getElementById('newspapers-list'),
  orderBy: 'created_at',
});

setupCrud({
  table: 'faqs',
  fields: [
    { name: 'question', label: 'Question' },
    { name: 'answer', label: 'Answer' },
    { name: 'sort_order', label: 'Order' },
  ],
  formEl: document.getElementById('faqs-form'),
  listEl: document.getElementById('faqs-list'),
});

/* ---------- Announcement (single active banner, not a list) ---------- */
const announcementForm = document.getElementById('announcement-form');
const announcementStatus = document.getElementById('announcement-status');

announcementForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
  const { error } = await supabase.from('announcements').insert({
    title: announcementForm.title.value,
    message: announcementForm.message.value,
    is_active: true,
  });
  announcementStatus.textContent = error ? `Error: ${error.message}` : 'Announcement published.';
  if (!error) announcementForm.reset();
});

document.getElementById('clear-announcement').addEventListener('click', async () => {
  await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
  announcementStatus.textContent = 'Active announcement cleared.';
});

/* ---------- Editor permissions (super_admin only, via Edge Function) ---------- */
if (role === 'super_admin') {
  const permForm = document.getElementById('editor-permissions-form');
  const permStatus = document.getElementById('permissions-status');
  const permList = document.getElementById('editor-permissions-list');

  async function loadEditorAccounts() {
    const { data, error } = await supabase.from('profiles').select('id, email, role').order('email');
    if (error) { permList.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }

    permList.innerHTML = data.map((p) => `
      <div class="crud-row" data-id="${p.id}">
        <div class="crud-row-info">
          <span><strong>Email:</strong> ${p.email}</span>
          <span><strong>Role:</strong> ${p.role}</span>
        </div>
        <div class="crud-row-actions">
          ${p.role !== 'super_admin' ? '<button class="delete-btn">Remove access</button>' : ''}
        </div>
      </div>
    `).join('');

    permList.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this account\'s access?')) return;
        const id = btn.closest('.crud-row').dataset.id;
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase.functions.invoke('manage-editor', {
          body: { action: 'delete', userId: id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) alert(`Error: ${error.message}`);
        loadEditorAccounts();
      });
    });
  }

  permForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('manage-editor', {
      body: {
        action: 'create',
        email: permForm.email.value,
        password: permForm.password.value,
        role: permForm.role.value,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    permStatus.textContent = error ? `Error: ${error.message}` : 'Account created.';
    if (!error) { permForm.reset(); loadEditorAccounts(); }
  });

  loadEditorAccounts();
}

/* ---------- Staff Memories (photo + tagged staff, many-to-many) ---------- */
async function initStaffMemories() {
  const form = document.getElementById('memories-form');
  const listEl = document.getElementById('memories-list');
  const checkboxContainer = document.getElementById('memory-staff-checkboxes');
  const searchInput = document.getElementById('memory-staff-search');
  let editingId = null;
  let selectedIds = new Set();

  const { data: allStaffForTagging } = await supabase
    .from('staff')
    .select('id, username, past_usernames:staff_past_usernames(username)')
    .order('username');

  function renderCheckboxes(filterText = '') {
    const f = filterText.toLowerCase();
    const filtered = (allStaffForTagging || []).filter((s) => {
      if (!f) return true;
      const matchesCurrent = s.username.toLowerCase().includes(f);
      const matchesPast = (s.past_usernames || []).some((p) => p.username.toLowerCase().includes(f));
      return matchesCurrent || matchesPast;
    });

    checkboxContainer.innerHTML = filtered.map((s) => {
      const pastNote = s.past_usernames && s.past_usernames.length
        ? ` (formerly ${s.past_usernames.map((p) => p.username).join(', ')})`
        : '';
      return `<label><input type="checkbox" value="${s.id}" ${selectedIds.has(s.id) ? 'checked' : ''}> ${s.username}${pastNote}</label>`;
    }).join('');

    checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.value);
        else selectedIds.delete(cb.value);
      });
    });
  }

  renderCheckboxes();
  searchInput.addEventListener('input', (e) => renderCheckboxes(e.target.value));

  async function load() {
    const { data, error } = await supabase
      .from('staff_memories')
      .select('*, tags:staff_memories_tags(staff_id, staff:staff_id(username))')
      .order('date_taken', { ascending: false });

    if (error) { listEl.innerHTML = `<p class="crud-empty">${error.message}</p>`; return; }
    render(data || []);
  }

  function render(rows) {
    if (!rows.length) { listEl.innerHTML = '<p class="crud-empty">No memories added yet.</p>'; return; }

    listEl.innerHTML = rows.map((row) => `
      <div class="crud-row" data-id="${row.id}">
        <div class="crud-row-info">
          <span><strong>${row.date_taken}</strong></span>
          <span>${(row.tags || []).map((t) => t.staff?.username).filter(Boolean).join(', ') || 'No one tagged'}</span>
        </div>
        <div class="crud-row-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.crud-row').forEach((rowEl) => {
      const row = rows.find((r) => r.id === rowEl.dataset.id);

      rowEl.querySelector('.edit-btn').addEventListener('click', () => {
        editingId = row.id;
        form.image_url.value = row.image_url;
        form.date_taken.value = row.date_taken;
        form.sort_order.value = row.sort_order;

        selectedIds = new Set((row.tags || []).map((t) => t.staff_id));
        searchInput.value = '';
        renderCheckboxes();

        form.querySelector('.crud-submit').textContent = 'Save changes';
        form.scrollIntoView({ behavior: 'smooth' });
      });

      rowEl.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this memory? This cannot be undone.')) return;
        await supabase.from('staff_memories').delete().eq('id', row.id);
        load();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      image_url: form.image_url.value,
      date_taken: form.date_taken.value,
      sort_order: Number(form.sort_order.value) || 0,
    };

    let memoryId = editingId;

    if (editingId) {
      const { error } = await supabase.from('staff_memories').update(payload).eq('id', editingId);
      if (error) { alert(`Error: ${error.message}`); return; }
      await supabase.from('staff_memories_tags').delete().eq('memory_id', editingId);
    } else {
      const { data, error } = await supabase.from('staff_memories').insert(payload).select().single();
      if (error) { alert(`Error: ${error.message}`); return; }
      memoryId = data.id;
    }

    const checkedIds = Array.from(selectedIds);
    if (checkedIds.length) {
      await supabase.from('staff_memories_tags').insert(
        checkedIds.map((staffId) => ({ memory_id: memoryId, staff_id: staffId }))
      );
    }

    editingId = null;
    form.reset();
    selectedIds = new Set();
    searchInput.value = '';
    renderCheckboxes();
    form.querySelector('.crud-submit').textContent = 'Add memory';
    load();
  });

  load();
}

initStaffMemories();