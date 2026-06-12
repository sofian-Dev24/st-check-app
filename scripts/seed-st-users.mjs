// Seed ST users via Supabase Admin API
// รัน: node scripts/seed-st-users.mjs
//
// ก่อนรัน ใส่ SUPABASE_SERVICE_ROLE_KEY ใน .env.local

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
try {
  const text = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch (e) {
  console.error('❌ อ่าน .env.local ไม่ได้:', e.message);
  process.exit(1);
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('❌ ไม่พบ NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน .env.local');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ===== User list =====
const users = [
  { emp_id: 'ST001',  name: 'ผอ.ซัลมาน พลาสิน',  branch: 'ผู้อำนวยการโรงเรียน', pin: '00001' },
  { emp_id: 'ST002',  name: 'ครูเจะซง พลาสิน',   branch: 'ประจำชั้น ป.1',       pin: '00002' },
  { emp_id: 'ST003',  name: 'ครูเดียะ',          branch: 'ประจำชั้น ป.4',       pin: '00003' },
  { emp_id: 'ST004',  name: 'ครูยา',             branch: 'ประจำชั้น อ.3',       pin: '00004' },
  { emp_id: 'ST005',  name: 'ครูย้ะ',            branch: 'ประจำชั้น อ.2',       pin: '00005' },
  { emp_id: 'ST006',  name: 'ครูนิ',             branch: 'ประจำชั้น อ.1',       pin: '00006' },
  { emp_id: 'ST007',  name: 'ครูนิสรีน',         branch: 'ประจำชั้น ป.2',       pin: '00007' },
  { emp_id: 'ST008',  name: 'ครูตัสนีม',         branch: 'ประจำชั้น ป.3',       pin: '00008' },
  { emp_id: 'ST009',  name: 'ครูยู',             branch: 'ผู้จัดการโรงเรียน',  pin: '00009' },
  { emp_id: 'ST0010', name: 'ครูดิษ',            branch: 'ประจำชั้น ป.2',       pin: '00010' },
  { emp_id: 'ST0011', name: 'ครูแนน',            branch: 'ประจำชั้น ป.5',       pin: '00011' },
  { emp_id: 'ST0012', name: 'ครูทั่วไป01',       branch: 'ประจำชั้น -1',        pin: '00012' },
  { emp_id: 'ST0013', name: 'ครูทั่วไป02',       branch: 'ประจำชั้น -2',        pin: '00013' },
  { emp_id: 'ST0014', name: 'ครูทั่วไป03',       branch: 'ประจำชั้น -3',        pin: '00014' },
  { emp_id: 'ST0015', name: 'ครูทั่วไป04',       branch: 'ประจำชั้น -4',        pin: '00015' },
];

console.log('\n🔄 ลบ ST users เก่าทั้งหมด...');

// Step 1: ลบ ST users ทั้งหมด (รวม employees rows ตาม cascade)
const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
const stUsers = (existingUsers?.users ?? []).filter(u =>
  u.email?.endsWith('@sathachon.local') && u.email?.startsWith('st')
);

for (const u of stUsers) {
  const { error } = await supabase.auth.admin.deleteUser(u.id);
  if (error) console.error(`  ⚠️  ลบ ${u.email} ไม่ได้:`, error.message);
  else console.log(`  🗑️  ลบ ${u.email}`);
}

console.log(`\n✨ สร้าง ${users.length} user ใหม่ผ่าน Admin API...\n`);

let success = 0, failed = 0;

for (const u of users) {
  const email = `${u.emp_id.toLowerCase()}@sathachon.local`;

  // Create auth user via Admin API (uses same code path as Supabase UI)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: u.pin,
    email_confirm: true,
    user_metadata: { name: u.name },
  });

  if (createErr) {
    console.error(`  ❌ ${u.emp_id} (${u.name}):`, createErr.message);
    failed++;
    continue;
  }

  // Insert employees row
  const { error: empErr } = await supabase.from('employees').insert({
    id: created.user.id,
    emp_id: u.emp_id,
    name: u.name,
    role: 'staff',
    active: true,
    branch: u.branch,
  });

  if (empErr) {
    console.error(`  ❌ ${u.emp_id} employees row:`, empErr.message);
    failed++;
    continue;
  }

  console.log(`  ✅ ${u.emp_id} → ${u.name} (PIN: ${u.pin})`);
  success++;
}

console.log(`\n📊 สำเร็จ ${success}/${users.length} · ล้มเหลว ${failed}`);
console.log('\n🎉 เสร็จ! ลอง login ได้เลย\n');
