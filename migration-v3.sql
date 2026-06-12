-- v3: เพิ่มสาขา + ปิดระบบอนุมัติ (auto-approve)
-- รัน SQL นี้ใน Supabase SQL Editor

-- 1. เพิ่ม branch ใน employees
alter table employees add column if not exists branch text default 'ฝ่ายพัฒนาระบบโรงเรียน';
update employees set branch = 'ฝ่ายพัฒนาระบบโรงเรียน' where branch is null;

-- 2. ปิดระบบอนุมัติ — ทุกเช็คอินอนุมัติอัตโนมัติ
update checkins set status = 'approved' where status = 'pending';
alter table checkins alter column status set default 'approved';
