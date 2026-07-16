const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zexflchjcycxrpjkuews.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: branches, error } = await supabase
    .from('branches')
    .select('id, branch_name, branch_code');

  if (error) {
    console.error(error);
    return;
  }

  console.log("Branches in system:");
  for (const b of branches) {
    console.log(`ID: ${b.id} | Name: ${b.branch_name} | Code: ${b.branch_code}`);
  }
}
run();
