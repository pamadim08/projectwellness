import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "axios";
import "./EditWellnesshub.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";
import { clearWellnessHubCache } from "../ListWellnesshub/ListWellnesshub";

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
    status: "active",
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

        const isStatusActive = (status) => {
          if (!status || String(status).trim() === "") return true;
          return String(status).trim().toLowerCase() === "active";
        };

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
          status: isStatusActive(hubData.status) ? "active" : "inactive",
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
      status: formData.status || "ACTIVE",
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
      clearWellnessHubCache();
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
      <AdminSidebar activeMenu="wellness-hubs" />

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
              {/* สวิตช์ปรับสถานะสถานประกอบการ (Toggle Switch) */}
              <div
                className="hub-status-container"
                style={{
                  borderLeftColor:
                    formData.status === "active" ? "#14532d" : "#dc3545",
                }}
              >
                <div className="hub-status-information">
                  <span className="hub-status-title">สถานะการให้บริการ</span>
                  <p className="hub-status-description">
                    เปิดใช้งาน หรือ ระงับการให้บริการของสถานประกอบการนี้ในระบบ
                  </p>
                </div>

                <div className="hub-status-control">
                  <span
                    className={`hub-status-text ${
                      formData.status === "active"
                        ? "status-active"
                        : "status-inactive"
                    }`}
                  >
                    {formData.status === "active"
                      ? "ใช้งาน (Active)"
                      : "ระงับการใช้งาน (Inactive)"}
                  </span>

                  <label
                    className="hub-toggle-switch"
                    htmlFor="hub-status-toggle"
                    title="สลับสถานะเปิดใช้งาน / ระงับการใช้งาน"
                  >
                    <input
                      id="hub-status-toggle"
                      type="checkbox"
                      name="status"
                      checked={formData.status === "active"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.checked ? "active" : "inactive",
                        }))
                      }
                    />
                    <span className="hub-toggle-slider" />
                  </label>
                </div>
              </div>

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
                  <input
                    type="text"
                    name="certificateType"
                    placeholder="ระบุประเภทใบรับรองศูนย์เวลเนส"
                    value={formData.certificateType || ""}
                    onChange={handleChange}
                  />
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
