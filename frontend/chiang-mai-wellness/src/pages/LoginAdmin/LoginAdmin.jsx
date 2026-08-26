import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginAdmin.css";

function LoginAdmin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // นิยามกฎสำหรับตรวจสอบเงื่อนไข (Regex)
  // ชื่อผู้ใช้: อังกฤษหรือตัวเลขเท่านั้น ห้ามช่องว่าง บังคับยาว 6-10 ตัวอักษร
  const usernameRegex = /^[a-zA-Z0-9]{6,10}$/;
  // รหัสผ่าน: อะไรก็ได้ (รวมอักขระพิเศษ) ห้ามช่องว่าง บังคับยาว 1-8 ตัวอักษร
  const passwordRegex = /^[^\s]{1,8}$/;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // เงื่อนไข 3.1: ตรวจสอบความถูกต้องของโครงสร้างข้อมูลก่อนส่งไปหลังบ้าน
    if (!usernameRegex.test(username) || !passwordRegex.test(password)) {
      setError("กรุณากรอกข้อมูลให้ถูกต้อง");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8080/api/admin/login",
        {
          username: username,
          password: password,
        },
      );

      if (response.status === 200) {
        const loggedInUsername = response.data?.username || username;
        // เก็บข้อมูลลง localStorage เพื่อให้ AdminSidebar และทุกหน้าที่เกี่ยวข้องนำไปแสดงผล
        localStorage.setItem("username", loggedInUsername);
        localStorage.setItem("adminName", loggedInUsername);
        localStorage.setItem(
          "adminUser",
          JSON.stringify({ username: loggedInUsername, role: "ADMIN" })
        );
        localStorage.setItem("showWelcome", "true"); // บอกหน้าถัดไปให้เด้งแบนเนอร์แจ้งเตือน

        // เปลี่ยนหน้าทันที ไม่ใช้ alert() มาขัดจังหวะ
        navigate("/dashboard");
      }
    } catch (err) {
      // เงื่อนไข 5.1.1: กรณีระบบตรวจสอบชื่อผู้ใช้และรหัสผ่านไม่ถูกต้อง
      if (err.response && err.response.status === 401) {
        setError("ไม่พบข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setError("ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่ภายหลัง");
      }
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-container">
        <div className="login-card">
          <div className="admin-logo-text">ADMIN LOGIN</div>
          <p className="subtitle">Chiang Mai Wellness</p>

          {/* ส่วนแสดงข้อความแจ้งเตือน Error */}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Admin ID</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="ระบุรหัสผู้ใช้งาน"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  // ลบ required ออกเพื่อให้ Regex ทำหน้าที่ตรวจสอบค่าว่างด้วยตัวเอง
                />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="ระบุรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-admin-login">
              เข้าสู่ระบบจัดการข้อมูล
            </button>
          </form>
          <div className="footer-links">
            <a href="/" className="back-link">
              กลับสู่หน้าหลัก
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginAdmin;
