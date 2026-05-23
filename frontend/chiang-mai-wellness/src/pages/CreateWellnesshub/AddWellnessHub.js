import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./AddWellnessHub.css";

const AddWellnessHub = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");

  // State สำหรับเก็บข้อมูลตัวเลือกใน Dropdown
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);

  // State สำหรับผูกกับอินพุตในฟอร์ม
  const [formData, setFormData] = useState({
    licenseId: "",
    wellnessHubName: "",
    address: "",
    certificateType: "",
    googleMapsLink: "",
    telInformation: "",
    contactInformation: "",
    wellnessHubDescription: "",
    wellnessHubLatitude: 18.7883, // พิกัดเชียงใหม่เริ่มต้น
    wellnessHubLongitude: 98.9853,
    categoryId: "",
    districtId: "",
  });

  useEffect(() => {
    // ดึงชื่อแอดมินจากระบบ
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);

    // โหลดตัวเลือกจากฐานข้อมูลหลังบ้าน
    const loadFilterOptions = async () => {
      try {
        const [catResponse, distResponse] = await Promise.all([
          axios.get("http://localhost:8080/api/categories"),
          axios.get("http://localhost:8080/api/districts"),
        ]);
        setCategories(Array.isArray(catResponse.data) ? catResponse.data : []);
        setDistricts(Array.isArray(distResponse.data) ? distResponse.data : []);
      } catch (error) {
        console.error("Error loading form options:", error);
      }
    };
    loadFilterOptions();
  }, []);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      licenseId: parseInt(formData.licenseId),
      wellnessHubName: formData.wellnessHubName,
      address: formData.address,
      certificateType: formData.certificateType || null,
      googleMapsLink: formData.googleMapsLink || null,
      telInformation: formData.telInformation,
      contactInformation: formData.contactInformation || null,
      wellnessHubDescription: formData.wellnessHubDescription || null,
      wellnessHubLatitude: parseFloat(formData.wellnessHubLatitude),
      wellnessHubLongitude: parseFloat(formData.wellnessHubLongitude),
      status: "active",
      category: formData.categoryId
        ? { categoryId: formData.categoryId }
        : null,
      district: formData.districtId
        ? { districtId: formData.districtId }
        : null,
    };

    try {
      await axios.post("http://localhost:8080/api/wellness-hubs", payload);
      alert("🎉 บันทึกข้อมูลสถานประกอบการสำเร็จ!");
      navigate("/listWellnesshub");
    } catch (error) {
      console.error("Error saving establishment:", error);
      alert(
        error.response?.data ||
          "ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบความถูกต้องอีกครั้ง",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      {/* 🟢 Aside / Sidebar เมนูตัวเดิมของคุณเป๊ะๆ */}
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

      {/* 🔵 เนื้อหาฝั่งฟอร์มบันทึกข้อมูลสไตล์ทางราชการ */}
      <div className="main-content">
        <div className="gov-container">
          <header className="gov-header">
            <h2>เพิ่มสถานประกอบการใหม่ (Add Wellness Hub)</h2>
            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="section-divider">
                <i className="fa-solid fa-circle-info"></i>{" "}
                ข้อมูลทั่วไปของธุรกิจ
              </div>

              <div className="form-group">
                <label>ชื่อสถานประกอบการ*</label>
                <input
                  type="text"
                  name="wellnessHubName"
                  className="gov-input-field"
                  placeholder="ระบุชื่อภาษาไทยที่ถูกต้องตามใบอนุญาต..."
                  value={formData.wellnessHubName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>หมวดหมู่ธุรกิจ*</label>
                  <select
                    name="categoryId"
                    className="gov-input-field"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      -- เลือกประเภทธุรกิจ --
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ประเภทใบรับรองศูนย์เวลเนส</label>
                  <select
                    name="certificateType"
                    className="gov-input-field"
                    value={formData.certificateType}
                    onChange={handleChange}
                  >
                    <option value="">-- เลือกประเภทใบรับรอง --</option>
                    <option value="wellness-spa">
                      สปาเพื่อสุขภาพ (Wellness Spa)
                    </option>
                    <option value="wellness-clinic">
                      สถานพยาบาล (Wellness Clinic)
                    </option>
                    <option value="wellness-resort">
                      ที่พักนักท่องเที่ยว (Wellness Resort)
                    </option>
                    <option value="wellness-restaurant">
                      ภัตตาคาร (Wellness Restaurant)
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>เลขใบอนุญาตประกอบกิจการ*</label>
                  <input
                    type="text"
                    name="licenseId"
                    className="gov-input-field"
                    placeholder="ระบุเลขที่ใบอนุญาต (เฉพาะตัวเลข)"
                    value={formData.licenseId}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>เบอร์โทรศัพท์ติดต่อ*</label>
                  <input
                    type="text"
                    name="telInformation"
                    className="gov-input-field"
                    placeholder="ระบุเบอร์โทรศัพท์ 10 หลัก..."
                    maxLength="10"
                    value={formData.telInformation}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="section-divider">
                <i className="fa-solid fa-location-dot"></i> สถานที่ตั้ง
              </div>

              <div className="form-group">
                <label>รายละเอียดที่อยู่*</label>
                <textarea
                  name="address"
                  className="gov-input-field gov-textarea"
                  placeholder="เลขที่บ้าน, ถนน, ตำบล..."
                  value={formData.address}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>อำเภอที่ตั้ง*</label>
                  <select
                    name="districtId"
                    className="gov-input-field"
                    value={formData.districtId}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      -- เลือกอำเภอ --
                    </option>
                    {districts.map((dist) => (
                      <option key={dist.districtId} value={dist.districtId}>
                        {dist.districtName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ลิงก์ Google Maps (URL)*</label>
                  <input
                    type="url"
                    name="googleMapsLink"
                    className="gov-input-field"
                    placeholder="https://maps.google.com/..."
                    value={formData.googleMapsLink}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-gov-cancel"
                  onClick={() => navigate("/admin/establishments")}
                  disabled={isLoading}
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="btn-gov-save"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i> บันทึกข้อมูล
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWellnessHub;
