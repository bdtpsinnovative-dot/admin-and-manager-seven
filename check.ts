import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://zexflchjcycxrpjkuews.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M');
(async () => {
  const { data, error } = await supabase.from('orders').select('special_discount_baht').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
})();
