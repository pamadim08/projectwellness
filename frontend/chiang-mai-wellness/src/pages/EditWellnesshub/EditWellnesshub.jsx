import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "axios";
import "./EditWellnesshub.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";
import { clearWellnessHubCache } from "../ListWellnesshub/ListWellnesshub";

const WELLNESS_CERTIFICATE_OPTIONS = [
  "ศูนย์เวลเนสประเภทสปาเพื่อสุขภาพ (Wellness Spa)",
  "ศูนย์เวลเนสประเภทสถานพยาบาล (Wellness Clinic)",
  "ศูนย์เวลเนสประเภทภัตตาคาร (Wellness Restaurant)",
  "ศูนย์เวลเนสประเภทนวดเพื่อสุขภาพ (Wellness Massage)",
  "ศูนย์เวลเนสประเภทที่พักนักท่องเที่ยว (Wellness Accommodation)",
  "ศูนย์เวลเนสอัตลักษณ์ไทย (Thainess Wellness Destination)",
];

const EditWellnessHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [errors, setErrors] = useState({});

  // State สำหรับควบคุม Dropdown เลือกใบรับรองแบบหลายตัวเลือก
  const [isCertOpen, setIsCertOpen] = useState(false);
  const certDropdownRef = useRef(null);

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
    function handleClickOutside(event) {
      if (certDropdownRef.current && !certDropdownRef.current.contains(event.target)) {
        setIsCertOpen(false);
      }
    }
    if (isCertOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCertOpen]);

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

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ดักห้ามมีช่องว่างสำหรับ telInformation และ googleMapsLink
    if (name === "telInformation" || name === "googleMapsLink") {
      if (/\s/.test(value)) return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 📌 ฟังก์ชันสกัดละติจูด/ลองจิจูด จาก URL ลิงก์ Google Maps
  const parseLatLngFromGoogleMapsLink = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();

    const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    const placeMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)(?:.*)!4d(-?\d+(?:\.\d+)?)/);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    const qMatch = trimmed.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    const dirMatch = trimmed.match(/\/(?:dir|search)\/[^/]*\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || trimmed.match(/\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (dirMatch) {
      const lat = parseFloat(dirMatch[1]);
      const lng = parseFloat(dirMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage("");

    const name = String(formData.wellnessHubName || "").trim();
    const categoryId = String(formData.categoryId || "").trim();
    const tel = String(formData.telInformation || "").trim();
    const address = String(formData.address || "").trim();
    const districtId = String(formData.districtId || "").trim();
    const googleMapsLink = String(formData.googleMapsLink || "").trim();

    // 1. ชื่อสถานประกอบการ: 2-100 ตัวอักษร
    if (!name || name.length < 2 || name.length > 100 || !/^[a-zA-Z0-9\u0E00-\u0E7F\s/.\-()&,'#+]+$/.test(name)) {
      setErrorMessage("กรุณาระบุชื่อสถานประกอบการให้ถูกต้อง (2-100 ตัวอักษร)");
      setShowErrorPopup(true);
      return;
    }

    // 2. หมวดหมู่ธุรกิจ: ห้ามว่าง
    if (!categoryId) {
      setErrorMessage("กรุณาเลือกหมวดหมู่ธุรกิจ");
      setShowErrorPopup(true);
      return;
    }

    // 3. เบอร์โทรศัพท์: ตัวเลข 9-10 หลัก
    if (tel && !/^0\d{8,9}$/.test(tel) && !/^[0-9\-+\s]{9,15}$/.test(tel)) {
      setErrorMessage("กรุณาระบุเบอร์โทรศัพท์ติดต่อให้ถูกต้อง (เช่น 0812345678)");
      setShowErrorPopup(true);
      return;
    }

    // 4. ที่อยู่: 5-255 ตัวอักษร
    if (!address || address.length < 5 || address.length > 255) {
      setErrorMessage("กรุณาระบุรายละเอียดที่อยู่ให้ถูกต้อง (5-255 ตัวอักษร)");
      setShowErrorPopup(true);
      return;
    }

    // 5. อำเภอ: ห้ามว่าง
    if (!districtId) {
      setErrorMessage("กรุณาเลือกอำเภอที่ตั้ง");
      setShowErrorPopup(true);
      return;
    }

    // 6. Google Maps: ห้ามว่าง ต้องเป็น URL ที่ถูกต้อง
    if (!googleMapsLink || /\s/.test(googleMapsLink) || !/^https?:\/\/.+/i.test(googleMapsLink)) {
      setErrorMessage("กรุณาระบุลิงก์ Google Maps ให้ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https:// และห้ามมีช่องว่าง)");
      setShowErrorPopup(true);
      return;
    }

    setIsLoading(true);

    // 🔍 ดึงข้อมูลสถานประกอบการทั้งหมด เพื่อเช็กการซ้ำของชื่อและพิกัดแผนที่ (ยกเว้นรายการที่กำลังแก้ไขอยู่)
    const parsedCoords = parseLatLngFromGoogleMapsLink(googleMapsLink);
    try {
      const existingHubsRes = await axiosInstance.get("http://localhost:8080/api/wellness-hubs");
      const existingHubs = Array.isArray(existingHubsRes.data) ? existingHubsRes.data : [];

      const otherHubs = existingHubs.filter(
        (hub) => String(hub.licenseId) !== String(formData.licenseId) && String(hub.licenseId) !== String(id)
      );

      // 1) เช็กชื่อซ้ำ
      const isDuplicateName = otherHubs.some(
        (hub) => String(hub.wellnessHubName || "").trim().toLowerCase() === name.toLowerCase()
      );
      if (isDuplicateName) {
        setIsLoading(false);
        setErrorMessage("ชื่อสถานประกอบการนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
        setShowErrorPopup(true);
        return;
      }

      // 2) เช็กพิกัด / ลิงก์ Google Maps ซ้ำ
      if (parsedCoords) {
        const isDuplicateLocation = otherHubs.some((hub) => {
          const sameLink = hub.googleMapsLink && String(hub.googleMapsLink).trim() === googleMapsLink;
          const hLat = parseFloat(hub.wellnessHubLatitude ?? hub.latitude);
          const hLng = parseFloat(hub.wellnessHubLongitude ?? hub.longitude);

          const sameCoords =
            !isNaN(hLat) &&
            !isNaN(hLng) &&
            Math.abs(hLat - parsedCoords.lat) < 0.0001 &&
            Math.abs(hLng - parsedCoords.lng) < 0.0001;

          return sameLink || sameCoords;
        });

        if (isDuplicateLocation) {
          setIsLoading(false);
          setErrorMessage("พิกัดแผนที่ หรือลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง");
          setShowErrorPopup(true);
          return;
        }
      }
    } catch (err) {
      console.warn("⚠️ ไม่สามารถดึงข้อมูลมาเช็กซ้ำก่อนบันทึกได้:", err);
    }

    const payload = {
      licenseId: formData.licenseId,
      wellnessHubName: name,
      telInformation: tel,
      certificateType: formData.certificateType || null,
      address: address,
      googleMapsLink: googleMapsLink,
      status: formData.status || "ACTIVE",
      category: categoryId ? { categoryId: categoryId } : null,
      district: districtId ? { districtId: parseInt(districtId, 10) } : null,
    };

    if (parsedCoords) {
      payload.wellnessHubLatitude = parsedCoords.lat;
      payload.wellnessHubLongitude = parsedCoords.lng;
    }

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
      setErrorMessage(
        "ไม่สามารถแก้ไขข้อมูลสถานประกอบการได้ กรุณาลองใหม่อีกครั้ง",
      );
      setShowErrorPopup(true);
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
                    className={`hub-status-text ${formData.status === "active"
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
                    maxLength={100}
                    value={formData.wellnessHubName}
                    onChange={handleChange}
                    required
                  />
                  <div className="char-counter">{(formData.wellnessHubName || "").length}/100</div>
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
                  <div
                    ref={certDropdownRef}
                    className={`gov-multi-select ${isCertOpen ? "open" : ""}`}
                  >
                    <div
                      className="gov-multi-select-trigger"
                      onClick={() => setIsCertOpen((prev) => !prev)}
                    >
                      <div className="gov-multi-select-value">
                        {formData.certificateType ? (
                          <div className="gov-multi-select-tags">
                            {formData.certificateType.split(", ").filter(Boolean).map((cert) => (
                              <span key={cert} className="gov-multi-select-tag">
                                <span>{cert}</span>
                                <button
                                  type="button"
                                  className="gov-multi-select-tag-del"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = formData.certificateType.split(", ").filter(Boolean);
                                    const next = current.filter((c) => c !== cert);
                                    setFormData((prev) => ({
                                      ...prev,
                                      certificateType: next.join(", "),
                                    }));
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="gov-multi-select-placeholder">
                            -- เลือกประเภทใบรับรอง (เลือกได้หลายตัวเลือก) --
                          </span>
                        )}
                      </div>
                      <span className="gov-multi-select-caret">▾</span>
                    </div>

                    {isCertOpen && (
                      <div className="gov-multi-select-dropdown">
                        <div className="gov-multi-select-header">
                          <span>
                            เลือกประเภทใบรับรอง ({formData.certificateType ? formData.certificateType.split(", ").filter(Boolean).length : 0}/{WELLNESS_CERTIFICATE_OPTIONS.length})
                          </span>
                          <button
                            type="button"
                            className="gov-multi-select-btn-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              const current = formData.certificateType ? formData.certificateType.split(", ").filter(Boolean) : [];
                              if (current.length === WELLNESS_CERTIFICATE_OPTIONS.length) {
                                setFormData((prev) => ({ ...prev, certificateType: "" }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  certificateType: WELLNESS_CERTIFICATE_OPTIONS.join(", "),
                                }));
                              }
                            }}
                          >
                            {formData.certificateType && formData.certificateType.split(", ").filter(Boolean).length === WELLNESS_CERTIFICATE_OPTIONS.length
                              ? "ล้างทั้งหมด"
                              : "เลือกทั้งหมด"}
                          </button>
                        </div>

                        <div className="gov-multi-select-list">
                          {WELLNESS_CERTIFICATE_OPTIONS.map((option) => {
                            const current = formData.certificateType ? formData.certificateType.split(", ").filter(Boolean) : [];
                            const checked = current.includes(option);
                            return (
                              <div
                                key={option}
                                className={`gov-multi-select-item ${checked ? "selected" : ""}`}
                                onClick={() => {
                                  let next;
                                  if (checked) {
                                    next = current.filter((c) => c !== option);
                                  } else {
                                    next = [...current, option];
                                  }
                                  setFormData((prev) => ({
                                    ...prev,
                                    certificateType: next.join(", "),
                                  }));
                                }}
                              >
                                <div
                                  className={`gov-custom-cb ${checked ? "checked" : ""}`}
                                >
                                  {checked ? "✓" : ""}
                                </div>
                                <span className="gov-multi-select-item-text">
                                  {option}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
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
                  className={`form-group ${errors.telInformation ? "has-error" : ""
                    }`}
                >
                  <label>เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    name="telInformation"
                    maxLength={10}
                    value={formData.telInformation}
                    onChange={handleChange}
                    required
                  />
                  <div className="char-counter">{(formData.telInformation || "").length}/10</div>
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
                  maxLength={255}
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
                <div className="char-counter">{(formData.address || "").length}/255</div>
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
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isLoading}
                  style={isLoading ? { opacity: 0.7, cursor: "not-allowed" } : {}}
                >
                  {isLoading ? "กำลังบันทึก..." : "บันทึกข้อความอัปเดต"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 🔴 Popup แจ้งเตือนข้อผิดพลาด (Error Modal) */}
      {showErrorPopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>
            <h3>เกิดข้อผิดพลาด</h3>
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

export default EditWellnessHub;
