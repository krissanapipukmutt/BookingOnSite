# ข้อมูลโครงสร้างฐานข้อมูล (Data Dictionary)

สคีมา: `boksite` (Postgres/Supabase)

หมายเหตุ
- คีย์หลักส่วนใหญ่ใช้ชนิด `uuid` (ค่าเริ่มต้น `gen_random_uuid()`)
- เขตข้อมูลเวลาใช้ `timestamptz` และตั้งค่าเริ่มต้น `now()`
- สถานะการจองใช้ ENUM: `booking_status = ('BOOKED','CANCELLED')`
- กลยุทธ์การจองฝ่ายงานเก็บในตาราง `department_booking_strategies` (อ้างอิงด้วยรหัส)

## ตารางหลัก (Tables)

### offices
- `id: uuid` คีย์หลัก
- `name: text` ชื่อออฟฟิศ (ไม่ซ้ำ)
- `created_at: timestamptz` วันที่สร้าง

ความสัมพันธ์: `departments.office_id -> offices.id`, `company_holidays.office_id -> offices.id`

### departments
- `id: uuid` คีย์หลัก
- `office_id: uuid` อ้างถึงออฟฟิศ (ว่างได้ = ทุกออฟฟิศ)
- `name: text` ชื่อฝ่ายงาน (ไม่ซ้ำภายในออฟฟิศเดียวกัน)
- `booking_strategy: text` กลยุทธ์การจอง อ้างอิง `department_booking_strategies.code`
- `seat_capacity: integer` ความจุสูงสุดต่อวัน (ใช้เมื่อ strategy = CAPACITY)
- `is_active: boolean` เปิดใช้งานหรือไม่
- `created_at: timestamptz`

ความสัมพันธ์: `departments.office_id -> offices.id`, ถูกอ้างโดย `department_seats`, `employee_profiles`, `bookings`

### department_seats
- `id: uuid` คีย์หลัก
- `department_id: uuid` ฝ่ายงานที่ที่นั่งสังกัด
- `seat_code: text` รหัสที่นั่ง (ไม่ซ้ำภายในฝ่ายเดียวกัน)
- `created_at: timestamptz`

ความสัมพันธ์: `department_seats.department_id -> departments.id`, ถูกอ้างโดย `bookings.seat_id`

### booking_purposes
- `id: uuid` คีย์หลัก
- `name: text` ชื่อวัตถุประสงค์
- `description: text` รายละเอียด (ถ้ามี)
- `is_active: boolean` สถานะการใช้งาน
- `created_at: timestamptz`
- `updated_at: timestamptz`

ความสัมพันธ์: ถูกอ้างโดย `bookings.purpose_id`

### employee_profiles
- `user_id: uuid` คีย์หลัก (สอดคล้องกับผู้ใช้ในระบบ Auth ได้)
- `employee_code: text` รหัสพนักงาน (ไม่ซ้ำ)
- `first_name: text` ชื่อ
- `last_name: text` นามสกุล
- `email: text` อีเมล (ไม่ซ้ำได้)
- `department_id: uuid` ฝ่ายงานที่สังกัด (ว่างได้)
- `start_date: date` วันที่เริ่มงาน
- `is_active: boolean` สถานะการใช้งาน
- `created_at: timestamptz`

ความสัมพันธ์: `employee_profiles.department_id -> departments.id`, ถูกอ้างโดย `bookings.user_id`

### bookings
- `id: uuid` คีย์หลัก
- `booking_date: date` วันที่จองเข้าออฟฟิศ
- `department_id: uuid` ฝ่ายงานที่จอง
- `seat_id: uuid` ที่นั่ง (ว่างได้; บังคับเมื่อ strategy = ASSIGNED)
- `purpose_id: uuid` เหตุผลการเข้าออฟฟิศ (ว่างได้)
- `note: text` บันทึกเพิ่มเติม
- `user_id: uuid` อ้างอิงพนักงานที่จอง
- `status: booking_status` สถานะการจอง (`BOOKED`/`CANCELLED`)
- `created_at: timestamptz`

ดัชนีสำคัญ: `booking_date`, `user_id`, `department_id`

### company_holidays
- `id: uuid` คีย์หลัก
- `holiday_date: date` วันที่หยุด
- `name: text` ชื่อวันหยุด
- `office_id: uuid` ออฟฟิศที่เกี่ยวข้อง (ว่างได้ = ทุกออฟฟิศ)
- `description: text` รายละเอียด
- `created_at: timestamptz`

### department_booking_strategies (lookup)
- `code: text` คีย์หลัก (`UNLIMITED`, `CAPACITY`, `ASSIGNED`)
- `display_name: text` ป้ายแสดงผล
- `description: text` คำอธิบาย

## มุมมองรายงาน (Views)

### employee_booking_history
คอลัมน์: `booking_id, booking_date, department_name, office_name, status, purpose_name, seat_code, employee_code, employee_name`
อธิบาย: แสดงรายการจองล่าสุดพร้อมข้อมูลประกอบจากตารางที่เกี่ยวข้อง

### booking_status_daily_summary
คอลัมน์: `booking_date, purpose_name, status, total`
อธิบาย: สรุปจำนวนการจองต่อวัน แยกตามเหตุผลและสถานะ

### department_daily_capacity_usage
คอลัมน์: `booking_date, department_name, office_name, active_bookings, seat_capacity, remaining_capacity`
อธิบาย: เปรียบเทียบจำนวนจองของแต่ละฝ่ายงานกับความจุที่กำหนดในวันนั้น

### department_monthly_attendance
คอลัมน์: `department_id, department_name, office_name, month_start, total_bookings`
อธิบาย: สรุปยอดการจองต่อเดือนของแต่ละฝ่ายงาน

### employee_yearly_attendance
คอลัมน์: `user_id, employee_code, first_name, last_name, year, total_booked_days`
อธิบาย: จำนวนวันที่เข้าออฟฟิศต่อปีของแต่ละพนักงาน

### office_holiday_overview
คอลัมน์: `holiday_date, office_name, holiday_name, description`
อธิบาย: ปฏิทินวันหยุดตามออฟฟิศ

## หมายเหตุด้านสิทธิ์ (สำหรับทดสอบแบบไม่มีล็อกอิน)
ต้อง Grant สิทธิ์ให้ role `anon` และสร้าง RLS Policy แบบเปิดสำหรับตารางที่ต้องเขียน เช่น `bookings`, `company_holidays`
(ดูตัวอย่างสคริปต์ในคำตอบก่อนหน้าได้ หรือให้ผมจัดทำไฟล์ grants.sql เพิ่มให้ได้)
