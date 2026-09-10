import { supabase } from './supabaseClient.js';

export async function loginWithRole(email, password, allowedRoles) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, message: 'Incorrect email or password.' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile || !allowedRoles.includes(profile.role)) {
    await supabase.auth.signOut();
    return { success: false, message: 'This account does not have access to this panel.' };
  }

  return { success: true, role: profile.role };
}

export async function requireRole(allowedRoles, redirectTo) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = redirectTo; return null; }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    window.location.href = redirectTo;
    return null;
  }
  return profile.role;
}

export async function logout(redirectTo) {
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}