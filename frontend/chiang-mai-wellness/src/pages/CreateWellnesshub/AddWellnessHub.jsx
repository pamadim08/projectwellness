import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddWellnessHub.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleInfo,
  faLocationDot,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

const AddWellnessHub = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");

  // State สำหรับเก็บข้อมูลตัวเลือกใน Dropdown
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);

  // State สำหรับควบคุม Popup Alert
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setShowSuccessPopup(true);
    } catch (error) {
      console.error("Error saving establishment:", error);
      setErrorMessage(
        error.response?.data ||
          "ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบความถูกต้องอีกครั้ง",
      );
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      {/* 🟢 Sidebar เมนูหลัก */}
      <AdminSidebar activeMenu="wellness-hubs" />

      {/* 🔵 เนื้อหาฟอร์มบันทึกข้อมูล */}
      <div className="main-content">
        <div className="gov-container">
          <header className="gov-header">
            <h2>เพิ่มสถานประกอบการใหม่ (Add Wellness Hub)</h2>
            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="section-divider">
                <FontAwesomeIcon icon={faCircleInfo} /> ข้อมูลทั่วไปของธุรกิจ
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
                <FontAwesomeIcon icon={faLocationDot} /> สถานที่ตั้ง
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
                  onClick={() => navigate("/listWellnesshub")}
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
                      <FontAwesomeIcon icon={faSave} /> บันทึกข้อมูล
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 🟢 Popup สำเร็จ */}
      {showSuccessPopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon success">✓</div>
            <h3>บันทึกข้อมูลสำเร็จ</h3>
            <p>ระบบได้บันทึกข้อมูลสถานประกอบการเรียบร้อยแล้ว</p>
            <button
              className="confirm-btn"
              onClick={() => {
                setShowSuccessPopup(false);
                navigate("/listWellnesshub");
              }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* 🔴 Popup ผิดพลาด */}
      {showErrorPopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>
            <h3>ไม่สามารถบันทึกข้อมูลได้</h3>
            <p>{errorMessage}</p>
            <button
              className="confirm-btn"
              onClick={() => setShowErrorPopup(false)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddWellnessHub;
