// src/Components/Navbar/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightToBracket,
  faBuildingColumns,
  faHeartPulse,
} from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";

// 🌟 รายชื่อโลโก้หน่วยงานจำลอง (Mockup) - สามารถนำรูปจริงมาใส่ใน logoUrl ได้ภายหลัง
const PARTNER_ORGANIZATIONS = [
  {
    id: "org-1",
    name: "สำนักงานสาธารณสุขจังหวัดเชียงใหม่ (สสจ.)",
    shortName: "LOGO 1",
    subText: "โลโก้หน่วยงานจำลอง 1",
    logoUrl: "", // ใส่ URL หรือ path รูปภาพจริงที่นี่
    badgeColor: "#10b981",
  },
  {
    id: "org-2",
    name: "จังหวัดเชียงใหม่",
    shortName: "LOGO 2",
    subText: "โลโก้หน่วยงานจำลอง 2",
    logoUrl: "",
    badgeColor: "#3b82f6",
  },
  {
    id: "org-3",
    name: "กรมการแพทย์แผนไทยและการแพทย์ทางเลือก / ภาคีเครือข่าย",
    shortName: "LOGO 3",
    subText: "โลโก้หน่วยงานจำลอง 3",
    logoUrl: "",
    badgeColor: "#f59e0b",
  },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // ตรวจจับการเลื่อน Scroll เพื่อเพิ่ม Glassmorphism Effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    {
      path: "/",
      label: "หน้าแรก",
      end: true,
    },
    {
      path: "/wellness-routes",
      label: "เส้นทางท่องเที่ยว",
    },
    {
      path: "/articles",
      label: "บทความสุขภาพ",
    },
    {
      path: "/track-status",
      label: "ติดตามสถานะคำขอ",
    },
  ];

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={`navbar ${isScrolled ? "navbar--scrolled" : ""}`}>
      {/* 🌿 เส้นไล่เฉดสีเวลเนส + สีทองล้านนา */}
      <div className="navbar__top-accent" />

      <div className="navbar__container">
        {/* 🌟 1. ส่วนแบรนด์ (โลโก้จำลองแบบไอคอน) และโลโก้หน่วยงาน */}
        <div className="navbar__identity">
          <Link
            to="/"
            className="navbar__brand"
            onClick={closeMenu}
            aria-label="หน้าแรก Chiang Mai Wellness Route"
          >
            {/* โลโก้ใหญ่แบบจำลองใช้ไอคอนเวลเนส */}
            <div className="navbar__brand-logo-wrap">
              <FontAwesomeIcon
                icon={faHeartPulse}
                className="navbar__brand-icon"
              />
            </div>

            <div className="navbar__brand-info">
              <div className="navbar__brand-title">
                <span className="navbar__brand-title-main">CHIANG MAI</span>
                <span className="navbar__brand-title-sub">WELLNESS</span>
              </div>
              <span className="navbar__brand-desc">
                ระบบสารสนเทศเส้นทางสุขภาพเชียงใหม่
              </span>
            </div>
          </Link>

          {/* เส้นคั่นแยกแบรนด์กับโลโก้หน่วยงาน */}
          <div className="navbar__divider" />

          {/* รายการโลโก้หน่วยงานภาคีเครือข่าย */}
          <div
            className="navbar__partners"
            aria-label="หน่วยงานภาคีเครือข่ายร่วมพัฒนา"
          >
            <span className="navbar__partners-label">
              <FontAwesomeIcon
                icon={faBuildingColumns}
                className="navbar__partners-icon"
              />
              ภาคีเครือข่าย:
            </span>

            <div className="navbar__partner-list">
              {PARTNER_ORGANIZATIONS.map((org) => (
                <div
                  key={org.id}
                  className="navbar__partner-item"
                  tabIndex={0}
                  role="img"
                  aria-label={org.name}
                >
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="navbar__partner-img"
                    />
                  ) : (
                    <div
                      className="navbar__partner-badge"
                      style={{ "--badge-accent": org.badgeColor }}
                    >
                      <span>{org.shortName}</span>
                    </div>
                  )}

                  {/* Tooltip รายละเอียดหน่วยงาน */}
                  <div className="navbar__partner-tooltip">
                    <strong className="navbar__partner-tooltip-name">
                      {org.name}
                    </strong>
                    <span className="navbar__partner-tooltip-sub">
                      {org.subText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 2. เมนูนำทาง (Desktop Nav สะอาดตา ไม่มีไอคอนรก) */}
        <nav
          className={`navbar__nav ${isMenuOpen ? "navbar__nav--open" : ""}`}
          aria-label="เมนูหลัก"
        >
          {/* ส่วนแสดงหน่วยงานเฉพาะบนจอมือถือ */}
          <div className="navbar__mobile-partners">
            <span className="navbar__mobile-partners-title">
              หน่วยงานภาคีเครือข่าย
            </span>
            <div className="navbar__mobile-partner-chips">
              {PARTNER_ORGANIZATIONS.map((org) => (
                <span key={org.id} className="navbar__mobile-partner-chip">
                  {org.name}
                </span>
              ))}
            </div>
          </div>

          <div className="navbar__menu-links">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? "navbar__link--active" : ""}`
                }
                onClick={closeMenu}
              >
                <span className="navbar__link-text">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* ปุ่ม Login ฝั่งผู้ประกอบการ */}
          <div className="navbar__actions">
            <Link
              to="/provider/login"
              className="navbar__cta-btn"
              onClick={closeMenu}
            >
              <FontAwesomeIcon
                icon={faRightToBracket}
                className="navbar__cta-icon"
              />
              <span>เข้าสู่ระบบสถานบริการ</span>
            </Link>
          </div>
        </nav>

        {/* 🌟 3. ปุ่ม Hamburger Toggle (สำหรับ Mobile / Tablet) */}
        <button
          type="button"
          className={`navbar__toggle-btn ${isMenuOpen ? "navbar__toggle-btn--active" : ""
            }`}
          aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          <span className="navbar__toggle-bar navbar__toggle-bar--1" />
          <span className="navbar__toggle-bar navbar__toggle-bar--2" />
          <span className="navbar__toggle-bar navbar__toggle-bar--3" />
        </button>
      </div>

      {/* Backdrop overlay on mobile open */}
      {isMenuOpen && (
        <div
          className="navbar__mobile-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </header>
  );
}

export default Navbar;
