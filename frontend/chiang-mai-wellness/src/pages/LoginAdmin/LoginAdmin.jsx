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
  // ชื่อผู้ใช้ (adminId): ภาษาอังกฤษหรือตัวเลขเท่านั้น ห้ามช่องว่าง ห้ามเป็นค่าว่าง บังคับยาว 6-10 ตัวอักษร
  const usernameRegex = /^[a-zA-Z0-9]{6,10}$/;
  // รหัสผ่าน (password): ภาษาอังกฤษหรือตัวเลขเท่านั้น ห้ามช่องว่าง ห้ามเป็นค่าว่าง บังคับยาว 1-8 ตัวอักษร
  const passwordRegex = /^[a-zA-Z0-9]{1,8}$/;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // 1. ตรวจสอบเงื่อนไข Script Validation ก่อนส่งไปหลังบ้าน
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
        {
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        const loggedInUsername = response.data?.data?.username || response.data?.username || username;
        localStorage.setItem("username", loggedInUsername);
        localStorage.setItem("adminName", loggedInUsername);
        localStorage.setItem(
          "adminUser",
          JSON.stringify({ username: loggedInUsername, role: "ADMIN" })
        );
        localStorage.setItem("showWelcome", "true");
        navigate("/listAccountRequest");
      }
    } catch (err) {
      // 2. แยก Error ตาม HTTP Status Code และ Network Error
      if (err.response) {
        const status = err.response.status;
        const msg = err.response.data?.message;

        if (status === 400) {
          setError(msg || "ข้อมูลไม่ถูกต้อง");
        } else if (status === 401) {
          setError(msg || "ไม่พบข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        } else if (status === 500) {
          setError(msg || "เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง");
        } else {
          setError(msg || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        }
      } else {
        setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
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
                  placeholder="ระบุรหัสผู้ใช้งาน (6-10 ตัวอักษร)"
                  value={username}
                  maxLength={10}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="ระบุรหัสผ่าน (ไม่เกิน 8 ตัวอักษร)"
                  value={password}
                  maxLength={8}
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
