// GitHub OAuth authentication via Supabase
//
// Prerequisites: Enable GitHub provider in Supabase Dashboard
//   1. Go to Authentication > Providers > GitHub
//   2. Add your GitHub OAuth App Client ID and Secret
//   3. Set callback URL to: https://krmlzwwelqvlfslwltol.supabase.co/auth/v1/callback

import { SUPA_URL, SUPA_ANON } from '../core/constants.js';

let _supabase = null;

async function getSupabase() {
  if (_supabase) return _supabase;
  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
  _supabase = createClient(SUPA_URL, SUPA_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _supabase;
}

/**
 * Sign in with GitHub OAuth.
 * Redirects the browser to GitHub for authorization, then back to the app.
 */
export async function signInWithGitHub() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

/** Sign out the current user. */
export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get the current session (null if not logged in). */
export async function getSession() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Get the current user (null if not logged in). */
export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** Subscribe to auth state changes. Returns { data: { subscription } }. */
export function onAuthStateChange(callback) {
  // Lazy init — getSupabase() is async, so we need to handle this carefully
  getSupabase().then((supabase) => {
    supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  });
}
