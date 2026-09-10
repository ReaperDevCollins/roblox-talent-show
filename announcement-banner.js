import { supabase } from './supabaseClient.js';

async function loadAnnouncement() {
  const { data, error } = await supabase
    .from('announcements')
    .select('title, message')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const banner = document.getElementById('announcement-banner');
  if (error || !data) return;

  banner.innerHTML = `<strong>${data.title}</strong>${data.message}`;
  banner.style.display = 'block';
}

loadAnnouncement();