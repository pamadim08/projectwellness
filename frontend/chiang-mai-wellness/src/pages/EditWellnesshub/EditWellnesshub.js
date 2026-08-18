import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "axios";
import "./EditWellnesshub.css";

const EditWellnessHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    licenseId: "",
    wellnessHubName: "",
    categoryId: "",
    districtId: "",
    certificateType: "",
    telInformation: "",
    address: "",
    googleMapsLink: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [catRes, distRes, hubRes] = await Promise.all([
          axiosInstance.get("http://localhost:8080/api/categories"),
          axiosInstance.get("http://localhost:8080/api/districts"),
          axiosInstance.get(`http://localhost:8080/api/wellness-hubs/${id}`),
        ]);

        setCategories(catRes.data || []);
        setDistricts(distRes.data || []);

        const hubData = hubRes.data;
        if (!hubData) throw new Error("ไม่พบข้อมูลสถานประกอบการบนเซิร์ฟเวอร์");

        setFormData({
          licenseId: hubData.licenseId ?? "",
          wellnessHubName: hubData.wellnessHubName ?? "",
          categoryId: hubData.category?.categoryId
            ? String(hubData.category.categoryId)
            : "",
          districtId: hubData.district?.districtId
            ? String(hubData.district.districtId)
            : "",
          certificateType:
            hubData.certificateType && hubData.certificateType !== "null"
              ? hubData.certificateType
              : "",
          telInformation: hubData.telInformation ?? "",
          address: hubData.address === "null" ? "" : (hubData.address ?? ""),
          googleMapsLink:
            hubData.googleMapsLink === "null"
              ? ""
              : (hubData.googleMapsLink ?? ""),
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
        navigate("/listWellnesshub", {
          state: {
            showToast: true,
            toastType: "error",
            toastMessage: "ไม่สามารถดึงข้อมูลสถานประกอบการได้",
          },
        });
      }
    };

    fetchInitialData();

    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const tel = formData.telInformation
      ? String(formData.telInformation).trim()
      : "";
    if (!tel) {
      newErrors.telInformation = "หมายเลขโทรศัพท์ต้องไม่เป็นค่าว่าง";
    } else if (!/^\d+$/.test(tel)) {
      newErrors.telInformation = "หมายเลขโทรศัพท์ต้องเป็นตัวเลขเท่านั้น";
    } else if (formData.telInformation.includes(" ")) {
      newErrors.telInformation = "หมายเลขโทรศัพท์ไม่สามารถมีช่องว่างได้";
    } else if (tel.length < 9 || tel.length > 10) {
      newErrors.telInformation = "หมายเลขโทรศัพท์ต้องมีความยาว 9-10 ตัวอักษร";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.getElementsByName(firstErrorKey)[0];
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        errorElement.focus();
      }
      return;
    }

    setIsLoading(true);

    const payload = {
      licenseId: formData.licenseId,
      wellnessHubName: formData.wellnessHubName,
      telInformation: tel,
      certificateType: formData.certificateType || null,
      address: formData.address ? formData.address : null,
      googleMapsLink: formData.googleMapsLink ? formData.googleMapsLink : null,
      category:
        formData.categoryId && String(formData.categoryId).trim() !== ""
          ? { categoryId: String(formData.categoryId).trim() }
          : null,
      district:
        formData.districtId && String(formData.districtId).trim() !== ""
          ? { districtId: parseInt(formData.districtId, 10) }
          : null,
    };

    try {
      await axiosInstance.put(
        `http://localhost:8080/api/wellness-hubs/${id}`,
        payload,
      );
      setIsLoading(false);

      navigate("/listWellnesshub", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: "แก้ไขและลงรับข้อมูลในตารางกลางเสร็จสิ้น",
        },
      });
    } catch (error) {
      setIsLoading(false);

      navigate("/listWellnesshub", {
        state: {
          showToast: true,
          toastType: "error",
          toastMessage: "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหมู่อีกครั้ง",
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="gov-loading-container">
        <p>กำลังส่งและปรับปรุงข้อมูลในฐานข้อมูลกลาง...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("adminName");
    navigate("/login");
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
          <Link to="/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/listAccountRequest" className="menu-item active">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item">
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

      <main className="admin-content">
        <section className="page-title-hero">
          <h2>แก้ไขสถานประกอบการ (Edit Wellness Hub)</h2>
          <p className="gov-subtitle">
            ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่
          </p>
        </section>

        <div className="gov-line-divider" />

        <div className="content-body">
          <div className="form-card">
            <form onSubmit={handleSubmit} noValidate>
              <div className="section-heading">
                <span>1</span> ข้อมูลทั่วไปของธุรกิจ
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>ชื่อสถานประกอบการ *</label>
                  <input
                    type="text"
                    name="wellnessHubName"
                    value={formData.wellnessHubName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>หมวดหมู่ธุรกิจ *</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map((category) => (
                      <option
                        key={category.categoryId}
                        value={category.categoryId}
                      >
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ประเภทใบรับรองศูนย์เวลเนส</label>
                  <select
                    name="certificateType"
                    value={formData.certificateType || ""}
                    onChange={handleChange}
                  >
                    <option value="">-- เลือกประเภทธุรกิจ --</option>
                    <option value="Wellness Spa & Massage">
                      Wellness Spa & Massage
                    </option>
                    <option value="Wellness Clinic">Wellness Clinic</option>
                    <option value="Wellness Restaurant">
                      Wellness Restaurant
                    </option>
                    <option value="Wellness Accommodation">
                      Wellness Accommodation
                    </option>
                    <option value="Wellness Tourism">Wellness Tourism</option>
                    <option value="BLS (Basic Life Support)">
                      BLS (Basic Life Support)
                    </option>
                    <option value="ALS (Advanced Hospital)">
                      ALS (Advanced Hospital)
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>เลขใบอนุญาตประกอบกิจการ *</label>
                  <input
                    type="text"
                    name="licenseId"
                    value={formData.licenseId}
                    readOnly
                  />
                </div>

                <div
                  className={`form-group ${
                    errors.telInformation ? "has-error" : ""
                  }`}
                >
                  <label>เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    name="telInformation"
                    value={formData.telInformation}
                    onChange={handleChange}
                    required
                  />
                  {errors.telInformation && (
                    <span className="error-text-under">
                      {errors.telInformation}
                    </span>
                  )}
                </div>
              </div>

              <div className="section-heading">
                <span>2</span> สถานที่ตั้ง
              </div>

              <div className="form-group">
                <label>รายละเอียดที่อยู่ *</label>
                <textarea
                  rows="3"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>อำเภอที่ตั้ง *</label>
                  <select
                    name="districtId"
                    value={formData.districtId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {districts.map((district) => (
                      <option
                        key={district.districtId}
                        value={district.districtId}
                      >
                        {district.districtName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ลิงก์ Google Maps (URL) *</label>
                  <input
                    type="text"
                    name="googleMapsLink"
                    value={formData.googleMapsLink}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <Link to="/listWellnesshub" className="btn-cancel">
                  ยกเลิกรายการ
                </Link>
                <button type="submit" className="btn-save">
                  บันทึกข้อความอัปเดต
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditWellnessHub;
