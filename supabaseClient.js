import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://peanoxouvthzdcklgnjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYW5veG91dnRoemRja2xnbmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDc0MDEsImV4cCI6MjEwNDEyMzQwMX0.uk3vEUp1OT_Wp-0VyYy6KN5XzPUDtt6LgeSOCOR6vg4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);