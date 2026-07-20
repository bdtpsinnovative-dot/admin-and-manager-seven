# Rules for Antigravity Coding Assistant

## 🛡️ Security & Cleanliness Rules

1. **ห้ามพิมพ์คีย์สำคัญลงในเทอร์มินัลเด็ดขาด (Never Expose Sensitive Keys in Terminal)**
   - ห้ามพิมพ์หรือรันคำสั่งใดๆ ที่มี Supabase Service Key, Anon Key, API Key หรือ Password ในลักษณะของ Plain-text ลงใน Command line (เช่น `node -e "const key = '...'"` หรือคำสั่ง `curl -H "Authorization: Bearer ..."` ที่ระบุคีย์ตัวจริง)
   - หากจำเป็นต้องรันสคริปต์ ให้ดึงค่าจากไฟล์ `.env.local` เสมอ (เช่น ใช้ `process.env.SUPABASE_SERVICE_ROLE_KEY` ร่วมกับไลบรารี `dotenv`)

2. **ทำความสะอาดไฟล์ทดสอบทุกครั้ง (Always Clean Up Test Files)**
   - หลังจากเขียนไฟล์สคริปต์ทดสอบชั่วคราว (เช่น `scratch_*.js`, `test-*.js`, `check.ts`) และตรวจสอบฟังก์ชันเสร็จสิ้นแล้ว **ต้องลบสคริปต์เหล่านั้นทิ้งทันที** ก่อนปิดงานหรือตอบสรุปผู้ใช้ทุกครั้ง เพื่อป้องกันไม่ให้มีไฟล์ความปลอดภัยตกค้างในโฟลเดอร์หลักของโปรเจกต์

## ⚡ POS Page & Printing Rules

3. **POS Customer Info Reset**
   - เมื่อทำการเคลียร์ตะกร้าสินค้า (ล้างข้อมูลตะกร้า) หรือทำการขายเสร็จสิ้น ต้องทำการเคลียร์ข้อมูลของลูกค้าค้างเครื่อง และลบ `pos_customer_info` ออกจาก `localStorage` เสมอเพื่อให้การเริ่มขายบิลใหม่เริ่มต้นด้วยฟอร์มว่างเปล่า

4. **Dynamic Salesperson Name on Documents**
   - เมื่อแสดงผลใบเสนอราคาหรือใบเสร็จรับเงิน (เช่น ใน component `PrintDispatchDocument.tsx`) ห้ามใช้คำว่า "Customer / Client" หรือค่าแบบ Hardcoded ในช่องผู้รับบิล/ผู้ขาย ให้อ่านและจอยตาราง `profiles` จาก `user_id` เพื่อนำชื่อจริงของพนักงานมาแสดงในส่วน "Accepted By" เสมอ
