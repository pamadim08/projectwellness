import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // 1. นำเข้า useNavigate
import "./LoginAdmin.css";

function LoginAdmin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate(); // 2. ประกาศตัวแปร navigate

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await axios.post(
        "http://localhost:8080/api/admin/login",
        {
          username: username,
          password: password,
        },
      );

      // ในไฟล์ LoginAdmin.js แก้บรรทัด navigate
      if (response.status === 200) {
        alert(`เข้าสู่ระบบสำเร็จ! สวัสดีคุณ ${response.data.username}`);
        // ต้องมี /admin/ นำหน้าเพื่อให้ตรงกับ App.js
        navigate("/admin/listWellnesshub");
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Username หรือ Password ไม่ถูกต้อง");
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
                  required
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
                  required
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
