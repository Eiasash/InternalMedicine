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

/**
 * P0 secret-cutover (runbook §3): mint the `Authorization: Bearer` value for the
 * /api/claude proxy so the shared x-api-secret can leave the client bundle.
 *   - A user with an existing GoTrue/OAuth session reuses THAT token.
 *   - Guests and custom `auth_login_user` users (no GoTrue session) get an
 *     anonymous GoTrue session purely to obtain a proxy token.
 * This is safe re: the existing flows: this Supabase client is the auth-only
 * GoTrue client — the custom auth_login_user login and the leaderboard/feedback/
 * backup writes go via raw REST with the anon key, so they are unaffected by the
 * anonymous sign-in here. signInAnonymously runs only when there is NO session.
 */
export async function getProxyBearer() {
  const supabase = await getSupabase();
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw error ?? new Error('anonymous sign-in failed');
    session = data.session;
  }
  return `Bearer ${session.access_token}`;
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
