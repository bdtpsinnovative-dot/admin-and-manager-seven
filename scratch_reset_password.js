const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zexflchjcycxrpjkuews.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function reset(email, newPassword) {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });
  if (error) {
    console.error(`Error resetting password for ${email}:`, error);
  } else {
    console.log(`Successfully reset password for ${email} to ${newPassword}`);
  }
}

async function run() {
  await reset('jan@gmail.com', '12345678');
  await reset('sathon@gmail.com', '12345678');
  await reset('ball2@gmail.com', '12345678');
  await reset('btv@gmail.com', '12345678');

  console.log("\nTesting login for jan@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'jan@gmail.com',
    password: '12345678'
  });
  if (error) {
    console.error("Test login failed:", error.message);
  } else {
    console.log("Test login SUCCESS! Logged in user ID:", data.user.id);
  }
}
run();
