const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zexflchjcycxrpjkuews.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const logPath = 'C:\\Users\\Por Woodden\\.gemini\\antigravity\\brain\\b1c800b9-5c25-4e01-89a5-343119499409\\.system_generated\\tasks\\task-1936.log';

async function run() {
  if (!fs.existsSync(logPath)) {
    console.error("Log file does not exist!");
    return;
  }

  const logContent = fs.readFileSync(logPath, 'utf8');
  const lines = logContent.split('\n');

  console.log(`Read ${lines.length} lines from log.`);

  // Parse lines: "Fixing: <Name> (ID: <id>) | Stock: <old> -> <new> (Diff: <diff>)"
  const updates = [];
  let currentBranch = 14; // Default starts with Branch 14

  for (const line of lines) {
    if (line.includes('--- Fetching discrepancies for Branch 15 ---')) {
      currentBranch = 15;
    }
    if (line.includes('Fixing:')) {
      const match = line.match(/Fixing: .*? \(ID: (\d+)\) \| Stock: (\d+) -> (\d+)/);
      if (match) {
        const id = parseInt(match[1]);
        const oldStock = parseInt(match[2]);
        const newStock = parseInt(match[3]);
        updates.push({ id, oldStock, newStock, branch: currentBranch });
      }
    }
  }

  console.log(`Parsed ${updates.length} updates from log.`);
  
  // Revert updates
  let revertCount = 0;
  for (const u of updates) {
    // We only need to revert Branch 14 because Branch 15 was already restored by scratch_fix_branch15.js
    if (u.branch === 14) {
      console.log(`Reverting Branch 14 product ${u.id}: ${u.newStock} -> ${u.oldStock}`);
      
      const { error } = await supabase
        .from('stock')
        .update({ qty: u.oldStock, updated_at: new Date().toISOString() })
        .eq('product_id', u.id)
        .eq('branch_id', 14);

      if (error) {
        console.error(`Error reverting product ${u.id}:`, error);
      } else {
        revertCount++;
      }
    }
  }

  console.log(`Reverted ${revertCount} items at Branch 14.`);

  // Delete all manual ADJUST movements for Branch 14 created today
  const productIds = updates.filter(u => u.branch === 14).map(u => u.id);
  const { data: deletedMovements, error: deleteError } = await supabase
    .from('stock_movements')
    .delete()
    .eq('branch_id', 14)
    .eq('type', 'ADJUST')
    .eq('ref_type', 'MANUAL')
    .in('product_id_bigint', productIds);

  if (deleteError) {
    console.error("Error deleting movements:", deleteError);
  } else {
    console.log("Deleted Branch 14 temporary ADJUST movements.");
  }
}
run();
