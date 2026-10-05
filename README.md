# 🌿 Chiang Mai Wellness Route

ระบบแพลตฟอร์มเส้นทางการท่องเที่ยวเชิงสุขภาพ จังหวัดเชียงใหม่ (Wellness Tourism) รวบรวมข้อมูลสถานประกอบการ แผนที่นำทาง และบทความสุขภาพ พร้อมระบบจัดการสำหรับ Admin และ Wellness Provider

---

## 🛠️ ข้อกำหนดเบื้องต้น (Prerequisites)

- **Java**: JDK 21 ขึ้นไป
- **Node.js**: Version 18.x หรือ 20.x ขึ้นไป (พร้อม npm)
- **Database**: PostgreSQL (หรือ Supabase)

---

## 🚀 ขั้นตอนการติดตั้งและรันโปรเจกต์ (Installation & Setup)

### 1. นำเข้าโครงสร้างฐานข้อมูล (Database Setup)
นำไฟล์ SQL ในโปรเจกต์ไปรันสร้างตารางใน PostgreSQL / Supabase:
- รันไฟล์ `schema_only.sql` เพื่อสร้างโครงสร้างตารางทั้งหมด

---

### 2. ตั้งค่าและรัน Backend (Spring Boot)

1. เข้าโฟลเดอร์ Backend:
   ```bash
   cd backend/wellness
   ```

2. ตรวจสอบ/แก้ไขการตั้งค่าใน `src/main/resources/application.properties` (หรือ `application-secret.properties`):
   ```properties
   # เชื่อมต่อ PostgreSQL / Supabase
   spring.datasource.url=jdbc:postgresql://<HOST>:5432/postgres
   spring.datasource.username=<USERNAME>
   spring.datasource.password=<PASSWORD>

   # ตั้งค่าส่งอีเมล (Gmail SMTP)
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username=your-email@gmail.com
   spring.mail.password=your-app-password
   ```

3. สั่งรัน Backend:
   - **Windows:**
     ```cmd
     mvnw.cmd spring-boot:run
     ```
   - **macOS / Linux:**
     ```bash
     ./mvnw spring-boot:run
     ```
   > Backend จะเริ่มทำงานที่: `http://localhost:8080`

---

### 3. ติดตั้งและรัน Frontend (React)

1. เปิดหน้าต่าง Terminal ใหม่ และเข้าโฟลเดอร์ Frontend:
   ```bash
   cd frontend/chiang-mai-wellness
   ```

2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

3. สั่งรัน Frontend:
   ```bash
   npm start
   ```
   > Frontend จะเปิดขึ้นมาที่: `http://localhost:3000`

---

## 🌐 ทางเข้าใช้งานระบบ (Access URLs)

| ระบบ / ผู้ใช้งาน | URL | รายละเอียด |
| :--- | :--- | :--- |
| **ผู้ใช้ทั่วไป / นักท่องเที่ยว** | `http://localhost:3000` | หน้าหลัก ค้นหาสถานประกอบการ ดูเส้นทาง และบทความ |
| **ผู้ให้บริการ (Provider)** | `http://localhost:3000/provider/login` | เข้าสู่ระบบจัดการข้อมูลสถานประกอบการ |
| **ผู้ดูแลระบบ (Admin)** | `http://localhost:3000/login` | แดชบอร์ด อนุมัติคำขอ และจัดการเส้นทาง/บทความ |

