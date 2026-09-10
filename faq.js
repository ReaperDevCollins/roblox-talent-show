import { supabase } from './supabaseClient.js';

async function loadFaqs() {
  const { data } = await supabase.from('faqs').select('*').order('sort_order');
  const list = document.getElementById('faq-list');

  if (!data || !data.length) {
    list.innerHTML = '<p class="crud-empty">No questions have been added yet.</p>';
    return;
  }

  list.innerHTML = data.map((faq) => `
    <div class="faq-item">
      <button class="faq-question" aria-expanded="false">
        ${faq.question}
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer"><p>${faq.answer}</p></div>
    </div>
  `).join('');

  attachToggles();
}

function attachToggles() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
    });
  });
}

loadFaqs();