import { supabase } from './supabaseClient.js';

/* ---------- Staff recognition ---------- */
async function loadRecognition(type, gridSelector) {
  const { data } = await supabase
    .from('staff_recognition_current')
    .select('staff:staff_id(username, profile_pic_url)')
    .eq('type', type)
    .order('slot_order');

  const grid = document.querySelector(gridSelector);
  const slots = 4;
  const entries = data || [];

  grid.innerHTML = Array.from({ length: slots }, (_, i) => {
    const entry = entries[i];
    if (!entry || !entry.staff) return '<div class="staff-slot"></div>';
    return `
      <div class="staff-slot filled">
        ${entry.staff.profile_pic_url ? `<img src="${entry.staff.profile_pic_url}" alt="${entry.staff.username}">` : ''}
        <span>${entry.staff.username}</span>
      </div>
    `;
  }).join('');
}

/* ---------- Recent media ---------- */
async function loadMedia() {
  const { data } = await supabase.from('social_posts').select('*').order('sort_order').limit(4);
  const grid = document.querySelector('.media-grid');
  const posts = data || [];

  grid.innerHTML = Array.from({ length: 4 }, (_, i) => {
    const post = posts[i];
    if (!post) return '<div class="media-slot"></div>';
    return `
      <a class="media-slot filled" href="${post.link}" target="_blank" rel="noopener">
        ${post.thumbnail_url ? `<img src="${post.thumbnail_url}" alt="${post.title}">` : ''}
        <span>${post.title}</span>
      </a>
    `;
  }).join('');
}

/* ---------- Newspapers ---------- */
async function loadNewspapers() {
  const { data } = await supabase.from('newspapers').select('*').order('created_at', { ascending: false }).limit(2);
  const grid = document.querySelector('.news-grid');
  const papers = data || [];

  grid.innerHTML = Array.from({ length: 2 }, (_, i) => {
    const paper = papers[i];
    if (!paper) return '<div class="news-slot"></div>';
    return `
      <a class="news-slot filled" href="${paper.link}" target="_blank" rel="noopener">
        ${paper.thumbnail_url ? `<img src="${paper.thumbnail_url}" alt="${paper.title}">` : ''}
        <span>${paper.title}</span>
      </a>
    `;
  }).join('');
}

loadRecognition('STOM', '.staff-boxes .staff-box:nth-child(1) .staff-grid');
loadRecognition('STOW', '.staff-boxes .staff-box:nth-child(2) .staff-grid');
loadMedia();
loadNewspapers();