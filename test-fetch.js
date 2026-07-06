const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // First find the product
  const { data: pData } = await supabase.from('products').select('id, name').ilike('name', '%Wall Art Hand Craft%');
  console.log("Products:", pData);
  
  if (pData && pData.length > 0) {
    const pid = pData[0].id;
    console.log("Fetching tags for product_id:", pid);
    const { data: tData } = await supabase.from('product_rfid_tags').select('*').eq('product_id', pid);
    console.log("Tags:", tData);
  }
}

test();
