// src/Components/AdminSidebar/AdminSidebar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faRightFromBracket,
  faShieldHeart,
  faChartPie,
  faClipboardCheck,
  faRoute,
  faShop,
  faNewspaper,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import "./AdminSidebar.css";

const API_BASE_URL = "http://localhost:8080/api";

export default function AdminSidebar({
  activeMenu,
  pendingCount: propPendingCount,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [pendingCount, setPendingCount] = useState(propPendingCount ?? null);

  // ดึงชื่อผู้ใช้งานจาก localStorage
  useEffect(() => {
    try {
      const adminNameDirect = localStorage.getItem("adminName");
      const usernameDirect = localStorage.getItem("username");
      const storedUser = localStorage.getItem("adminUser");

      if (adminNameDirect) {
        setAdminName(adminNameDirect);
      } else if (usernameDirect) {
        setAdminName(usernameDirect);
      } else if (storedUser) {
        if (storedUser.startsWith("{") || storedUser.startsWith("[")) {
          const parsed = JSON.parse(storedUser);
          setAdminName(
            parsed.username ||
              parsed.fullname ||
              parsed.adminName ||
              "ผู้ดูแลระบบ"
          );
        } else {
          setAdminName(storedUser);
        }
      } else {
        setAdminName("ผู้ดูแลระบบ");
      }
    } catch {
      setAdminName("ผู้ดูแลระบบ");
    }
  }, []);

  // ดึงจำนวนคำขอรอพิจารณา (หากไม่ได้ส่ง prop มา)
  useEffect(() => {
    if (propPendingCount !== undefined && propPendingCount !== null) {
      setPendingCount(propPendingCount);
      return;
    }

    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/account-requests`);
        const data = Array.isArray(response.data) ? response.data : [];
        const count = data.filter(
          (item) =>
            item?.status === "PENDING" ||
            item?.status === "pending" ||
            item?.requestStatus === "PENDING" ||
            item?.requestStatus === "pending"
        ).length;
        if (isMounted) setPendingCount(count);
      } catch (err) {
        // เงียบไว้ ไม่กระทบการทำงานส่วนอื่น
      }
    };

    fetchPendingCount();
    return () => {
      isMounted = false;
    };
  }, [propPendingCount]);

  // ฟังก์ชันเช็คว่าเมนูไหน Active
  const pathname = location?.pathname || "";

  const isDashboardActive =
    activeMenu === "dashboard" ||
    pathname === "/dashboard" ||
    pathname === "/admin";

  const isAccountRequestActive =
    activeMenu === "account-requests" ||
    pathname.startsWith("/listAccountRequest") ||
    pathname.startsWith("/account-request") ||
    pathname.startsWith("/approve-account");

  const isRouteActive =
    activeMenu === "routes" ||
    pathname.startsWith("/listMainRoute") ||
    pathname.startsWith("/createMainRoute") ||
    pathname.startsWith("/editMainRoute");

  const isWellnessHubActive =
    activeMenu === "wellness-hubs" ||
    pathname.startsWith("/listWellnessHub") ||
    pathname.startsWith("/add-wellness") ||
    pathname.startsWith("/edit-wellness");

  const isArticleActive =
    activeMenu === "articles" ||
    pathname.startsWith("/listOfficialArticle") ||
    pathname.startsWith("/createOfficialArticle") ||
    pathname.startsWith("/editOfficialArticle");

  const handleLogoutClick = () => {
    setShowLogoutPopup(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutPopup(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutPopup(false);
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminName");
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.clear();
    navigate("/login");
  };

  return (
    <>
      {/* 🌟 Popup ยืนยันการออกจากระบบ */}
      {showLogoutPopup && (
        <div
          className="admin-sidebar-popup-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-sidebar-logout-title"
          onClick={handleCancelLogout}
        >
          <div
            className="admin-sidebar-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-sidebar-popup-icon">
              <FontAwesomeIcon icon={faRightFromBracket} />
            </div>

            <h3 id="admin-sidebar-logout-title">ยืนยันการออกจากระบบ</h3>
            <p>คุณต้องการออกจากระบบการจัดการข้อมูล ใช่หรือไม่?</p>

            <div className="admin-sidebar-popup-actions">
              <button
                type="button"
                className="admin-sidebar-btn admin-sidebar-btn--cancel"
                onClick={handleCancelLogout}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="admin-sidebar-btn admin-sidebar-btn--confirm"
                onClick={handleConfirmLogout}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Admin Sidebar Menu */}
      <nav className="admin-sidebar" aria-label="Admin Navigation">
        <div className="admin-sidebar-top">
          {/* Logo */}
          <div className="admin-sidebar-logo">
            <FontAwesomeIcon icon={faShieldHeart} />
            <span>Admin Panel</span>
          </div>

          {/* User Profile Box */}
          <div className="admin-sidebar-user-profile">
            <FontAwesomeIcon icon={faCircleUser} />
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-user-label">ผู้ใช้งานปัจจุบัน:</span>
              <span className="admin-sidebar-user-name" title={adminName}>
                {adminName}
              </span>
            </div>
          </div>

          {/* Menu Section 1: เมนูหลัก */}
          <p className="admin-sidebar-menu-label">เมนูหลัก</p>

          <Link
            to="/dashboard"
            className={`admin-sidebar-menu-item ${
              isDashboardActive ? "active" : ""
            }`}
          >
            <FontAwesomeIcon icon={faChartPie} />
            <span>แผงควบคุมหลัก</span>
          </Link>

          <Link
            to="/listAccountRequest"
            className={`admin-sidebar-menu-item ${
              isAccountRequestActive ? "active" : ""
            }`}
          >
            <FontAwesomeIcon icon={faClipboardCheck} />
            <span>ตรวจสอบคำขอสิทธิ์</span>
            {Number.isFinite(pendingCount) && pendingCount > 0 && (
              <span className="admin-sidebar-badge">{pendingCount}</span>
            )}
          </Link>

          {/* Menu Section 2: การจัดการข้อมูล */}
          <p className="admin-sidebar-menu-label admin-sidebar-menu-label--section">
            การจัดการข้อมูล
          </p>

          <Link
            to="/listMainRoute"
            className={`admin-sidebar-menu-item ${
              isRouteActive ? "active" : ""
            }`}
          >
            <FontAwesomeIcon icon={faRoute} />
            <span>จัดการเส้นทางสุขภาพ</span>
          </Link>

          <Link
            to="/listWellnessHub"
            className={`admin-sidebar-menu-item ${
              isWellnessHubActive ? "active" : ""
            }`}
          >
            <FontAwesomeIcon icon={faShop} />
            <span>จัดการสถานประกอบการ</span>
          </Link>

          <Link
            to="/listOfficialArticle"
            className={`admin-sidebar-menu-item ${
              isArticleActive ? "active" : ""
            }`}
          >
            <FontAwesomeIcon icon={faNewspaper} />
            <span>จัดการบทความ</span>
          </Link>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          className="admin-sidebar-logout-button"
          onClick={handleLogoutClick}
          aria-label="ออกจากระบบ"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>ออกจากระบบ</span>
        </button>
      </nav>
    </>
  );
}
