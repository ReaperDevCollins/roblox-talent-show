import { supabase } from './supabaseClient.js';

async function loadEditors() {
  const { data } = await supabase.from('editors').select('*').order('sort_order');
  const grid = document.getElementById('editor-grid');

  if (!data || !data.length) {
    grid.innerHTML = '<p class="crud-empty">Editor profiles are on their way.</p>';
    return;
  }

  grid.innerHTML = data.map((ed) => `
    <div class="editor-card filled">
      ${ed.photo_url ? `<img src="${ed.photo_url}" alt="${ed.name}">` : '<div class="editor-card-placeholder-pic"></div>'}
      <h3>${ed.name}</h3>
      <p>${ed.bio || ''}</p>
    </div>
  `).join('');
}

loadEditors();