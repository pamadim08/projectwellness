import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./ListWellnesshub.css";

const ListWellnessHub = () => {
  const [listwellnesshub, setListWellnessHub] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const navigate = useNavigate();

  // --- ส่วนที่เพิ่มเข้ามา: State สำหรับเก็บข้อมูลตัวเลือก และค่าที่ถูกเลือกกรอง ---
  const [categories, setCategories] = useState([]); 
  const [districts, setDistricts] = useState([]);   
  const [selectedCategory, setSelectedCategory] = useState(""); 
  const [selectedDistrict, setSelectedDistrict] = useState(""); 

  // ปรับปรุงฟังก์ชันโหลดข้อมูลให้รองรับการส่งเงื่อนไข Payload ไปหาหลังบ้าน
  const loadData = async (search = searchQuery, cat = selectedCategory, dist = selectedDistrict) => {
    setIsLoading(true);
    try {
      // เรียกใช้คำสั่ง POST ส่งเป็น JSON Object ไปที่หลังบ้านแทนการกรองบน Client
      const response = await axios.post("http://localhost:8080/api/wellness-hubs/search", {
        search: search || null,
        categoryId: cat || null,
        districtId: dist || null
      });
      setListWellnessHub(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setListWellnessHub([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ส่วนที่เพิ่มเข้ามา: ฟังก์ชันโหลดตัวเลือกหมวดหมู่และอำเภอจากฐานข้อมูลเพื่อใส่ใน Dropdown ---
  const loadFilterOptions = async () => {
    try {
      const [catResponse, distResponse] = await Promise.all([
        axios.get("http://localhost:8080/api/categories"),
        axios.get("http://localhost:8080/api/districts")
      ]);
      setCategories(Array.isArray(catResponse.data) ? catResponse.data : []);
      setDistricts(Array.isArray(distResponse.data) ? distResponse.data : []);
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  useEffect(() => {
    loadData();
    loadFilterOptions(); // เรียกโหลดตัวเลือกสำหรับ Dropdown ไปพร้อมกันตอนเปิดหน้าจอ
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
  }, []);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  // เนื่องจากเปลี่ยนไปดึงแบบกรองสำเร็จรูปจาก Stream ฝั่งหลังบ้านแล้ว 
  // ตรงนี้ filteredData จึงเปลี่ยนมารองรับอาเรย์ตรงๆ และพร้อมทำงานกับ Pagination ต่อได้ทันที
  const filteredData = useMemo(() => {
    return listwellnesshub;
  }, [listwellnesshub]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleDelete = async (id) => {
    if (window.confirm("ยืนยันการลบข้อมูลสถานประกอบการนี้?")) {
      try {
        await axios.delete(`http://localhost:8080/api/wellness-hubs/${id}`);
        alert("ลบข้อมูลสำเร็จ");
        loadData();
      } catch (error) {
        alert("ไม่สามารถลบข้อมูลได้");
      }
    }
  };

  return (
    <div className="admin-layout">
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
          <Link to="/admin/routes" className="menu-item">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/admin/establishments" className="menu-item active">
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

      <div className="main-content">
        <div className="gov-container">
          <header className="gov-header">
            <h2>บัญชีรายชื่อสถานประกอบการ (List Wellness Hub)</h2>
            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <div className="action-bar-top">
            <button
              className="btn-gov-add"
              onClick={() => navigate("/admin/add-wellness")}
            >
              <i className="fa-solid fa-plus"></i> เพิ่มสถานประกอบการใหม่
            </button>
          </div>

          {/* แก้ไขก้อน gov-filter-bar เพื่อทำการใส่ดร็อปดาวน์คัดกรองข้อมูลตามฟังก์ชัน Use Case */}
          <div className="gov-filter-bar">
            <input
              type="text"
              className="gov-input"
              placeholder="ค้นหาชื่อสถานประกอบการ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                  loadData(searchQuery, selectedCategory, selectedDistrict);
                }
              }}
            />

            {/* เพิ่มดรอปดาวน์แสดงข้อมูลหมวดหมู่ */}
            <select
              className="gov-select"
              value={selectedCategory}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCategory(value);
                setCurrentPage(1);
                loadData(searchQuery, value, selectedDistrict);
              }}
            >
              <option value="">-- หมวดหมู่ทั้งหมด --</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>

            {/* เพิ่มดรอปดาวน์แสดงรายชื่ออำเภอ */}
            <select
              className="gov-select"
              value={selectedDistrict}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDistrict(value);
                setCurrentPage(1);
                loadData(searchQuery, selectedCategory, value);
              }}
            >
              <option value="">-- อำเภอทั้งหมด --</option>
              {districts.map((dist) => (
                <option key={dist.districtId} value={dist.districtId}>
                  {dist.districtName}
                </option>
              ))}
            </select>

            <button
              className="btn-gov-search"
              onClick={() => {
                setCurrentPage(1);
                loadData(searchQuery, selectedCategory, selectedDistrict);
              }}
            >
              <i className="fa-solid fa-magnifying-glass"></i> ค้นหา
            </button>

            {/* ปุ่มรีเฟรชข้อมูลล่าสุด / ล้างตัวกรองทั้งหมดกลับสู่สถานะดั้งเดิม */}
            <button
              className="btn-gov-search"
              style={{ backgroundColor: "#6c757d" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedDistrict("");
                setCurrentPage(1);
                loadData("", "", "");
              }}
            >
              <i className="fa-solid fa-rotate"></i> รีเฟรชข้อมูลล่าสุด
            </button>
          </div>

          <div className="gov-table-container">
            <table className="list-table">
              <thead>
                <tr>
                  <th width="5%">ลำดับ</th>
                  <th width="35%">ชื่อสถานประกอบการ</th>
                  <th width="20%">หมวดหมู่</th>
                  <th width="15%">อำเภอ</th>
                  <th width="15%">สถานะ</th>
                  <th width="10%">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center"
                      style={{ padding: "30px", color: "#666" }}
                    >
                      <i
                        className="fa-solid fa-spinner fa-spin"
                        style={{ marginRight: "8px" }}
                      ></i>{" "}
                      กำลังโหลดข้อมูลระบบ...
                    </td>
                  </tr>
                ) : currentRows.length > 0 ? (
                  currentRows.map((hub, index) => (
                    <tr key={hub.licenseId ?? index}>
                      <td className="text-center">
                        {indexOfFirstRow + index + 1}
                      </td>
                      <td>
                        <strong>{hub.wellnessHubName ?? "ไม่ระบุชื่อ"}</strong>
                      </td>
                      <td>{hub.category?.categoryName ?? "-"}</td>
                      <td className="text-center">
                        {hub.district?.districtName ?? "-"}
                      </td>
                      <td className="text-center">
                        <span
                          className="status-text"
                          style={{
                            color:
                              hub.status === "active" ? "#1c7430" : "#c82333",
                          }}
                        >
                          {hub.status === "active"
                            ? "[ เปิดใช้งาน ]"
                            : "[ ระงับการใช้งาน ]"}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          <button
                            className="btn-edit"
                            onClick={() =>
                              navigate(`/admin/edit-wellness/${hub.licenseId}`)
                            }
                          >
                            แก้ไข
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(hub.licenseId)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center"
                      style={{ padding: "30px", color: "#dc3545", fontWeight: "bold" }}
                    >
                      <i
                        className="fa-solid fa-circle-exclamation"
                        style={{ marginRight: "8px" }}
                      ></i>{" "}
                      ไม่พบข้อมูลสถานประกอบการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="gov-pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ก่อนหน้า
              </button>
              <span>
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListWellnessHub;