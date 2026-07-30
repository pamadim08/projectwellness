import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axiosInstance from "axios";

import "./ListMainroute.css";

const ListMainRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true); // เพิ่ม State สำหรับคุมสถานะการโหลดข้อมูลตามดีไซน์

  // 1. เพิ่ม State สำหรับจัดการ Popup ยืนยันการลบ
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // 🌟 เพิ่ม State สำหรับเก็บชื่อแอดมินที่ล็อกอินอยู่ในปัจจุบัน
  const [adminName, setAdminName] = useState("admin02");

  // 1. ใช้ State เดิมต่อ (ไม่ต้องแก้ไข)
  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  // โหลดข้อมูลแอดมิน (กรณีเก็บข้อมูลในระบบ Session หลังระบบล็อกอิน)
  useEffect(() => {
    const storedAdmin = localStorage.getItem("adminName");
    if (storedAdmin) {
      setAdminName(storedAdmin);
    }
  }, []);

  // 🌟 เพิ่ม useEffect รับ Toast จากหน้า Edit หรือหน้าอื่นๆ ผ่าน location.state
  useEffect(() => {
    if (location.state?.showToast) {
      setPopupAlert({
        show: true,
        message: location.state.toastMessage,
        isSuccess: location.state.toastType === "success",
      });

      // ล้าง state ป้องกัน popup เด้งซ้ำเวลา refresh
      navigate(location.pathname, { replace: true });

      setTimeout(() => {
        setPopupAlert({
          show: false,
          message: "",
          isSuccess: true,
        });
      }, 3000);
    }
  }, [location.state, location.pathname, navigate]);

  // โหลดตารางทะเบียนข้อมูลสรุปก้อนใหญ่จาก API หลังบ้าน
  const fetchMainRouteList = async () => {
    setLoading(true); // เปิด Loading ก่อนยิงขอข้อมูล
    try {
      const res = await axiosInstance.get(
        "http://localhost:8080/api/main-routes",
      );
      setRoutes(res.data || []);
    } catch (err) {
      console.error("❌ ขัดข้องในการดึงข้อมูลตารางทะเบียนเส้นทางสุขภาพ", err);
      setRoutes([]);
    } finally {
      setLoading(false); // 🌟 ปิดสถานะ Loading เพื่อให้ข้อมูลยอมกลับมาแสดงผลในตาราง
    }
  };

  useEffect(() => {
    fetchMainRouteList();
  }, []);

  // ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("adminName");
      navigate("/admin/login");
    }
  };

  // 3. ฟังก์ชันลบข้อมูลเส้นทางสุขภาพ (อัปเดตตามโครงสร้างใหม่)
  const handleDeleteRoute = async () => {
    if (!selectedRoute) return;

    try {
      await axiosInstance.delete(
        `http://localhost:8080/api/main-routes/${selectedRoute.routeId}`,
      );

      setShowDeletePopup(false);
      setSelectedRoute(null);

      await fetchMainRouteList();

      setPopupAlert({
        show: true,
        message: "ลบข้อมูลเส้นทางสุขภาพเสร็จสิ้น",
        isSuccess: true,
      });

      setTimeout(() => {
        setPopupAlert({
          show: false,
          message: "",
          isSuccess: true,
        });
      }, 3000);
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการลบเส้นทาง", err);

      setShowDeletePopup(false);
      setSelectedRoute(null);

      setPopupAlert({
        show: true,
        message: "ไม่สามารถลบข้อมูลเส้นทางสุขภาพได้",
        isSuccess: false,
      });

      setTimeout(() => {
        setPopupAlert({
          show: false,
          message: "",
          isSuccess: false,
        });
      }, 3000);
    }
  };

  return (
    <div className="gov-admin-layout">
      {/* 2. JSX ของ Toast แจ้งเตือนรูปแบบใหม่ (ใช้ className gov-toast-alert) */}
      {popupAlert.show && (
        <div
          className={`gov-toast-alert ${
            popupAlert.isSuccess ? "alert-success" : "alert-error"
          }`}
        >
          <div className="toast-content-wrapper">
            <i
              className={
                popupAlert.isSuccess
                  ? "fa-solid fa-circle-check"
                  : "fa-solid fa-circle-exclamation"
              }
            ></i>

            <span>{popupAlert.message}</span>
          </div>

          <button
            type="button"
            className="btn-close-toast"
            onClick={() =>
              setPopupAlert({
                show: false,
                message: "",
                isSuccess: true,
              })
            }
            aria-label="ปิดข้อความแจ้งเตือน"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* 🌟 โครงสร้างนาวิเกชันบาร์สไตล์เมนูควบคุมสิทธิ์ */}
      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <i className="fa-solid fa-shield-heart"></i>
            <span>Admin Panel</span>
          </div>

          <div className="user-profile-box">
            <i className="fa-solid fa-circle-user"></i>
            <div className="user-info">
              <span className="user-label">ผู้ใช้งานปัจจุบัน:</span>
              <span className="user-name">{adminName}</span>
            </div>
          </div>

          <p className="menu-label">เมนูหลัก</p>
          <Link to="/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/listAccountRequest" className="menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item active">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnessHub" className="menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </Link>
          <Link to="/listOfficialArticle" className="menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button className="btn-sidebar-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
        </button>
      </nav>

      <main className="gov-main-content">
        <div className="gov-container">
          {/* ส่วนหัวเว็บแสดงชื่อระบบ */}
          <header className="gov-header">
            <h2>บัญชีรายชื่อเส้นทางสุขภาพ (List Main Route)</h2>
            <p>ระบบบริการจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          {/* แถบเครื่องมือสำหรับปุ่มกด (ดันปุ่มไปทางขวาสุด) */}
          <div className="action-bar-top">
            <Link to="/createMainRoute" className="gov-btn-add-route-new">
              <i
                className="fa-solid fa-plus"
                style={{ marginRight: "6px" }}
              ></i>{" "}
              เพิ่มเส้นทางใหม่
            </Link>
          </div>
        </div>

        <div className="gov-table-container-card">
          <table className="gov-custom-data-table">
            <thead>
              <tr>
                <th style={{ width: "5%", textAlign: "center" }}>รหัสระบบ</th>
                <th style={{ width: "18%" }}>ชื่อเส้นทางสุขภาพ</th>
                <th style={{ width: "18%" }}>หมวดหมู่ทั้งหมดในเส้นทาง</th>
                <th style={{ width: "15%" }}>อำเภอในเส้นทาง</th>
                <th style={{ width: "7%", textAlign: "center" }}>
                  จำนวนปักหมุด
                </th>
                <th style={{ width: "8%", textAlign: "center" }}>ผู้สร้าง</th>
                <th style={{ width: "8%", textAlign: "center" }}>
                  วันที่สร้าง
                </th>
                <th style={{ width: "8%", textAlign: "center" }}>
                  แก้ไขล่าสุด
                </th>
                <th style={{ width: "6%", textAlign: "center" }}>สถานะ</th>
                <th style={{ width: "7%", textAlign: "center" }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {/* แสดงสถานะ กำลังโหลดข้อมูลระบบ... ระหว่างดึงข้อมูล */}
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    className="gov-loading-row"
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      color: "#666",
                    }}
                  >
                    <i
                      className="fa-solid fa-spinner fa-spin"
                      style={{ marginRight: "8px" }}
                    ></i>{" "}
                    กำลังโหลดข้อมูลระบบ...
                  </td>
                </tr>
              ) : (
                routes.map((item, index) => (
                  <tr key={item.routeId || index}>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {index + 1}
                    </td>
                    <td style={{ fontWeight: "bold" }}>{item.routeName}</td>
                    <td>
                      {item.categoriesPassed || item.routeDescription || "-"}
                    </td>
                    <td>{item.districtsPassed || "-"}</td>
                    <td>{item.pinCount || 0}</td>
                    <td>{item.createdBy || "-"}</td>
                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("th-TH")
                        : "-"}
                    </td>
                    <td>
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleDateString("th-TH")
                        : "-"}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#166534",
                      }}
                    >
                      เปิดใช้งาน
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="gov-table-action-btn edit-blue"
                          onClick={() =>
                            navigate(`/editMainRoute/${item.routeId}`)
                          }
                        >
                          แก้ไข
                        </button>
                        <button
                          className="gov-table-action-btn delete-red"
                          onClick={() => {
                            setSelectedRoute(item);
                            setShowDeletePopup(true);
                          }}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {!loading && routes.length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: "40px 0",
                      fontSize: "14px",
                    }}
                  >
                    📂 ไม่พบข้อมูลทะเบียนเส้นทางสุขภาพในระบบฐานข้อมูลกลางขณะนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Pop up ยืนยันการลบข้อมูล */}
      {showDeletePopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>

            <h3>ยืนยันการลบข้อมูล</h3>

            <p>
              คุณต้องการลบเส้นทางสุขภาพ
              <span className="popup-route-name">
                {selectedRoute?.routeName}
              </span>
              ใช่หรือไม่?
              <span className="popup-warning-text">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </span>
            </p>

            <div className="popup-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedRoute(null);
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="delete-btn"
                onClick={handleDeleteRoute}
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListMainRoute;
