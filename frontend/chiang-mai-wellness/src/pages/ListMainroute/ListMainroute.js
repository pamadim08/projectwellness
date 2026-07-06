import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "axios";
import "./ListMainroute.css";

const ListMainRoute = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true); // เพิ่ม State สำหรับคุมสถานะการโหลดข้อมูลตามดีไซน์

  // 🌟 เพิ่ม State สำหรับเก็บชื่อแอดมินที่ล็อกอินอยู่ในปัจจุบัน
  const [adminName, setAdminName] = useState("admin02");

  // State ควบคุมกล่องป๊อปอัปแจ้งเตือนผลลัพธ์ลอยตัว
  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  // 1. โหลดข้อมูลแอดมิน (กรณีเก็บข้อมูลในระบบ Session หลังระบบล็อกอิน)
  useEffect(() => {
    const storedAdmin = localStorage.getItem("adminName");
    if (storedAdmin) {
      setAdminName(storedAdmin);
    }
  }, []);

  // 2. โหลดตารางทะเบียนข้อมูลสรุปก้อนใหญ่จาก API หลังบ้าน
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

  // 3. ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("adminName");
      navigate("/admin/login");
    }
  };

  // 4. ฟังก์ชันลบข้อมูลเส้นทางสุขภาพหลัก
  const handleDeleteRoute = async (routeId, routeName) => {
    if (
      window.confirm(
        `⚠️ คุณต้องการสั่งลบเส้นทางสุขภาพหลัก "${routeName}" ใช่หรือไม่?`,
      )
    ) {
      try {
        await axiosInstance.delete(
          `http://localhost:8080/api/main-routes/${routeId}`,
        );
        setPopupAlert({
          show: true,
          message: "🗑 ... ระบบดำเนินการลบข้อมูลเส้นทางสุขภาพสำเร็จแล้ว!",
          isSuccess: true,
        });

        fetchMainRouteList();
        setTimeout(
          () => setPopupAlert({ show: false, message: "", isSuccess: true }),
          2200,
        );
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการลบทะเบียน", err);
        setPopupAlert({
          show: true,
          message: "❌ ไม่สำเร็จ: เกิดข้อผิดพลาดจากระบบในการลบข้อมูล",
          isSuccess: false,
        });
        setTimeout(
          () => setPopupAlert({ show: false, message: "", isSuccess: false }),
          4000,
        );
      }
    }
  };

  return (
    <div className="gov-admin-layout">
      {/* 🌟 บล็อกแสดงป๊อปอัปสไตล์แจ้งผลลัพธ์เหลี่ยมมุมคมชัด */}
      {popupAlert.show && (
        <div
          style={{
            position: "fixed",
            top: "25px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: popupAlert.isSuccess ? "#28a745" : "#dc3545",
            color: "white",
            padding: "15px 35px",
            borderRadius: "0px",
            fontWeight: "bold",
            fontSize: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <span>{popupAlert.isSuccess ? "✅" : "⚠️"}</span>
          <span>{popupAlert.message}</span>
        </div>
      )}

      {/* 🌟 โครงสร้างนาวิเกชันบาร์สไตล์เมนูควบคุมสิทธิ์ตามที่แอดมินส่งมาเป๊ะๆ */}
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
          <Link to="/admin/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/admin/requests" className="menu-item">
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
          <Link to="/admin/articles" className="menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button className="btn-sidebar-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
        </button>
      </nav>

      <main className="gov-main-content">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #ccc",
            paddingBottom: "15px",
          }}
        >
          <div>
            <h2>บัญชีรายชื่อเส้นทางสุขภาพ (List Main Route)</h2>
            <span style={{ fontSize: "13px", color: "#666" }}>
              ระบบบริการจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่
            </span>
          </div>
          <Link to="/createMainRoute" className="gov-btn-add-route-new">
            + เพิ่มเส้นทางใหม่
          </Link>
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
                          onClick={() =>
                            handleDeleteRoute(item.routeId, item.routeName)
                          }
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
    </div>
  );
};

export default ListMainRoute;
