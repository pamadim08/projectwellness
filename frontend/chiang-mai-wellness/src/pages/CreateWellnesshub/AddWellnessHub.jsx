import React, { useState, useEffect, useRef } from "react";
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

const WELLNESS_CERTIFICATE_OPTIONS = [
  "ศูนย์เวลเนสประเภทสปาเพื่อสุขภาพ (Wellness Spa)",
  "ศูนย์เวลเนสประเภทสถานพยาบาล (Wellness Clinic)",
  "ศูนย์เวลเนสประเภทภัตตาคาร (Wellness Restaurant)",
  "ศูนย์เวลเนสประเภทนวดเพื่อสุขภาพ (Wellness Massage)",
  "ศูนย์เวลเนสประเภทที่พักนักท่องเที่ยว (Wellness Accommodation)",
  "ศูนย์เวลเนสอัตลักษณ์ไทย (Thainess Wellness Destination)",
];

const AddWellnessHub = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");

  // State สำหรับควบคุม Dropdown เลือกใบรับรองแบบหลายตัวเลือก
  const [isCertOpen, setIsCertOpen] = useState(false);
  const certDropdownRef = useRef(null);

  // State สำหรับเก็บข้อมูลตัวเลือกใน Dropdown
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);

  // State สำหรับควบคุม Popup Alert
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdAccountInfo, setCreatedAccountInfo] = useState(null);

  // State สำหรับผูกกับอินพุตในฟอร์ม
  const [formData, setFormData] = useState({
    licenseId: "",
    username: "",
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
        const catList = Array.isArray(catResponse.data) ? catResponse.data : [];
        setCategories(catList);
        setDistricts(Array.isArray(distResponse.data) ? distResponse.data : []);

        // ตั้งค่าประเภทบริการเริ่มต้น
        if (catList.length > 0) {
          const defaultCat =
            catList.find(
              (c) =>
                c.categoryName?.includes("นวด") ||
                c.categoryName?.includes("สปา") ||
                c.categoryId === "C01",
            ) || catList[0];

          if (defaultCat) {
            setFormData((prev) => ({
              ...prev,
              categoryId: prev.categoryId || defaultCat.categoryId,
            }));
          }
        }
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

    // ดักห้ามมีช่องว่างสำหรับ licenseId และ googleMapsLink
    if (name === "licenseId" || name === "googleMapsLink") {
      if (/\s/.test(value)) return;
    }

    if (name === "licenseId") {
      const numericVal = value.replace(/\D/g, ""); // รับเฉพาะตัวเลข
      const isEm = ["EM01", "EM02"].includes(formData.categoryId);
      setFormData((prev) => ({
        ...prev,
        licenseId: numericVal,
        username: numericVal ? (isEm ? `ES_${numericVal}` : `WH_${numericVal}`) : "",
      }));
      return;
    }

    if (name === "categoryId") {
      const isEm = ["EM01", "EM02"].includes(value);
      setFormData((prev) => ({
        ...prev,
        categoryId: value,
        username: prev.licenseId ? (isEm ? `ES_${prev.licenseId}` : `WH_${prev.licenseId}`) : "",
      }));
      return;
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

    const licenseId = String(formData.licenseId || "").trim();
    const wellnessHubName = String(formData.wellnessHubName || "").trim();
    const categoryId = String(formData.categoryId || "").trim();
    const districtId = String(formData.districtId || "").trim();
    const address = String(formData.address || "").trim();
    const googleMapsLink = String(formData.googleMapsLink || "").trim();
    const tel = String(formData.telInformation || "").trim();

    // 1. เลขใบอนุญาต: 2-13 ตัวอักษร ภาษาอังกฤษหรือตัวเลขเท่านั้น ห้ามมีช่องว่าง ห้ามว่าง
    if (!licenseId || !/^[a-zA-Z0-9]{2,13}$/.test(licenseId)) {
      setErrorMessage("กรุณาระบุเลขใบอนุญาตประกอบกิจการให้ถูกต้อง (ตัวเลขหรือตัวอักษร 2-13 หลัก)");
      setShowErrorPopup(true);
      return;
    }

    // 2. ชื่อสถานประกอบการ: 2-100 ตัวอักษร รองรับภาษาไทย ภาษาอังกฤษ ตัวเลข และเครื่องหมายทั่วไป เช่น / - . ( )
    if (!wellnessHubName || wellnessHubName.length < 2 || wellnessHubName.length > 100 || !/^[a-zA-Z0-9\u0E00-\u0E7F\s/.\-()&,'#+]+$/.test(wellnessHubName)) {
      setErrorMessage("กรุณาระบุชื่อสถานประกอบการให้ถูกต้อง (2-100 ตัวอักษร)");
      setShowErrorPopup(true);
      return;
    }

    // 3. หมวดหมู่ธุรกิจ: ห้ามว่าง
    if (!categoryId) {
      setErrorMessage("กรุณาเลือกหมวดหมู่ธุรกิจ");
      setShowErrorPopup(true);
      return;
    }

    // 4. อำเภอที่ตั้ง: ห้ามว่าง
    if (!districtId) {
      setErrorMessage("กรุณาเลือกอำเภอที่ตั้ง");
      setShowErrorPopup(true);
      return;
    }

    // 5. ที่อยู่: 5-255 ตัวอักษร
    if (!address || address.length < 5 || address.length > 255) {
      setErrorMessage("กรุณาระบุรายละเอียดที่อยู่ให้ถูกต้อง (5-255 ตัวอักษร)");
      setShowErrorPopup(true);
      return;
    }

    // 6. เบอร์โทรศัพท์ (ถ้ามี): 9-10 หลัก
    if (tel && !/^0\d{8,9}$/.test(tel) && !/^[0-9\-+\s]{9,15}$/.test(tel)) {
      setErrorMessage("กรุณาระบุเบอร์โทรศัพท์ติดต่อให้ถูกต้อง (เช่น 0812345678)");
      setShowErrorPopup(true);
      return;
    }

    // 7. Google Maps: ต้องเป็น URL ที่ถูกต้อง
    if (!googleMapsLink || /\s/.test(googleMapsLink) || !/^https?:\/\/.+/i.test(googleMapsLink)) {
      setErrorMessage("กรุณาระบุลิงก์ Google Maps ให้ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https:// และห้ามมีช่องว่าง)");
      setShowErrorPopup(true);
      return;
    }

    setIsLoading(true);

    // 🔍 ดึงข้อมูลเพื่อเช็กการซ้ำของชื่อและพิกัดแผนที่ในระบบ
    const parsedCoords = parseLatLngFromGoogleMapsLink(googleMapsLink);
    try {
      const existingHubsRes = await axios.get("http://localhost:8080/api/wellness-hubs");
      const existingHubs = Array.isArray(existingHubsRes.data) ? existingHubsRes.data : [];

      // 1) เช็กชื่อซ้ำ
      const isDuplicateName = existingHubs.some(
        (hub) => String(hub.wellnessHubName || "").trim().toLowerCase() === wellnessHubName.toLowerCase()
      );
      if (isDuplicateName) {
        setIsLoading(false);
        setErrorMessage("ชื่อสถานประกอบการนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
        setShowErrorPopup(true);
        return;
      }

      // 2) เช็กพิกัด / ลิงก์ Google Maps ซ้ำ (ถ้าเป็นลิงก์เดียวกัน หรือมีพิกัดที่สกัดได้ตรงกัน)
      const isDuplicateLocation = existingHubs.some((hub) => {
        const sameLink = hub.googleMapsLink && String(hub.googleMapsLink).trim() === googleMapsLink;
        if (sameLink) return true;

        if (parsedCoords) {
          const hLat = parseFloat(hub.wellnessHubLatitude ?? hub.latitude);
          const hLng = parseFloat(hub.wellnessHubLongitude ?? hub.longitude);
          return (
            !isNaN(hLat) &&
            !isNaN(hLng) &&
            Math.abs(hLat - parsedCoords.lat) < 0.0001 &&
            Math.abs(hLng - parsedCoords.lng) < 0.0001
          );
        }
        return false;
      });

      if (isDuplicateLocation) {
        setIsLoading(false);
        setErrorMessage("พิกัดแผนที่ หรือลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง");
        setShowErrorPopup(true);
        return;
      }
    } catch (err) {
      console.warn("⚠️ ไม่สามารถดึงข้อมูลมาเช็กซ้ำก่อนบันทึกได้:", err);
    }

    const payload = {
      licenseId: licenseId ? parseInt(licenseId, 10) : null,
      username: formData.username || (licenseId ? (["EM01", "EM02"].includes(categoryId) ? `ES_${licenseId}` : `WH_${licenseId}`) : null),
      wellnessHubName: wellnessHubName,
      address: address,
      certificateType: formData.certificateType || null,
      googleMapsLink: googleMapsLink,
      telInformation: tel || null,
      contactInformation: formData.contactInformation ? formData.contactInformation.trim() : null,
      wellnessHubDescription: formData.wellnessHubDescription ? formData.wellnessHubDescription.trim() : null,
      wellnessHubLatitude: parsedCoords ? parsedCoords.lat : null,
      wellnessHubLongitude: parsedCoords ? parsedCoords.lng : null,
      status: "active",
      category: { categoryId: categoryId },
      district: { districtId: parseInt(districtId, 10) },
    };

    try {
      const res = await axios.post("http://localhost:8080/api/wellness-hubs", payload);
      setCreatedAccountInfo({
        licenseId: res.data?.licenseId || payload.licenseId,
        username: res.data?.username || payload.username,
        wellnessHubName: res.data?.wellnessHubName || wellnessHubName,
      });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error("Error saving establishment:", error);
      const serverMsg = error.response?.data?.message || (typeof error.response?.data === "string" ? error.response.data : "");
      setErrorMessage(serverMsg || "ไม่สามารถบันทึกข้อมูลสถานประกอบการได้ กรุณาลองใหม่อีกครั้ง");
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
                  placeholder="ระบุชื่อสถานประกอบการ (5-100 ตัวอักษร)..."
                  maxLength={100}
                  value={formData.wellnessHubName}
                  onChange={handleChange}
                  required
                />
                <div className="char-counter">{formData.wellnessHubName.length}/100</div>
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
                  <div
                    ref={certDropdownRef}
                    className={`gov-multi-select ${isCertOpen ? "open" : ""}`}
                  >
                    <div
                      className="gov-multi-select-trigger gov-input-field"
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
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>เลขใบอนุญาตประกอบกิจการ (รหัส)*</label>
                  <input
                    type="text"
                    name="licenseId"
                    className="gov-input-field"
                    placeholder="ระบุเลขที่ใบอนุญาต (10-13 หลัก)"
                    maxLength={13}
                    value={formData.licenseId}
                    onChange={handleChange}
                    required
                  />
                  <div className="char-counter">
                    {formData.licenseId.length}/13
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    ชื่อผู้ใช้งาน (Username)*{" "}
                    <span className="badge-autogen">สร้างให้อัตโนมัติ</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    className="gov-input-field gov-readonly-field"
                    placeholder="ระบบสร้างให้อัตโนมัติตามเลขใบอนุญาต"
                    value={
                      formData.username ||
                      (formData.licenseId
                        ? ["EM01", "EM02"].includes(formData.categoryId)
                          ? `ES_${formData.licenseId}`
                          : `WH_${formData.licenseId}`
                        : "")
                    }
                    readOnly
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    name="telInformation"
                    className="gov-input-field"
                    placeholder="ระบุเบอร์โทรศัพท์..."
                    maxLength={10}
                    value={formData.telInformation}
                    onChange={handleChange}
                  />
                  <div className="char-counter">
                    {(formData.telInformation || "").length}/10
                  </div>
                </div>

                <div className="form-group">
                  <label>ช่องทางการติดต่ออื่น ๆ</label>
                  <input
                    type="text"
                    name="contactInformation"
                    className="gov-input-field"
                    placeholder="เช่น Line ID, Facebook Page"
                    maxLength={255}
                    value={formData.contactInformation}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="section-divider">
                <FontAwesomeIcon icon={faLocationDot} /> สถานที่ตั้ง & พิกัดแผนที่
              </div>

              <div className="form-group">
                <label>รายละเอียดที่อยู่*</label>
                <textarea
                  name="address"
                  className="gov-input-field gov-textarea"
                  placeholder="ระบุรายละเอียดที่อยู่ (10-255 ตัวอักษร)..."
                  maxLength={255}
                  value={formData.address}
                  onChange={handleChange}
                  required
                ></textarea>
                <div className="char-counter">{formData.address.length}/255</div>
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
                  style={isLoading ? { opacity: 0.7, cursor: "not-allowed" } : {}}
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
            <p style={{ marginBottom: "12px" }}>ระบบได้เพิ่มสถานประกอบการและสร้างบัญชีผู้ใช้เรียบร้อยแล้ว</p>
            {createdAccountInfo && (
              <div
                style={{
                  backgroundColor: "#f4f9f4",
                  border: "1px solid #c8e6c9",
                  padding: "10px 14px",
                  marginBottom: "20px",
                  textAlign: "left",
                  fontSize: "13.5px",
                  lineHeight: "1.6",
                }}
              >
                <div>
                  <strong>รหัสสถานประกอบการ:</strong> {createdAccountInfo.licenseId}
                </div>
                <div>
                  <strong>ชื่อผู้ใช้งาน (Username):</strong> {createdAccountInfo.username}
                </div>
                <div>
                  <strong>สถานะ:</strong> <span style={{ color: "#1c7430", fontWeight: "bold" }}>ACTIVE</span>
                </div>
              </div>
            )}
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
