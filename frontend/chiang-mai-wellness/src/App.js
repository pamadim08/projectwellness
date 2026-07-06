// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginAdmin from "./pages/LoginAdmin/LoginAdmin";
// ปรับให้ตรงกับชื่อ Component ที่ export ออกมา
import ListWellnessHub from "./pages/ListWellnesshub/ListWellnesshub";
import AddWellnessHub from "./pages/CreateWellnesshub/AddWellnessHub";
// ตัวอย่างการผูก Route ใน App.js ให้จับคู่กับคอมโพเนนต์แก้ไขข้อมูล
import EditWellnessHub from "./pages/EditWellnesshub/EditWellnesshub"; // เช็ค path ไฟล์ของน้าด้วยนะ
import CreateMainRoute from "./pages/CreateMainRoute/CreateMainRoute";
import ListMainRoute from "./pages/ListMainroute/ListMainroute"; // เพิ่มการ import สำหรับหน้า ListMainRoute
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 🌟 ปรับตรงนี้: ตั้งค่าให้พาร์ทแรกเริ่ม "/" เปิดหน้า Login ตรงๆ ไปเลย ปลอดภัยชัวร์ */}
          <Route path="/" element={<LoginAdmin />} />
          <Route path="/login" element={<LoginAdmin />} />
          {/* ตรวจสอบว่าในหน้า LoginAdmin สั่ง navigate มาที่ path นี้เป๊ะๆ หรือไม่ */}
          <Route path="/listWellnesshub" element={<ListWellnessHub />} />
          {/* เส้นทางหน้าเพิ่มข้อมูลสถานประกอบการใหม่ */}
          <Route path="/add-wellness" element={<AddWellnessHub />} />

          <Route
            path="/listWellnesshub/edit/:id"
            element={<EditWellnessHub />}
          />
          <Route path="/createMainRoute" element={<CreateMainRoute />} />
          <Route path="/listMainRoute" element={<ListMainRoute />} />

          <Route path="/editMainRoute/:id" element={<CreateMainRoute />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
