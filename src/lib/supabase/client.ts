import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zexflchjcycxrpjkuews.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzMyNTEsImV4cCI6MjA4MDc0OTI1MX0.Hw3dJqP6-bpmqMW56pGHB1-Y2hN9tjCKNq9u2BnyeTk'

    browserClient = createBrowserClient(supabaseUrl, supabaseKey)
  }

  return browserClient
}
