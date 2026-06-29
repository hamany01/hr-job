import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined';
};

// Create the Supabase client. If credentials are missing, we use placeholder values to avoid crashes.
const safeUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-project.supabase.co';
const safeKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);
