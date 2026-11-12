import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'etm_supabase_url';
const STORAGE_ANON_KEY = 'etm_supabase_anon_key';

const DEFAULT_SUPABASE_URL = 'https://hkbxzosiregbfiqrtvkz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_zpYsrgelkd9qyOzRjt_WEw_LDpHuhUG';

export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'runtime' | 'none';
} {
  const storedUrl = (localStorage.getItem(STORAGE_URL_KEY) || '').trim();
  const storedKey = (localStorage.getItem(STORAGE_ANON_KEY) || '').trim();

  if (storedUrl && storedKey) {
    return { url: storedUrl, anonKey: storedKey, isConfigured: true, source: 'runtime' };
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY).trim();

  if (
    envUrl &&
    envKey &&
    !envUrl.includes('your-project-id') &&
    !envKey.includes('your-supabase-anon')
  ) {
    return { url: envUrl, anonKey: envKey, isConfigured: true, source: 'env' };
  }

  return { url: '', anonKey: '', isConfigured: false, source: 'none' };
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const composite = `${url}::${anonKey}`;
  if (!cachedClient || cachedKey !== composite) {
    cachedClient = createClient(url, anonKey);
    cachedKey = composite;
  }
  return cachedClient;
}

export function saveRuntimeSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  cachedClient = null;
  cachedKey = '';
}

export function clearRuntimeSupabaseConfig() {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  cachedClient = null;
  cachedKey = '';
}
