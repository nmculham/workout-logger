import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const redirectTo = Capacitor.isNativePlatform()
    ? 'com.workoutlogger.app://login-callback'
    : `${window.location.origin}/`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Capacitor.isNativePlatform() },
  });
  if (error) throw error;

  if (Capacitor.isNativePlatform() && data.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getUser() {
  return supabase.auth.getUser();
}
