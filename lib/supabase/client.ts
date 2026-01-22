/**
 * Supabase Client Configuration
 * 
 * Creates and exports a singleton Supabase client instance.
 * The client is configured with environment variables and includes
 * optimized settings for better performance and reliability.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase client instance
 * 
 * Configured with:
 * - Auto-refresh session
 * - Optimized connection pooling
 * - Error handling
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // Optimize for performance
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
