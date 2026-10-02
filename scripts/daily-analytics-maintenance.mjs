import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load env
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runDailyMaintenance() {
  console.log('=== [Daily Analytics Maintenance] Starting ===', new Date().toISOString());

  // 1. Rollup yesterday & today
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  for (const day of [yesterday, today]) {
    const from = `${day}T00:00:00.000Z`;
    const to = `${day}T23:59:59.999Z`;
    console.log(`Running rollup for: ${day}...`);
    const { data, error } = await supabase.rpc('refresh_prop_analytics', {
      p_from: from,
      p_to: to,
      p_range_days: 1
    });
    if (error) {
      console.error(`Rollup error on ${day}:`, error.message);
    } else {
      console.log(`Rollup completed for ${day}:`, data);
    }
  }

  // 2. Retention Cleanup (> 10 days)
  const retentionCutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  console.log(`Purging raw events older than ${retentionCutoff}...`);

  // Clean raw events
  const { count: delEvents } = await supabase
    .from('algorithm_events')
    .delete({ count: 'exact' })
    .lt('created_at', retentionCutoff);
  console.log(`Purged ${delEvents || 0} old algorithm_events.`);

  // Clean raw activity intervals
  const { count: delIntervals } = await supabase
    .from('algorithm_activity_intervals')
    .delete({ count: 'exact' })
    .lt('started_at', retentionCutoff);
  console.log(`Purged ${delIntervals || 0} old algorithm_activity_intervals.`);

  // Clean raw sessions
  const { count: delSessions } = await supabase
    .from('algorithm_sessions')
    .delete({ count: 'exact' })
    .lt('last_activity_at', retentionCutoff);
  console.log(`Purged ${delSessions || 0} old algorithm_sessions.`);

  console.log('=== [Daily Analytics Maintenance] Done ===', new Date().toISOString());
}

runDailyMaintenance().catch(console.error);
