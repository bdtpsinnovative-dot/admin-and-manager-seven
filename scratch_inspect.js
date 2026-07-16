const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://zexflchjcycxrpjkuews.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M"
);

async function run() {
  const { data, error } = await supabase
    .from('damaged_goods_records')
    .select('*')
    .limit(10);
  console.log('Result:', data, error);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    // Try inserting a dummy empty object to check columns/errors
    const { data: insData, error: insError } = await supabase
      .from('damaged_goods_records')
      .insert({});
    console.log('Insert dummy empty:', insData, insError);
  }
}
run();
