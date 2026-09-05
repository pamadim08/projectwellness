# 🌿 Chiang Mai Wellness Route System (ระบบแพลตฟอร์มเส้นทางการท่องเที่ยวเชิงสุขภาพจังหวัดเชียงใหม่)

ระบบแพลตฟอร์มเว็บแอปพลิเคชันสำหรับส่งเสริมและจัดการ **เส้นทางการท่องเที่ยวเชิงสุขภาพ (Wellness Tourism)** ในจังหวัดเชียงใหม่ รวบรวมข้อมูลสถานประกอบการด้านสุขภาพ (Wellness Hub) เส้นทางการท่องเที่ยว และบทความประชาสัมพันธ์ พร้อมระบบบริหารจัดการสำหรับผู้ดูแลระบบ (Admin) และผู้ให้บริการ (Wellness Provider)

---

## 📌 สารบัญ (Table of Contents)
- [✨ คุณสมบัติหลัก (Features)](#-คุณสมบัติหลัก-features)
- [🛠️ เทคโนโลยีที่ใช้ (Tech Stack)](#️-เทคโนโลยีที่ใช้-tech-stack)
- [📁 โครงสร้างโปรเจกต์ (Project Structure)](#-โครงสร้างโปรเจกต์-project-structure)
- [🚀 ขั้นตอนการติดตั้งและการใช้งาน (Getting Started)](#-ขั้นตอนการติดตั้งและการใช้งาน-getting-started)
  - [1. การตั้งค่า Backend (Spring Boot)](#1-การตั้งค่า-backend-spring-boot)
  - [2. การตั้งค่า Frontend (React)](#2-การตั้งค่า-frontend-react)
- [🌐 โครงสร้างเส้นทางใช้งาน (Routes & API Overview)](#-โครงสร้างเส้นทางใช้งาน-routes--api-overview)
- [📧 การตั้งค่าการส่งอีเมลและการเชื่อมต่อฐานข้อมูล](#-การตั้งค่าการส่งอีเมลและการเชื่อมต่อฐานข้อมูล)

---

## ✨ คุณสมบัติหลัก (Features)

### 🌿 1. สำหรับผู้ใช้ทั่วไป / นักท่องเที่ยว (Public Users & Tourists)
- **ค้นหาเส้นทางสุขภาพและสถานประกอบการ**: ค้นหาเส้นทางท่องเที่ยวเชิงสุขภาพ (Wellness Route) และสถานประกอบการ (Wellness Hub) ตามหมวดหมู่ (เช่น สปา, นวดไทย, อาหารสุขภาพ, สถานพยาบาล) และอำเภอในเชียงใหม่
- **แผนที่นำทางแบบโต้ตอบ (Interactive Map)**: แสดงตำแหน่งและนำทางเส้นทางท่องเที่ยวเชิงสุขภาพด้วย Leaflet Map & Routing Engine
- **คลังบทความสุขภาพ (Official Articles)**: อ่านบทความประชาสัมพันธ์และความรู้ด้านสุขภาพ
- **ยื่นคำขอลงทะเบียนสถานประกอบการ**: ยื่นสมัครเพื่อนำสถานประกอบการเข้าสู่ระบบ Wellness Hub
- **ติดตามสถานะการอนุมัติ (Track Account Request)**: ตรวจสอบสถานะคำขอลงทะเบียนด้วยรหัสใบอนุญาต / เลขคำขอ

### 🏢 2. สำหรับผู้ให้บริการสถานประกอบการ (Wellness Hub Providers)
- **ระบบเข้าสู่ระบบผู้ให้บริการ**: เข้าสู่ระบบจัดการข้อมูลด้วยบัญชีที่ได้รับการอนุมัติ
- **Provider Dashboard**: จัดการข้อมูลรายละเอียดสถานประกอบการ แก้ไขรูปภาพ พิกัดตำแหน่ง เวลาเปิด-ปิด และข้อมูลการติดต่อ

### 👑 3. สำหรับผู้ดูแลระบบ (System Admin)
- **Admin Dashboard**: สรุปสถิติสถานประกอบการ เส้นทางท่องเที่ยว คำขอลงทะเบียน และบทความ
- **อนุมัติ/ปฏิเสธคำขอลงทะเบียน (Account Requests Management)**: ตรวจสอบเอกสาร/หลักฐาน พร้อมระบบแจ้งผลทางอีเมลอัตโนมัติ (Email Notification System)
- **จัดการเส้นทางหลัก (Main Routes Management)**: เพิ่ม แก้ไข ลบ และจัดอันดับจุดท่องเที่ยวในแต่ละเส้นทาง
- **จัดการบทความประชาสัมพันธ์ (Official Articles Management)**: สร้างและแก้ไขบทความสำหรับผู้ใช้ทั่วไป
- **จัดการสถานประกอบการ (Wellness Hub Management)**: บริหารจัดการข้อมูลสถานประกอบการทั้งหมดในระบบ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### 🔹 Backend Architecture
- **Language & Framework**: Java 21, Spring Boot 3.5.x
- **Data Access**: Spring Data JPA / Hibernate
- **Database**: PostgreSQL (เชื่อมต่อผ่าน Supabase Connection Pooler)
- **Email Service**: Spring Boot Mail (JavaMailSender / Gmail SMTP)
- **Build Tool**: Apache Maven

### 🔹 Frontend Architecture
- **Framework**: React 19, React Router v7
- **UI & Iconography**: Tailwind CSS v4, Lucide React, FontAwesome Icons
- **Interactive Maps**: Leaflet, React-Leaflet, Leaflet Routing Machine
- **HTTP Client**: Axios

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
wellness1.1/
├── backend/
│   └── wellness/                     # Spring Boot Application Backend
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/example/wellness/
│       │   │   │   ├── config/       # Web & CORS Config
│       │   │   │   ├── controller/   # REST API Controllers
│       │   │   │   ├── model/        # JPA Entities
│       │   │   │   ├── repository/   # Spring Data JPA Repositories
│       │   │   │   └── service/      # Business Logic Services & Email
│       │   │   └── resources/        # Application Properties & Uploads
│       └── pom.xml
│
├── frontend/
│   └── chiang-mai-wellness/          # React Single Page Application Frontend
│       ├── public/
│       ├── src/
│       │   ├── Components/           # Reusable UI Components (Navbar, Footer, Map, etc.)
│       │   ├── pages/                # Page Components (Home, Admin, Provider, Routes, etc.)
│       │   ├── utils/                # Helper Functions & Constants
│       │   ├── App.js                # App Routing Configuration
│       │   └── index.js
│       ├── package.json
│       └── tailwind.config.js
│
└── uploads/                          # Image & Media Storage Directory
```

---

## 🚀 ขั้นตอนการติดตั้งและการใช้งาน (Getting Started)

### ข้อกำหนดเบื้องต้น (Prerequisites)
- **Java Development Kit (JDK)**: Version 21 ขึ้นไป
- **Node.js**: Version 18.x หรือ 20.x ขึ้นไป
- **npm**: Version 9.x ขึ้นไป
- **PostgreSQL Database** (หรือ บัญชี Supabase Database)

---

### 1. การตั้งค่า Backend (Spring Boot)

1. เข้าไปยังโฟลเดอร์ Backend:
   ```bash
   cd backend/wellness
   ```

2. กำหนดค่าไฟล์ `application-secret.properties` ใน `src/main/resources/`:
   ```properties
   # ตั้งค่าฐานข้อมูล PostgreSQL (Supabase)
   spring.datasource.url=jdbc:postgresql://<POOLER_HOST>:6543/postgres
   spring.datasource.username=<USERNAME>
   spring.datasource.password=<PASSWORD>

   # ตั้งค่าการส่งอีเมลผ่าน Gmail SMTP
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username=your-email@gmail.com
   spring.mail.password=your-app-password
   spring.mail.properties.mail.smtp.auth=true
   spring.mail.properties.mail.smtp.starttls.enable=true
   ```

3. รันบริการ Backend:
   - **บน Windows (CMD / PowerShell):**
     ```cmd
     mvnw.cmd spring-boot:run
     ```
   - **บน Linux / macOS:**
     ```bash
     ./mvnw spring-boot:run
     ```
   *Backend จะทำงานที่พอร์ต:* `http://localhost:8080`

---

### 2. การตั้งค่า Frontend (React)

1. เข้าไปยังโฟลเดอร์ Frontend:
   ```bash
   cd frontend/chiang-mai-wellness
   ```

2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

3. รันเซิร์ฟเวอร์สำหรับการพัฒนา (Development Server):
   ```bash
   npm start
   ```
   *Frontend จะเปิดใช้งานที่:* `http://localhost:3000`

---

## 🌐 โครงสร้างเส้นทางใช้งาน (Routes Overview)

### 🟢 Frontend Client Routes
| Path | คำอธิบาย (Description) | สิทธิ์การเข้าถึง |
| :--- | :--- | :--- |
| `/` | หน้าหลัก (HomePage) แสดงเส้นทางเด่นและบทความ | สาธารณะ |
| `/wellness-routes` | รายการเส้นทางท่องเที่ยวเชิงสุขภาพทั้งหมด | สาธารณะ |
| `/wellness-routes/:routeId` | รายละเอียดเส้นทางและแผนที่นำทาง | สาธารณะ |
| `/search` | ค้นหาสถานประกอบการตามหมวดหมู่และอำเภอ | สาธารณะ |
| `/wellness-hubs/:hubId` | รายละเอียดสถานประกอบการ Wellness Hub | สาธารณะ |
| `/articles` / `/articles/:articleId` | คลังบทความสุขภาพ / รายละเอียดบทความ | สาธารณะ |
| `/request-wellness-hub-account` | ฟอร์มขอลงทะเบียนผู้ให้บริการ | สาธารณะ |
| `/track-status` | ตรวจสอบสถานะคำขอลงทะเบียน | สาธารณะ |
| `/provider/login` | เข้าสู่ระบบสำหรับผู้ให้บริการ | ผู้ให้บริการ |
| `/provider/dashboard` | แดชบอร์ดผู้ให้บริการ | ผู้ให้บริการ |
| `/login` | เข้าสู่ระบบสำหรับแอดมิน | ผู้ดูแลระบบ |
| `/dashboard` | แดชบอร์ดผู้ดูแลระบบ | ผู้ดูแลระบบ |
| `/listAccountRequest` | จัดการคำขอสมัครบัญชีผู้ให้บริการ | ผู้ดูแลระบบ |
| `/listMainRoute` | จัดการเส้นทางท่องเที่ยวหลัก | ผู้ดูแลระบบ |
| `/listOfficialArticle` | จัดการบทความประชาสัมพันธ์ | ผู้ดูแลระบบ |

---

## 📄 ใบอนุญาตและการพัฒนา (License & Project Status)

พัฒนาโดยทีมงาน **Project Wellness Route Chiang Mai** เพื่อส่งเสริมเศรษฐกิจและสุขภาพท่องเที่ยวในจังหวัดเชียงใหม่
