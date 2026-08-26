// src/Components/Footer/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";
import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" aria-label="ส่วนท้ายเว็บไซต์">
      {/* 🌿 เส้นไล่เฉดสีเวลเนสด้านบนของ Footer */}
      <div className="footer__top-accent" />

      <div className="footer__container">
        <div className="footer__main">
          {/* ข้อมูลแบรนด์และชื่อระบบสั้นๆ */}
          <div className="footer__brand-col">
            <div className="footer__brand-logo">
              <div className="footer__brand-icon-wrap">
                <FontAwesomeIcon
                  icon={faHeartPulse}
                  className="footer__brand-icon"
                />
              </div>
              <div className="footer__brand-text">
                <span className="footer__brand-title">CHIANG MAI WELLNESS</span>
                <span className="footer__brand-sub">
                  เส้นทางสุขภาพ จังหวัดเชียงใหม่
                </span>
              </div>
            </div>

            <p className="footer__brand-desc">
              ระบบสารสนเทศภูมิศาสตร์เพื่อการท่องเที่ยวเชิงสุขภาพและการแพทย์
              เชื่อมโยงเส้นทางสุขภาพและสถานประกอบการที่ได้มาตรฐานในจังหวัดเชียงใหม่
            </p>
          </div>

          {/* ลิงก์เมนูลัด */}
          <div className="footer__links-col">
            <h4 className="footer__heading">เมนูลัด</h4>
            <ul className="footer__nav-list">
              <li>
                <Link to="/" className="footer__link">
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link to="/wellness-routes" className="footer__link">
                  เส้นทางท่องเที่ยวสุขภาพ
                </Link>
              </li>
              <li>
                <Link to="/articles" className="footer__link">
                  บทความสุขภาพ
                </Link>
              </li>
              <li>
                <Link to="/track-status" className="footer__link">
                  ติดตามสถานะคำขอ
                </Link>
              </li>
            </ul>
          </div>

          {/* สำหรับผู้ประกอบการและผู้ดูแล */}
          <div className="footer__portal-col">
            <h4 className="footer__heading">สำหรับสถานประกอบการ</h4>
            <ul className="footer__nav-list">
              <li>
                <Link to="/provider/login" className="footer__link">
                  เข้าสู่ระบบผู้ให้บริการ
                </Link>
              </li>
              <li>
                <Link to="/login" className="footer__link footer__link--subtle">
                  เข้าสู่ระบบผู้ดูแลระบบ (Admin)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* แถบลิขสิทธิ์ด้านล่างสุด */}
        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} <strong>Chiang Mai Wellness Route</strong> —
            ระบบสารสนเทศเส้นทางสุขภาพ จังหวัดเชียงใหม่. สงวนลิขสิทธิ์
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
