# Booking Onsite Frontend (React + Vite)
## BookingOnSite — ระบบจองที่นั่ง/สถานที่ภายในองค์กร (Frontend)

โปรเจ็กต์นี้เป็น frontend แบบโปรโตไทป์สำหรับระบบ Booking Onsite ที่พัฒนาด้วย React + Vite โดยเชื่อมต่อกับฐานข้อมูล Supabase (มีสคริปต์ฐานข้อมูลในโฟลเดอร์ `db/`) — ถ้าไม่ได้ตั้งค่า Supabase ระบบจะใช้ข้อมูลตัวอย่าง (sample data) เพื่อให้สามารถสาธิต flow ได้

## สรุป (สั้น ๆ)
- เป้าหมาย: หน้าเว็บสำหรับให้พนักงานจองที่นั่ง/พื้นที่ภายในองค์กร, ให้ HR จัดการวันหยุด และให้ผู้ดูแลระบบดูรายงาน
- รูปแบบ: Single Page Application (SPA) ที่ออกแบบแบบ mobile-first

## Tech stack
- Frontend: React (v19), Vite
- UI: CSS (ไฟล์ใน `src/` เช่น `App.css`, `index.css`), mobile-first responsive
- Backend-as-a-service: Supabase (Postgres + Auth + Storage) — client library: `@supabase/supabase-js`
- Linting / Dev tools: ESLint, Vite, nodemon (dev)

## โครงสร้างไฟล์หลัก (จาก root)
- `src/` — โค้ด frontend (entry: `main.jsx`, หลัก ๆ มี `App.jsx`, สไตล์, assets)
- `public/` — รูป/สาธารณะ (เช่น `vite.svg`)
- `db/` — สคริปต์ฐานข้อมูลและ data dictionary (`schema.sql`, `grants.sql`, `data_dictionary.md`)
- `index.html`, `vite.config.js`, `package.json`, `eslint.config.js`

## การติดตั้งและรันโปรเจ็กต์ (บนเครื่องนักพัฒนา)
1. ติดตั้ง dependency

```bash
npm install
```

2. รันโหมดพัฒนา (จะเปิด dev server ของ Vite)

```bash
npm run dev
```

3. เปิดเบราว์เซอร์ไปที่ URL ที่แสดงในเทอร์มินัล (ค่าเริ่มต้น: http://localhost:5173)

หมายเหตุเกี่ยวกับการเชื่อมต่อ Supabase
- เมื่อหน้าเว็บโหลด ให้คลิกปุ่ม/เมนู **"ตั้งค่าเชื่อมต่อ"** ใน header แล้วกรอก:
  - Supabase URL (เช่น `https://xyzcompany.supabase.co`)
  - Supabase anon/public key
- การตั้งค่านี้จะถูกเก็บชั่วคราวใน `localStorage` ของเบราว์เซอร์ ถ้าต้องการให้ตั้งค่าแบบถาวร ให้จัดการผ่านสคริปต์ deploy หรือใส่ค่า runtime ผ่านไฟล์ config ที่รองรับ

## สคริปต์ที่มีให้ใช้
- `npm run dev` — เริ่ม Vite dev server
- `npm run build` — สร้างไฟล์ production (โฟลเดอร์ `dist/`)
- `npm run preview` — เปิด preview จาก build
- `npm run lint` — รัน ESLint ตรวจโค้ด

## รายการฟีเจอร์ (รายละเอียด)
1. ฟอร์มจองสำหรับพนักงาน
	- เลือก Office / Department / Seat ตาม logic ของ `department_booking_strategy`
	- ตรวจสอบสถานะที่นั่ง (ว่าง/เต็ม) แบบเรียลไทม์จาก Supabase
	- รองรับการเลือกวันที่/ช่วงเวลา และแสดงการชนกันของการจอง (conflict)

2. การจัดการวันหยุด (Holiday management)
	- หน้าสำหรับ HR เพิ่ม/แก้ไข/ลบวันหยุด
	- แสดงรายการวันหยุดในปฏิทินหรือ list view

3. รายงาน (Reporting dashboard)
	- แสดงรายงานสำคัญจาก Supabase views (ตัวอย่าง: จำนวนการจองต่อวัน, การใช้งานตามแผนก, ที่นั่งยอดนิยม)
	- ฟิลเตอร์ช่วงเวลา / แผนก / office

4. สถานะการโหลดและ fallback
	- มี loading state, empty state สำหรับ UX ที่ดี
	- ถ้าไม่มีการเชื่อมต่อกับ Supabase ระบบจะใช้ sample data เพื่อสาธิต flow

5. UI แบบโมเดิร์นและตอบสนองขนาดหน้าจอ
	- mobile-first responsive, พื้นที่แสดงผลปรับตาม device

## ฐานข้อมูลและสคริปต์ (db)
- ไฟล์ SQL ใน `db/` ประกอบด้วย `schema.sql` สำหรับสร้างตาราง, `grants.sql` สำหรับสิทธิ์, และ `data_dictionary.md` อธิบายโครงสร้างข้อมูล
- หากต้องการตั้งค่า Supabase ด้วยสคริปต์: นำ SQL ไปรันกับฐานข้อมูล Postgres (หรือใช้ Supabase SQL editor)

## ข้อแนะนำการพัฒนา (best practices)
- แยก `src/` ให้เป็นโมดูล (components, pages, services) เพื่อขยายงานได้ง่าย
- เก็บค่า secrets (ถ้ามี) นอก repo; เพิ่ม `env.example` แทน `.env` จริง
- เพิ่ม test (Jest + React Testing Library) สำหรับ critical UI flows
- เพิ่ม CI workflow (lint, build) เพื่อยืนยันโค้ดก่อน merge

## ตัวอย่างการ deploy (สั้น ๆ)
1. สร้าง production build

```bash
npm run build
```

2. นำโฟลเดอร์ `dist/` ขึ้น static host ที่ต้องการ (Netlify, Vercel, Supabase Storage ฯลฯ)

3. ตั้งค่าค่ารันไทม์ (เช่น Supabase credentials) ตามแพลตฟอร์มการโฮสต์ หรือให้ผู้ใช้กรอกใน dialog ของแอป

## ถัดไปที่ผมสามารถช่วยได้
- จัดโครงสร้าง `src/` ให้เป็นมาตรฐาน (สร้าง `components/`, `pages/`, `lib/` พร้อมตัวอย่าง)
- สร้าง `env.example` และเพิ่มคำอธิบายการตั้งค่า Supabase ใน `README.md` ให้ละเอียดขึ้น
- เพิ่ม `lint:fix` script และรัน lint เพื่อแก้ปัญหาเบื้องต้น

หากต้องการ ผมจะอัปเดตไฟล์ `README.md` นี้ให้เป็นเวอร์ชันสุดท้าย (ผมทำแล้ว) — บอกผมได้ว่าต้องการให้เพิ่มข้อมูลใดเพิ่มเติมหรือให้ผมจัดโครงสร้าง `src/` ให้ทันที

...
