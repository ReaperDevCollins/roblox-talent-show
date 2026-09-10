import { supabase } from './supabaseClient.js';

async function loadStaffCount() {
  const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true });
  const staffStat = document.querySelector('.stats .stat:nth-child(2) .stat-number');
  if (staffStat) staffStat.dataset.target = count || 0;
}

function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1600;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString() + suffix;
  }
  requestAnimationFrame(tick);
}

const statsSection = document.getElementById('stats');
let hasRun = false;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !hasRun) {
      hasRun = true;
      document.querySelectorAll('.stat-number').forEach(animateCount);
      observer.disconnect();
    }
  });
}, { threshold: 0.4 });

/* ---------- Editors teaser ---------- */
async function loadEditorTeasers() {
  const { data } = await supabase.from('editors').select('*').order('sort_order').limit(3);
  const container = document.querySelector('.editor-placeholders');
  if (!data || !data.length) return; // leave dashed placeholders if none added yet

  container.innerHTML = data.map((ed) => `
    <div class="editor-slot filled">
      ${ed.photo_url ? `<img src="${ed.photo_url}" alt="${ed.name}">` : ''}
      <span>${ed.name}</span>
    </div>
  `).join('');
}

await loadStaffCount();
observer.observe(statsSection);
loadEditorTeasers();