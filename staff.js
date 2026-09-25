import { supabase } from './supabaseClient.js';

function deptInitial(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(str) {
  if (!str) return 'Current';
  const d = new Date(str + 'T00:00:00');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatTerm(start, end) {
  return `${formatDate(start)} - ${end ? formatDate(end) : 'Current'}`;
}

function totalDays(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = end ? new Date(end + 'T00:00:00') : new Date();
  return Math.max(Math.round((endDate - startDate) / 86400000), 0);
}

let departments = [], statuses = [], ranks = [], allStaff = [];

async function loadReferenceData() {
  const [deptRes, statusRes, rankRes] = await Promise.all([
    supabase.from('departments').select('*').order('sort_order'),
    supabase.from('statuses').select('*').order('name'),
    supabase.from('ranks').select('*').order('sort_order'),
  ]);
  departments = deptRes.data || [];
  statuses = statusRes.data || [];
  ranks = rankRes.data || [];
}

async function loadStaff() {
  const { data } = await supabase
    .from('staff')
    .select(`
      *,
      status:status_id(name, color),
      primary_department:primary_department_id(name, color, logo_url),
      current_rank:current_rank_id(name, icon_url),
      secondary_department:secondary_department_id(name, color, logo_url),
      secondary_rank:secondary_rank_id(name, icon_url),
      past_usernames:staff_past_usernames(username)
    `);
  allStaff = data || [];
}

/* ---------- Stats ---------- */
function renderStats(staffList) {
  const counts = { Active: 0, Resigned: 0, Terminated: 0, Unknown: 0 };
  staffList.forEach((s) => {
    const name = s.status?.name;
    if (counts[name] !== undefined) counts[name]++;
  });

  const boxes = [
    { label: 'Total staff members', value: staffList.length, cls: 'total' },
    { label: 'Active', value: counts.Active, cls: 'active' },
    { label: 'Resigned', value: counts.Resigned, cls: 'resigned' },
    { label: 'Terminated', value: counts.Terminated, cls: 'terminated' },
    { label: 'Unknown', value: counts.Unknown, cls: 'unknown' },
  ];

  document.getElementById('stat-boxes').innerHTML = boxes.map((b) => `
    <div class="stat-box ${b.cls}">
      <span class="stat-box-number">${b.value}</span>
      <span class="stat-box-label">${b.label}</span>
    </div>
  `).join('');
}

/* ---------- Card ---------- */
function fieldLines(dept, deptColor, deptLogo, rank, rankIcon, start, end, isSecondary) {
  const deptLogoHtml = deptLogo
    ? `<img src="${deptLogo}" alt="${dept} logo">`
    : deptInitial(dept);

  return `
    <div class="field-line">
      <span class="mini-logo" style="background:${deptColor}33;">${deptLogoHtml}</span>
      ${isSecondary ? 'Secondary: ' : ''}${dept}
    </div>
    <div class="field-line">
      ${rankIcon ? `<span class="mini-logo"><img src="${rankIcon}" alt="${rank} icon"></span>` : ''}
      ${isSecondary ? 'Secondary ' : ''}Rank: ${rank}
    </div>
    <div class="field-line">${isSecondary ? 'Secondary ' : ''}Term: ${formatTerm(start, end)}</div>
    <div class="field-line">${isSecondary ? 'Secondary ' : ''}Total days: ${totalDays(start, end)}</div>
  `;
}

function renderCard(staff) {
  const card = document.createElement('div');
  card.className = 'staff-card';
  card.tabIndex = 0;

  const pic = staff.profile_pic_url
    ? `<img class="profile-pic" src="${staff.profile_pic_url}" alt="${staff.username}">`
    : `<div class="profile-pic" style="display:flex;align-items:center;justify-content:center;">?</div>`;

  card.innerHTML = `
    ${pic}
    <div class="username">${staff.username}</div>
    <span class="status-badge" style="background:${staff.status?.color || '#ccc'}22;color:${staff.status?.color || '#333'};">
      ${staff.status?.name || 'Unknown'}
    </span>
    ${fieldLines(
      staff.primary_department?.name || '—',
      staff.primary_department?.color || '#ccc',
      staff.primary_department?.logo_url,
      staff.current_rank?.name || '—',
      staff.current_rank?.icon_url,
      staff.term_start, staff.term_end, false
    )}
    ${staff.secondary_department ? `
      <hr class="secondary-divider">
      ${fieldLines(
        staff.secondary_department?.name || '—',
        staff.secondary_department?.color || '#ccc',
        staff.secondary_department?.logo_url,
        staff.secondary_rank?.name || '—',
        staff.secondary_rank?.icon_url,
        staff.secondary_term_start, staff.secondary_term_end, true
      )}
    ` : ''}
  `;

  card.addEventListener('click', () => openModal(staff));
  card.addEventListener('keypress', (e) => { if (e.key === 'Enter') openModal(staff); });
  return card;
}

/* ---------- Department sections ---------- */
function renderDepartmentSections(staffList) {
  const container = document.getElementById('department-sections');
  container.innerHTML = '';

  departments.forEach((dept) => {
    const members = staffList
      .filter((s) => s.primary_department_id === dept.id)
      .sort((a, b) => new Date(a.term_start) - new Date(b.term_start));

    const section = document.createElement('section');
    section.className = 'department-section';
    section.style.background = dept.color;

    section.innerHTML = `
      <div class="department-header">
        <div class="department-logo">
          ${dept.logo_url ? `<img src="${dept.logo_url}" alt="${dept.name}">` : deptInitial(dept.name)}
        </div>
        <h2>${dept.name}</h2>
      </div>
    `;

    if (!members.length) {
      section.innerHTML += '<p class="department-empty-note">No staff members currently listed.</p>';
    } else {
      const grid = document.createElement('div');
      grid.className = 'staff-card-grid';
      members.forEach((m) => grid.appendChild(renderCard(m)));
      section.appendChild(grid);
    }

    container.appendChild(section);
  });
}

/* ---------- Modal ---------- */
const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

function fieldRow(label, value) {
  return `<div class="field-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function logoRow(label, name, logoUrl, color) {
  const logoHtml = logoUrl
    ? `<span class="mini-logo"><img src="${logoUrl}" alt="${name} logo"></span>`
    : `<span class="mini-logo" style="background:${color || '#ccc'}33;">${deptInitial(name)}</span>`;
  return `<div class="field-row"><span class="label">${label}</span><span class="value modal-logo-row">${logoHtml}${name}</span></div>`;
}

function rankRow(label, rank) {
  const iconHtml = rank?.icon_url
    ? `<span class="mini-logo"><img src="${rank.icon_url}" alt="${rank.name} icon"></span>`
    : '';
  return `<div class="field-row"><span class="label">${label}</span><span class="value modal-logo-row">${iconHtml}${rank?.name || '—'}</span></div>`;
}

async function openModal(staff) {
  const pic = staff.profile_pic_url
    ? `<img class="profile-pic" src="${staff.profile_pic_url}" alt="${staff.username}">`
    : `<div class="profile-pic" style="display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;">?</div>`;

  let html = `
    ${pic}
    <div class="username">${staff.username}</div>
    <span class="status-badge" style="background:${staff.status?.color || '#ccc'}22;color:${staff.status?.color || '#333'};">
      ${staff.status?.name || 'Unknown'}
    </span>
    ${logoRow('Primary department', staff.primary_department?.name || '—', staff.primary_department?.logo_url, staff.primary_department?.color)}
    ${rankRow('Current rank', staff.current_rank)}
    ${fieldRow('Term', formatTerm(staff.term_start, staff.term_end))}
    ${fieldRow('Total days', totalDays(staff.term_start, staff.term_end))}
  `;

  if (staff.secondary_department) {
    html += `
      ${logoRow('Secondary department', staff.secondary_department?.name || '—', staff.secondary_department?.logo_url, staff.secondary_department?.color)}
      ${rankRow('Secondary rank', staff.secondary_rank)}
      ${fieldRow('Secondary term', formatTerm(staff.secondary_term_start, staff.secondary_term_end))}
      ${fieldRow('Secondary total days', totalDays(staff.secondary_term_start, staff.secondary_term_end))}
    `;
  }

  if (staff.stow_count > 0) html += fieldRow('Staff of the Week awards', staff.stow_count);
  if (staff.stom_count > 0) html += fieldRow('Staff of the Month awards', staff.stom_count);

  html += `<hr class="full-divider"><h3>Past departments</h3>`;

  const { data: pastDepts } = await supabase
    .from('staff_past_departments')
    .select('*, status:status_id(name, color), former_rank:former_rank_id(name, icon_url), department:department_id(name, logo_url, color)')
    .eq('staff_id', staff.id)
    .order('term_start');

  if (pastDepts && pastDepts.length) {
    pastDepts.forEach((p) => {
      html += `
        <div class="past-department-entry">
          ${logoRow('Department name', p.department?.name || 'Unknown', p.department?.logo_url, p.department?.color)}
          ${rankRow('Former rank', p.former_rank)}
          ${fieldRow('Status', `<span class="status-badge" style="background:${p.status?.color || '#ccc'}22;color:${p.status?.color || '#333'};">${p.status?.name || 'Unknown'}</span>`)}
          ${fieldRow('Term', formatTerm(p.term_start, p.term_end))}
          ${fieldRow('Total days', totalDays(p.term_start, p.term_end))}
        </div>
      `;
    });
  } else {
    html += `<p class="notes-text">No past departments on file.</p>`;
  }

  html += `<hr class="full-divider"><h3>Notes</h3><p class="notes-text">${staff.notes || 'No notes on file.'}</p>`;
  
  const pastUsernames = staff.past_usernames || [];
  if (pastUsernames.length) {
    html += `
      <hr class="full-divider">
      <h3>Past usernames</h3>
      <p class="notes-text">${pastUsernames.map((p) => p.username).join(', ')}</p>
    `;
  }
  modalContent.innerHTML = html;
  overlay.classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.remove('open'); });

/* ---------- Filters ---------- */
function populateFilterOptions() {
  const deptSelect = document.getElementById('filter-department');
  departments.forEach((d) => deptSelect.insertAdjacentHTML('beforeend', `<option value="${d.id}">${d.name}</option>`));

  const rankSelect = document.getElementById('filter-rank');
  ranks.forEach((r) => rankSelect.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.name}</option>`));

  const years = [...new Set(allStaff.filter((s) => s.term_start).map((s) => s.term_start.slice(0, 4)))].sort();
  const yearSelect = document.getElementById('filter-year');
  years.forEach((y) => yearSelect.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));
}

function applyFilters() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const dept = document.getElementById('filter-department').value;
  const status = document.getElementById('filter-status').value;
  const rank = document.getElementById('filter-rank').value;
  const year = document.getElementById('filter-year').value;

  const filtered = allStaff.filter((s) => {
    if (search) {
      const matchesCurrent = s.username.toLowerCase().includes(search);
      const matchesPast = (s.past_usernames || []).some((p) => p.username.toLowerCase().includes(search));
      if (!matchesCurrent && !matchesPast) return false;
    }
    if (dept && s.primary_department_id !== dept) return false;
    if (status && s.status?.name !== status) return false;
    if (rank && s.current_rank_id !== rank) return false;
    if (year && !s.term_start?.startsWith(year)) return false;
    return true;
  });

  renderStats(filtered);
  renderDepartmentSections(filtered);
}

['search-input', 'filter-department', 'filter-status', 'filter-rank', 'filter-year'].forEach((id) => {
  document.getElementById(id).addEventListener('input', applyFilters);
});

/* ---------- Init ---------- */
await loadReferenceData();
await loadStaff();
populateFilterOptions();
applyFilters();
