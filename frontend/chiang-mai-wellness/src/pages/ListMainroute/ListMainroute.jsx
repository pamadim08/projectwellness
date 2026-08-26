import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axiosInstance from "axios";

import "./ListMainroute.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

// 🌟 1. ประกาศตัวแปร In-Memory Cache ไว้นอก Component
let mainRouteCache = null;

// ฟังก์ชันสำหรับเรียกเคลียร์ Cache จากหน้า CreateMainRoute หรือ EditMainRoute
export const clearMainRouteCache = () => {
  mainRouteCache = null;
};

const ListMainRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับจัดการ Popup ยืนยันการลบ
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // State สำหรับเก็บชื่อแอดมิน
  const [adminName, setAdminName] = useState("admin02");

  // State จัดการ Toast Alert
  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  // โหลดข้อมูลแอดมิน
  useEffect(() => {
    const storedAdmin = localStorage.getItem("adminName");
    if (storedAdmin) {
      setAdminName(storedAdmin);
    }
  }, []);

  // รับ Toast แจ้งเตือนจากหน้าอื่น (เช่น หลังกด Create / Edit เสร็จ)
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

  // 🌟 2. ปรับฟังก์ชันดึงข้อมูลให้รองรับ Cache และ forceRefresh
  const fetchMainRouteList = async (forceRefresh = false) => {
    // กรณีมี Cache อยู่แล้วและไม่ได้สั่งบังคับโหลดใหม่
    if (mainRouteCache && !forceRefresh) {
      setRoutes(mainRouteCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.get(
        "http://localhost:8080/api/main-routes",
      );
      const routeData = res.data || [];

      mainRouteCache = routeData; // บันทึกลง Cache
      setRoutes(routeData);
    } catch (err) {
      console.error("❌ ขัดข้องในการดึงข้อมูลตารางทะเบียนเส้นทางสุขภาพ", err);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 3. เรียกโหลดข้อมูลรอบแรก (ดึงจาก Cache ถ้ามี)
  useEffect(() => {
    fetchMainRouteList();
  }, []);

  // 🌟 เรียงลำดับข้อมูลตามวันที่แก้ไขล่าสุด (updatedAt -> createdAt -> routeId)
  const sortedRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return [];

    return [...routes].sort((first, second) => {
      const firstDate = new Date(
        first.updatedAt || first.createdAt || 0,
      ).getTime();

      const secondDate = new Date(
        second.updatedAt || second.createdAt || 0,
      ).getTime();

      const validFirstDate = Number.isNaN(firstDate) ? 0 : firstDate;
      const validSecondDate = Number.isNaN(secondDate) ? 0 : secondDate;

      if (validSecondDate !== validFirstDate) {
        return validSecondDate - validFirstDate;
      }

      return (second.routeId || 0) - (first.routeId || 0);
    });
  }, [routes]);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("adminName");
      mainRouteCache = null; // เคลียร์ Cache เมื่อออกจากระบบ
      navigate("/admin/login");
    }
  };

  // 🌟 4. ฟังก์ชันลบข้อมูลเส้นทาง (สั่ง forceRefresh = true เพื่อดึงข้อมูลสดจาก Backend)
  const handleDeleteRoute = async () => {
    if (!selectedRoute) return;

    try {
      await axiosInstance.delete(
        `http://localhost:8080/api/main-routes/${selectedRoute.routeId}`,
      );

      setShowDeletePopup(false);
      setSelectedRoute(null);

      // บังคับดึงข้อมูลใหม่หลังลบสำเร็จ
      await fetchMainRouteList(true);

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
      {/* Toast Alert */}
      {popupAlert.show && (
        <div
          className={`gov-toast-alert ${popupAlert.isSuccess ? "alert-success" : "alert-error"
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

      {/* เมนูด้านข้าง (Sidebar) */}
      <AdminSidebar activeMenu="routes" />

      {/* พื้นที่เนื้อหาหลัก */}
      <main className="gov-main-content">
        <div className="gov-container">
          <header className="gov-header">
            <h2>บัญชีรายชื่อเส้นทางสุขภาพ (List Main Route)</h2>
            <p>ระบบบริการจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

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
                <th style={{ width: "5%", textAlign: "center" }}>
                  ลำดับเส้นทาง
                </th>
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
                sortedRoutes.map((item, index) => (
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

              {!loading && sortedRoutes.length === 0 && (
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

      {/* Popup ยืนยันการลบ */}
      {showDeletePopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>

            <h3>ยืนยันการลบข้อมูล</h3>

            <p>
              คุณต้องการลบเส้นทางสุขภาพ{" "}
              <span className="popup-route-name">
                {selectedRoute?.routeName}
              </span>{" "}
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
