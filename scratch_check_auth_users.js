const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zexflchjcycxrpjkuews.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error(error);
    return;
  }

  console.log("Auth Users:");
  for (const u of users) {
    console.log(`Email: ${u.email} | ID: ${u.id}`);
  }
}
run();
