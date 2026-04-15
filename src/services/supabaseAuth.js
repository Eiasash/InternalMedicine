// GitHub OAuth authentication via Supabase
//
// Prerequisites: Enable GitHub provider in Supabase Dashboard
//   1. Go to Authentication > Providers > GitHub
//   2. Add your GitHub OAuth App Client ID and Secret
//   3. Set callback URL to: https://krmlzwwelqvlfslwltol.supabase.co/auth/v1/callback

import { createClient } from '@supabase/supabase-js';
import { SUPA_URL, SUPA_ANON } from '../core/constants.js';

// Supabase client with auth support
const supabase = createClient(SUPA_URL, SUPA_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { supabase };

/**
 * Sign in with GitHub OAuth.
 * Redirects the browser to GitHub for authorization, then back to the app.
 */
export async function signInWithGitHub() {
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get the current session (null if not logged in). */
export async function getSession() {
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
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
