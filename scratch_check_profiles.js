const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zexflchjcycxrpjkuews.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, role, branch_id');

  if (error) {
    console.error(error);
    return;
  }

  console.log("Profiles in system:");
  for (const p of profiles) {
    console.log(`User: ${p.full_name} | Role: ${p.role} | Branch ID: ${p.branch_id} | UID: ${p.user_id}`);
  }
}
run();
