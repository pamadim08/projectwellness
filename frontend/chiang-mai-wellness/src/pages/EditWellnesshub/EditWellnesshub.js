import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "axios";
import "./EditWellnesshub.css";

// นำเข้าไอคอนจากแพ็กเกจที่คุณติดตั้งเสร็จผ่าน npm
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faPlus,
  faCertificate,
} from "@fortawesome/free-solid-svg-icons";

const EditWellnessHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ (Admin)");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [errors, setErrors] = useState({});

  const daysOfWeek = [
    { key: "monday", label: "วันจันทร์" },
    { key: "tuesday", label: "วันอังคาร" },
    { key: "wednesday", label: "วันพุธ" },
    { key: "thursday", label: "วันพฤหัสบดี" },
    { key: "friday", label: "วันศุกร์" },
    { key: "saturday", label: "วันเสาร์" },
    { key: "sunday", label: "วันอาทิตย์" },
  ];

  const [formData, setFormData] = useState({
    licenseId: "",
    wellnessHubName: "",
    categoryId: "",
    districtId: "",
    certificateType: [""],
    telInformation: "",
    contactPlatform: "Line",
    contactValue: "",
    wellnessHubDescription: "",
    address: "",
    googleMapsLink: "",
    wellnessHubImg: [],
    status: "active",
  });

  const [operatingHoursObj, setOperatingHoursObj] = useState({
    monday: { active: false, open: "10:00", close: "22:00" },
    tuesday: { active: false, open: "10:00", close: "22:00" },
    wednesday: { active: false, open: "10:00", close: "22:00" },
    thursday: { active: false, open: "10:00", close: "22:00" },
    friday: { active: false, open: "10:00", close: "22:00" },
    saturday: { active: false, open: "10:00", close: "22:00" },
    sunday: { active: false, open: "10:00", close: "22:00" },
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

        let loadedPlatform = "Line";
        let loadedValue = "";
        if (
          hubData.contactInformation &&
          hubData.contactInformation.includes(": ")
        ) {
          const parts = hubData.contactInformation.split(": ");
          loadedPlatform = parts[0];
          loadedValue = parts[1];
        } else if (
          hubData.contactInformation &&
          hubData.contactInformation !== "null"
        ) {
          loadedValue = hubData.contactInformation;
        }

        let parsedImages = [];
        if (
          hubData.wellnessHubImg &&
          hubData.wellnessHubImg !== "null" &&
          hubData.wellnessHubImg !== ""
        ) {
          try {
            parsedImages = JSON.parse(hubData.wellnessHubImg);
            if (!Array.isArray(parsedImages)) {
              parsedImages = [parsedImages];
            }
          } catch (e) {
            parsedImages = [hubData.wellnessHubImg];
          }
        }

        let parsedCertificates = [""];
        if (
          hubData.certificateType &&
          hubData.certificateType !== "null" &&
          hubData.certificateType !== ""
        ) {
          try {
            parsedCertificates = JSON.parse(hubData.certificateType);
            if (!Array.isArray(parsedCertificates)) {
              parsedCertificates = [parsedCertificates];
            }
            if (parsedCertificates.length === 0) {
              parsedCertificates = [""];
            }
          } catch (e) {
            parsedCertificates = [hubData.certificateType];
          }
        }

        setFormData({
          licenseId: hubData.licenseId ?? "",
          wellnessHubName: hubData.wellnessHubName ?? "",
          // 🌟 บังคับครอบเป็น String เพื่อให้แมตช์เข้าคู่กับตัวเลือกใน <select> เสมอ ป้องกันค่าหลุดเป็นขีดแดช
          categoryId: hubData.category?.categoryId
            ? String(hubData.category.categoryId)
            : "",
          districtId: hubData.district?.districtId
            ? String(hubData.district.districtId)
            : "",
          certificateType: parsedCertificates,
          telInformation: hubData.telInformation ?? "",
          contactPlatform: loadedPlatform,
          contactValue: loadedValue,
          wellnessHubDescription: hubData.wellnessHubDescription ?? "",
          address: hubData.address === "null" ? "" : (hubData.address ?? ""),
          googleMapsLink:
            hubData.googleMapsLink === "null"
              ? ""
              : (hubData.googleMapsLink ?? ""),
          wellnessHubImg: parsedImages,
          status: hubData.status ?? "active",
        });

        if (
          hubData.operatingHours &&
          hubData.operatingHours !== "null" &&
          hubData.operatingHours !== ""
        ) {
          try {
            const parsedHours = JSON.parse(hubData.operatingHours);
            setOperatingHoursObj((prev) => ({ ...prev, ...parsedHours }));
          } catch (e) {
            console.log("operatingHours text parsing skipped");
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
        // หากโหลดข้อมูลเริ่มต้นล้มเหลว ให้กลับไปหน้า List พร้อมส่ง State ข้อผิดพลาดไปพ่นแจ้งเตือน
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

  const handleCertificateInputChange = (index, value) => {
    setFormData((prev) => {
      const updatedCerts = [...(prev.certificateType || [""])];
      updatedCerts[index] = value;
      return { ...prev, certificateType: updatedCerts };
    });
  };

  const handleAddCertificateField = () => {
    setFormData((prev) => ({
      ...prev,
      certificateType: [...(prev.certificateType || [""]), ""],
    }));
  };

  const handleRemoveCertificateField = (indexToRemove) => {
    setFormData((prev) => {
      const currentCerts = prev.certificateType || [""];
      const updatedCerts = currentCerts.filter(
        (_, index) => index !== indexToRemove,
      );
      return {
        ...prev,
        certificateType: updatedCerts.length === 0 ? [""] : updatedCerts,
      };
    });
  };

  const handleMultipleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const allowedExtensions = /(\.png|\.jpg|\.jpeg)$/i;
    const maxSize = 20 * 1024 * 1024;
    const validFiles = [];

    for (let file of files) {
      if (!allowedExtensions.exec(file.name)) {
        alert(
          `ไฟล์ ${file.name} ไม่รองรับ: ต้องเป็น .png, .jpg และ .jpeg เท่านั้น`,
        );
        continue;
      }
      if (file.size > maxSize) {
        alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป: ขนาดไฟล์ต้องไม่เกิน 20 MB`);
        continue;
      }
      validFiles.push(file);
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          wellnessHubImg: [...(prev.wellnessHubImg || []), reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      wellnessHubImg: (prev.wellnessHubImg || []).filter(
        (_, index) => index !== indexToRemove,
      ),
    }));
  };

  const handleDayToggle = (dayKey) => {
    setOperatingHoursObj((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], active: !prev[dayKey].active },
    }));
  };

  const handleTimeChange = (dayKey, fieldType, value) => {
    setOperatingHoursObj((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [fieldType]: value },
    }));
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

    const desc = formData.wellnessHubDescription
      ? String(formData.wellnessHubDescription).trim()
      : "";
    if (desc !== "") {
      if (desc.length < 10 || desc.length > 255) {
        newErrors.wellnessHubDescription =
          "รายละเอียดบริการต้องมีความยาวอย่างน้อย 10 ตัวอักษร และไม่เกิน 255 ตัวอักษร";
      }
    }

    let finalContactInfo = null;
    if (formData.contactValue && formData.contactValue.trim() !== "") {
      const combinedText = `${formData.contactPlatform}: ${formData.contactValue.trim()}`;
      if (combinedText.length < 3 || combinedText.length > 255) {
        newErrors.contactValue =
          "ข้อมูลติดต่อเพิ่มเติมรวมชื่อแพลตฟอร์มต้องมีความยาว 3-255 ตัวอักษร";
      } else {
        finalContactInfo = combinedText;
      }
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

    const cleanedCertificates = (formData.certificateType || [])
      .map((cert) => (cert || "").trim())
      .filter((cert) => cert !== "");

    setIsLoading(true); // เปิดหน้า Loading สั้นๆ ขณะทำโครงข่ายคำขอ

    const payload = {
      licenseId: formData.licenseId,
      wellnessHubName: formData.wellnessHubName,
      telInformation: tel,
      wellnessHubDescription: desc,
      certificateType:
        cleanedCertificates.length > 0
          ? JSON.stringify(cleanedCertificates)
          : null,
      contactInformation: finalContactInfo,
      address: formData.address ? formData.address : null,
      googleMapsLink: formData.googleMapsLink ? formData.googleMapsLink : null,
      wellnessHubImg:
        (formData.wellnessHubImg || []).length > 0
          ? JSON.stringify(formData.wellnessHubImg)
          : null,
      operatingHours: JSON.stringify(operatingHoursObj),
      status: formData.status,

      // 🌟 หมวดหมู่ (Category) ส่งเป็น String เสมอ
      category: formData.categoryId && String(formData.categoryId).trim() !== ""
        ? { categoryId: String(formData.categoryId).trim() }
        : null,
        
      // 🌟 อำเภอ (District) ส่งเป็นตัวเลข Integer โดยใช้ parseInt ตามเดิม
      district: formData.districtId && String(formData.districtId).trim() !== ""
        ? { districtId: parseInt(formData.districtId, 10) }
        : null,
    };
    try {
      await axiosInstance.put(
        `http://localhost:8080/api/wellness-hubs/${id}`,
        payload,
      );
      setIsLoading(false); // 🌟 ปิดโหลดข้อมูลทันทีกันค้าง

      // 🚀 วิ่งไปหน้ารายชื่อทันทีพร้อมแนบ State ไปสั่งเปิดป๊อปอัพแจ้งเตือนสำเร็จ
      navigate("/listWellnesshub", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: "แก้ไขและลงรับข้อมูลในตารางกลางเสร็จสิ้น",
        },
      });
    } catch (error) {
      setIsLoading(false); // 🌟 บล็อกล่มให้ปิดสวิตช์โหลดเช่นกัน ป้องกันแอปค้างหมุนวน

      // ล้มเหลวก็เตะไปหน้า List และแจ้งป๊อปอัพสีแดงเตือนแอดมิน
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

  return (
    <div className="admin-layout">
      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span>Admin Panel</span>
          </div>
          <div className="user-profile-box">
            <div className="user-info">
              <span className="user-label">ผู้ใช้งานปัจจุบัน:</span>
              <span className="user-name">{adminName}</span>
            </div>
          </div>
          <p className="menu-label">เมนูหลัก</p>
          <Link to="/admin/dashboard" className="menu-item">
            แผงควบคุมหลัก
          </Link>
          <Link to="/admin/requests" className="menu-item">
            ตรวจสอบคำขอสิทธิ์
          </Link>
          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/admin/routes" className="menu-item">
            จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnesshub" className="menu-item active">
            จัดการสถานประกอบการ
          </Link>
          <Link to="/admin/articles" className="menu-item">
            จัดการบทความ
          </Link>
        </div>
        <button
          className="btn-sidebar-logout"
          onClick={() => navigate("/login")}
        >
          ออกจากระบบ
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
                <span>1</span> ข้อมูลพื้นฐานในระบบสารสนเทศ
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>เลขใบอนุญาตประกอบกิจการ</label>
                  <input
                    type="text"
                    name="licenseId"
                    value={formData.licenseId}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>ชื่อสถานประกอบการ*</label>
                  <input
                    type="text"
                    name="wellnessHubName"
                    value={formData.wellnessHubName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>หมวดหมู่บริการหลัก*</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- เลือกประเภทรายการ --</option>
                    {(categories || []).map((cat) => (
                      <option
                        key={cat.categoryId}
                        value={String(cat.categoryId)}
                      >
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  ประเภทใบรับรองศูนย์เวลเนสประทับตรา (ระบุได้หลายรายการ)
                </label>
                <div className="certificate-fields-container">
                  {(formData.certificateType || [""]).map((cert, index) => (
                    <div
                      className="certificate-field-row animate-fade"
                      key={index}
                    >
                      <div className="cert-input-wrapper">
                        <FontAwesomeIcon
                          icon={faCertificate}
                          className="cert-field-icon"
                        />
                        <input
                          type="text"
                          value={cert || ""}
                          onChange={(e) =>
                            handleCertificateInputChange(index, e.target.value)
                          }
                          placeholder={`ระบุใบรับรองรายการที่ ${index + 1}`}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-delete-cert-field"
                        onClick={() => handleRemoveCertificateField(index)}
                        title="ลบช่องนี้"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-add-cert-field"
                  onClick={handleAddCertificateField}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    style={{ marginRight: "6px" }}
                  />{" "}
                  เพิ่มช่องใบรับรองใหม่
                </button>
              </div>

              <div className="section-heading">
                <span>2</span> รายละเอียดการติดต่อสื่อสาร
              </div>
              <div className="form-grid-2">
                <div
                  className={`form-group ${errors.telInformation ? "has-error" : ""}`}
                >
                  <label>หมายเลขโทรศัพท์ติดต่อ*</label>
                  <input
                    type="tel"
                    name="telInformation"
                    value={formData.telInformation}
                    onChange={handleChange}
                    required
                    style={
                      errors.telInformation ? { borderColor: "#dc3545" } : {}
                    }
                  />
                  {errors.telInformation && (
                    <span className="error-text-under">
                      {errors.telInformation}
                    </span>
                  )}
                </div>

                <div
                  className={`form-group ${errors.contactValue ? "has-error" : ""}`}
                >
                  <label>ช่องทางการติดต่อสื่อสารเพิ่มเติม</label>
                  <div className="gov-social-input-group">
                    <select
                      name="contactPlatform"
                      value={formData.contactPlatform}
                      onChange={handleChange}
                      className="gov-social-select"
                    >
                      <option value="Line">Line ID</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                    </select>
                    <input
                      type="text"
                      name="contactValue"
                      value={formData.contactValue}
                      onChange={handleChange}
                      placeholder="กรอกชื่อไอดีหรือลิงก์ปลายทาง..."
                      style={
                        errors.contactValue ? { borderColor: "#dc3545" } : {}
                      }
                    />
                  </div>
                  {errors.contactValue && (
                    <span className="error-text-under">
                      {errors.contactValue}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`form-group ${errors.wellnessHubDescription ? "has-error" : ""}`}
              >
                <label>
                  รายละเอียดการให้บริการสารประโยชน์ (Wellness Hub Description)
                </label>
                <textarea
                  name="wellnessHubDescription"
                  rows="3"
                  value={formData.wellnessHubDescription}
                  onChange={handleChange}
                  style={
                    errors.wellnessHubDescription
                      ? { borderColor: "#dc3545" }
                      : {}
                  }
                />
                {errors.wellnessHubDescription && (
                  <span className="error-text-under">
                    {errors.wellnessHubDescription}
                  </span>
                )}
              </div>

              <div className="section-heading">
                <span>3</span> ข้อมูลพิกัดและตำแหน่งที่ตั้งทางภูมิศาสตร์
              </div>
              <div className="form-group">
                <label>รายละเอียดที่อยู่ภูมิสำเนา (Address)*</label>
                <textarea
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>อำเภอที่ตั้งท้องที่*</label>
                  <select
                    name="districtId"
                    value={formData.districtId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- เลือกรายการอำเภอ --</option>
                    {(districts || []).map((dist) => (
                      <option
                        key={dist.districtId}
                        value={String(dist.districtId)}
                      >
                        {dist.districtName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ลิงก์ระบบพิกัดนำทาง Google Maps</label>
                  <div className="map-input-group">
                    <input
                      type="text"
                      name="googleMapsLink"
                      value={formData.googleMapsLink}
                      onChange={handleChange}
                    />
                    {formData.googleMapsLink && (
                      <a
                        href={formData.googleMapsLink}
                        className="btn-check-map"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ตรวจสอบพิกัด
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="section-heading">
                <span>4</span> กำหนดการวันและเวลา เปิด - ปิด ทำการ
              </div>
              <div className="gov-timetable-container">
                {daysOfWeek.map((day) => (
                  <div className="gov-timetable-row" key={day.key}>
                    <div className="gov-time-day-label">
                      <label className="gov-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={operatingHoursObj[day.key]?.active || false}
                          onChange={() => handleDayToggle(day.key)}
                        />
                        <span className="gov-custom-checkbox"></span>
                        <span className="gov-day-text">{day.label}</span>
                      </label>
                    </div>
                    <div className="gov-time-inputs-block">
                      <input
                        type="time"
                        value={operatingHoursObj[day.key]?.open || "10:00"}
                        disabled={!operatingHoursObj[day.key]?.active}
                        onChange={(e) =>
                          handleTimeChange(day.key, "open", e.target.value)
                        }
                        required={operatingHoursObj[day.key]?.active}
                      />
                      <span className="gov-time-to-text">ถึง</span>
                      <input
                        type="time"
                        value={operatingHoursObj[day.key]?.close || "22:00"}
                        disabled={!operatingHoursObj[day.key]?.active}
                        onChange={(e) =>
                          handleTimeChange(day.key, "close", e.target.value)
                        }
                        required={operatingHoursObj[day.key]?.active}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-heading">
                <span>5</span> แฟ้มภาพถ่ายหลักฐานสถานประกอบการ
              </div>
              <div className="gov-file-upload-block">
                <div className="form-group">
                  <label>
                    เลือกไฟล์รูปภาพใหม่ สามารถเลือกพร้อมกันได้หลายรูป (.png,
                    .jpg, .jpeg ไม่เกิน 20 MB ต่อไฟล์)
                  </label>
                  <input
                    type="file"
                    accept=".png, .jpg, .jpeg"
                    multiple
                    onChange={handleMultipleImageUpload}
                    className="gov-file-input"
                  />
                </div>
                {formData.wellnessHubImg &&
                  formData.wellnessHubImg.length > 0 && (
                    <div className="gallery-grid">
                      {formData.wellnessHubImg.map((imgUrl, index) => (
                        <div className="gallery-item animate-fade" key={index}>
                          <img
                            src={imgUrl}
                            alt={`wellness-hub-preview-${index}`}
                          />
                          <button
                            type="button"
                            className="btn-remove-img"
                            onClick={() => handleRemoveImage(index)}
                            title="ลบรูปภาพนี้"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
