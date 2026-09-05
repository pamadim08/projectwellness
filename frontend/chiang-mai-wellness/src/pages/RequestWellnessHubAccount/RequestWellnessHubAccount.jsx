import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./RequestWellnessHubAccount.css";

const API_BASE_URL = "http://localhost:8080/api";
const MAX_COVER_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 4;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const DAYS = [
  { key: "monday", label: "วันจันทร์" },
  { key: "tuesday", label: "วันอังคาร" },
  { key: "wednesday", label: "วันพุธ" },
  { key: "thursday", label: "วันพฤหัสบดี" },
  { key: "friday", label: "วันศุกร์" },
  { key: "saturday", label: "วันเสาร์" },
  { key: "sunday", label: "วันอาทิตย์" },
];

function createDefaultOperatingHours() {
  return DAYS.reduce((result, day, index) => {
    result[day.key] = {
      active: index < 6,
      open: index < 6 ? "09:00" : "",
      close: index < 6 ? "18:00" : "",
    };
    return result;
  }, {});
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
    reader.readAsDataURL(file);
  });
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data ||
    "ไม่สามารถส่งคำขอได้ กรุณาลองใหมู่อีกครั้ง"
  );
}

export default function RequestWellnessHubAccount() {
  const navigate = useNavigate();

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [verificationDocument, setVerificationDocument] = useState(null);

  const [is24Hours, setIs24Hours] = useState(false);
  const [operatingHours, setOperatingHours] = useState(
    createDefaultOperatingHours(),
  );

  const [formData, setFormData] = useState({
    // ผู้สมัคร
    requesterName: "",
    userEmail: "",
    contactInformation: "",
    tellInformation: "",

    // บัญชีผู้ใช้
    username: "",
    password: "",

    // สถานประกอบการ
    licenseId: "",
    wellnessHubName: "",
    address: "",
    googleMapsLink: "",
    wellnessHubDescription: "",

    // หมวดหมู่ / พื้นที่
    categoryId: "",
    districtId: "",

    // ข้อมูลเพิ่มเติม
    certificateType: "",
  });

  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [categoriesRes, districtsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/categories`),
          axios.get(`${API_BASE_URL}/districts`),
        ]);
        setCategories(categoriesRes.data || []);
        setDistricts(districtsRes.data || []);
      } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลหมวดหมู่หรืออำเภอได้", error);
      }
    };

    fetchMasterData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        [name]: "",
      }));
    }
  };

  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        coverFile: "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
      }));
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setFormErrors((prev) => ({
        ...prev,
        coverFile: "รูปหน้าปกต้องมีขนาดไม่เกิน 5 MB",
      }));
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setCoverFile(file);
      setCoverPreview(preview);
      setFormErrors((prev) => ({ ...prev, coverFile: "" }));
    } catch (error) {
      setFormErrors((prev) => ({
        ...prev,
        coverFile: "ไม่สามารถอ่านรูปภาพได้",
      }));
    }
  };

  const handleGalleryChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;
    if (remainingSlots <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        galleryImages: `เพิ่มรูปบรรยากาศได้สูงสุด ${MAX_GALLERY_IMAGES} รูป`,
      }));
      return;
    }

    const acceptedFiles = selectedFiles
      .filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type))
      .filter((file) => file.size <= MAX_GALLERY_SIZE)
      .slice(0, remainingSlots);

    if (acceptedFiles.length !== selectedFiles.length) {
      setFormErrors((prev) => ({
        ...prev,
        galleryImages:
          "บางไฟล์ไม่ถูกเพิ่ม เนื่องจากชนิดไฟล์ไม่รองรับ ขนาดเกิน 5 MB หรือเกินจำนวนสูงสุด",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, galleryImages: "" }));
    }

    const newImages = await Promise.all(
      acceptedFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: await readFileAsDataUrl(file),
      })),
    );

    setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const removeGalleryImage = (imageId) => {
    setGalleryImages((prev) => prev.filter((image) => image.id !== imageId));
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        verificationDocument: "เอกสารต้องเป็นไฟล์ PDF, JPG หรือ PNG",
      }));
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setFormErrors((prev) => ({
        ...prev,
        verificationDocument: "ไฟล์เอกสารต้องมีขนาดไม่เกิน 10 MB",
      }));
      return;
    }

    setVerificationDocument(file);
    setFormErrors((prev) => ({ ...prev, verificationDocument: "" }));
  };

  const handle24HoursToggle = (enabled) => {
    setIs24Hours(enabled);
    if (enabled) {
      const all24Hours = DAYS.reduce((result, day) => {
        result[day.key] = {
          active: true,
          open: "00:00",
          close: "23:59",
        };
        return result;
      }, {});
      setOperatingHours(all24Hours);
    } else {
      setOperatingHours(createDefaultOperatingHours());
    }
    if (formErrors.operatingHours) {
      setFormErrors((prev) => ({ ...prev, operatingHours: "" }));
    }
  };

  const handleDayToggle = (dayKey) => {
    setOperatingHours((previousHours) => {
      const currentDay = previousHours[dayKey];
      return {
        ...previousHours,
        [dayKey]: {
          ...currentDay,
          active: !currentDay.active,
          open: !currentDay.active ? currentDay.open || "09:00" : "",
          close: !currentDay.active ? currentDay.close || "18:00" : "",
        },
      };
    });
  };

  const handleTimeChange = (dayKey, field, value) => {
    setOperatingHours((previousHours) => ({
      ...previousHours,
      [dayKey]: {
        ...previousHours[dayKey],
        [field]: value,
      },
    }));

    if (formErrors.operatingHours) {
      setFormErrors((prev) => ({ ...prev, operatingHours: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // ผู้สมัคร
    if (!formData.requesterName.trim()) {
      errors.requesterName = "กรุณาระบุชื่อผู้ยื่นคำขอ";
    }

    if (!formData.userEmail.trim()) {
      errors.userEmail = "กรุณาระบุอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.userEmail.trim())) {
      errors.userEmail = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!formData.tellInformation.trim()) {
      errors.tellInformation = "กรุณาระบุเบอร์โทรศัพท์";
    } else if (!/^[0-9+\-\s()]{8,20}$/.test(formData.tellInformation.trim())) {
      errors.tellInformation = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง";
    }

    // ข้อมูลบัญชีผู้ใช้
    const username = formData.username.trim();
    if (!username) {
      errors.username = "กรุณาระบุชื่อผู้ใช้ (Username)";
    } else if (/\s/.test(username)) {
      errors.username = "ชื่อผู้ใช้ต้องไม่มีช่องว่าง";
    } else if (!/^[\x21-\x7E]{4,20}$/.test(username)) {
      errors.username =
        "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษ ความยาว 4–20 ตัวอักษร";
    }

    if (!formData.password.trim()) {
      errors.password = "กรุณาระบุรหัสผ่าน (Password)";
    } else if (/\s/.test(formData.password)) {
      errors.password = "รหัสผ่านต้องไม่มีช่องว่าง";
    } else if (!/^[\x21-\x7E]{8}$/.test(formData.password)) {
      errors.password =
        "รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษ ความยาว 8 ตัวอักษร";
    }

    // สถานประกอบการ
    if (!formData.wellnessHubName.trim()) {
      errors.wellnessHubName = "กรุณาระบุชื่อสถานประกอบการ";
    }

    if (!formData.licenseId.trim()) {
      errors.licenseId = "กรุณาระบุเลขที่ใบอนุญาต";
    }

    if (!formData.categoryId) {
      errors.categoryId = "กรุณาเลือกหมวดหมู่";
    }

    if (!formData.districtId) {
      errors.districtId = "กรุณาเลือกอำเภอ/พื้นที่";
    }

    if (!formData.address.trim()) {
      errors.address = "กรุณาระบุที่อยู่";
    }

    if (!formData.googleMapsLink.trim()) {
      errors.googleMapsLink = "กรุณาระบุลิงก์ Google Maps";
    } else if (!/^https?:\/\//i.test(formData.googleMapsLink.trim())) {
      errors.googleMapsLink =
        "ลิงก์ Google Maps ต้องขึ้นต้นด้วย http:// หรือ https://";
    }

    if (!formData.wellnessHubDescription.trim()) {
      errors.wellnessHubDescription = "กรุณาระบุรายละเอียดบริการ";
    }

    if (!verificationDocument) {
      errors.verificationDocument = "กรุณาแนบเอกสารยืนยันสิทธิ์";
    }

    if (!is24Hours) {
      const activeDays = Object.entries(operatingHours).filter(
        ([, detail]) => detail.active,
      );

      if (activeDays.length === 0) {
        errors.operatingHours =
          "กรุณาเลือกวันเปิดให้บริการอย่างน้อย 1 วัน หรือเปิดบริการ 24 ชั่วโมง";
      }

      activeDays.forEach(([dayKey, detail]) => {
        if (!detail.open || !detail.close) {
          errors.operatingHours =
            "วันที่เปิดให้บริการต้องระบุเวลาเปิดและเวลาปิดให้ครบ";
        } else if (detail.open >= detail.close) {
          const dayLabel = DAYS.find((day) => day.key === dayKey)?.label;
          errors.operatingHours = `เวลาเปิดของ${dayLabel}ต้องน้อยกว่าเวลาปิด`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validateForm()) {
      return;
    }

    setSubmitting(true);

    const name = formData.wellnessHubName.trim();
    const gmapsLink = formData.googleMapsLink.trim();
    const parsedCoords = parseLatLngFromGoogleMapsLink(gmapsLink);

    try {
      const existingHubsRes = await axios.get(`${API_BASE_URL}/wellness-hubs`);
      const existingHubs = Array.isArray(existingHubsRes.data) ? existingHubsRes.data : [];

      // 1) เช็กชื่อซ้ำ
      const isDuplicateName = existingHubs.some(
        (hub) => String(hub.wellnessHubName || "").trim().toLowerCase() === name.toLowerCase()
      );
      if (isDuplicateName) {
        setFormErrors((prev) => ({
          ...prev,
          wellnessHubName: "ชื่อสถานประกอบการนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น",
        }));
        setSubmitting(false);
        return;
      }

      // 2) เช็กพิกัด / ลิงก์ Google Maps ซ้ำ
      if (parsedCoords) {
        const isDuplicateLocation = existingHubs.some((hub) => {
          const sameLink = hub.googleMapsLink && String(hub.googleMapsLink).trim() === gmapsLink;
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
          setFormErrors((prev) => ({
            ...prev,
            googleMapsLink: "พิกัดแผนที่ หรือลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง",
          }));
          setSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.warn("⚠️ ไม่สามารถเช็กข้อมูลซ้ำล่วงหน้าได้:", err);
    }

    try {
      const coverImage = coverFile ? await readFileAsDataUrl(coverFile) : "";
      const galleryImageValues = galleryImages.map((image) => image.preview);
      const documentValue = await readFileAsDataUrl(verificationDocument);

      const payload = {
        licenseId: formData.licenseId.trim(),
        wellnessHubName: name,
        categoryId: formData.categoryId,
        districtId: formData.districtId,
        requesterName: formData.requesterName.trim(),
        userEmail: formData.userEmail.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),

        tellInformation: formData.tellInformation.trim(),
        contactInformation: formData.contactInformation.trim(),
        address: formData.address.trim(),
        googleMapsLink: gmapsLink,
        wellnessHubDescription: formData.wellnessHubDescription.trim(),

        operatingHours: JSON.stringify(operatingHours),

        wellnessHubLatitude: parsedCoords ? parsedCoords.lat : null,
        wellnessHubLongitude: parsedCoords ? parsedCoords.lng : null,

        wellnessHubImg: coverImage || "",
        wellnessHubGallery: JSON.stringify(galleryImageValues),

        certificateType: formData.certificateType.trim(),

        verificationDocuments: documentValue,
        verificationDocumentName: verificationDocument.name,
      };

      await axios.post(`${API_BASE_URL}/account-requests`, payload, {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      setShowSuccessModal(true);
    } catch (error) {
      setFormErrors((prev) => ({
        ...prev,
        submit: getErrorMessage(error),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="request-account-page">
      <header className="request-account-hero">
        <div className="request-account-container">
          <button
            type="button"
            className="request-account-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft />
            กลับหน้าก่อนหน้า
          </button>

          <div className="request-account-hero__layout">
            <div>
              <p className="request-account-eyebrow">WELLNESS HUB OWNERSHIP</p>
              <h1>ลงทะเบียนสถานประกอบการใหม่</h1>
              <p className="request-account-hero__description">
                กรอกข้อมูลสถานประกอบการ แนบหลักฐานยืนยันสิทธิ์
                และส่งคำขอให้ผู้ดูแลระบบพิจารณา
              </p>
            </div>

            <div className="request-account-hero__hub">
              <Building2 />
              <div>
                <span>สถานประกอบการใหม่</span>
                <strong>
                  {formData.wellnessHubName || "ระบุชื่อสถานประกอบการ"}
                </strong>
                <p>
                  {formData.licenseId
                    ? `ใบอนุญาต ${formData.licenseId}`
                    : "ยังไม่ได้ระบุเลขที่ใบอนุญาต"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="request-account-container request-account-content">
        <form
          className="request-account-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <aside className="request-account-progress">
            <div className="request-account-progress__header">
              <ShieldCheck />
              <div>
                <span>REQUEST FORM</span>
                <h2>ขั้นตอนการลงทะเบียน</h2>
              </div>
            </div>

            <div className="request-account-progress__list">
              <div className="request-account-progress__item">
                <span>01</span>
                <div>
                  <strong>ข้อมูลสถานประกอบการ</strong>
                  <p>ชื่อ เลขที่ใบอนุญาต หมวดหมู่</p>
                </div>
              </div>

              <div className="request-account-progress__line" />

              <div className="request-account-progress__item">
                <span>02</span>
                <div>
                  <strong>รูปภาพ</strong>
                  <p>รูปปกและบรรยากาศ</p>
                </div>
              </div>

              <div className="request-account-progress__line" />

              <div className="request-account-progress__item">
                <span>03</span>
                <div>
                  <strong>ข้อมูลติดต่อ</strong>
                  <p>ที่ตั้งและรายละเอียดบริการ</p>
                </div>
              </div>

              <div className="request-account-progress__line" />

              <div className="request-account-progress__item">
                <span>04</span>
                <div>
                  <strong>เวลาทำการ</strong>
                  <p>กำหนดวันและเวลาเปิด</p>
                </div>
              </div>

              <div className="request-account-progress__line" />

              <div className="request-account-progress__item">
                <span>05</span>
                <div>
                  <strong>ข้อมูลผู้ยื่นและบัญชี</strong>
                  <p>ข้อมูลส่วนตัวและเอกสารยืนยัน</p>
                </div>
              </div>
            </div>

            <div className="request-account-progress__notice">
              <LockKeyhole />
              <p>
                ข้อมูลและเอกสารจะถูกส่งให้ผู้ดูแลระบบตรวจสอบก่อนเปิดสิทธิ์ใช้งาน
              </p>
            </div>
          </aside>

          <div className="request-account-form-main">
            <section className="request-account-form-intro">
              <div>
                <p>BEFORE YOU SUBMIT</p>
                <h2>ตรวจสอบข้อมูลให้ครบก่อนส่งคำขอ</h2>
                <span>
                  ช่องที่มีเครื่องหมาย <strong>*</strong> จำเป็นต้องกรอก
                </span>
              </div>
              <ShieldCheck />
            </section>

            {/* ส่วนที่ 01: ข้อมูลสถานประกอบการ */}
            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>01</span>
                <div>
                  <h2>ข้อมูลสถานประกอบการ</h2>
                  <p>ระบุข้อมูลหลักของสถานประกอบการและประเภทธุรกิจ</p>
                </div>
              </div>

              <div className="request-account-fields">
                <div className="request-account-field">
                  <label htmlFor="wellnessHubName">
                    ชื่อสถานประกอบการ <em>*</em>
                  </label>
                  <input
                    id="wellnessHubName"
                    name="wellnessHubName"
                    type="text"
                    value={formData.wellnessHubName}
                    onChange={handleInputChange}
                    placeholder="เช่น นวดแผนไทย เชียงใหม่"
                    className={
                      formErrors.wellnessHubName
                        ? "request-account-input--error"
                        : ""
                    }
                  />
                  {formErrors.wellnessHubName && (
                    <p className="request-account-field-error">
                      {formErrors.wellnessHubName}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="licenseId">
                    เลขที่ใบอนุญาต <em>*</em>
                  </label>
                  <input
                    id="licenseId"
                    name="licenseId"
                    type="text"
                    value={formData.licenseId}
                    onChange={handleInputChange}
                    placeholder="เช่น 5001234567"
                    className={
                      formErrors.licenseId ? "request-account-input--error" : ""
                    }
                  />
                  {formErrors.licenseId && (
                    <p className="request-account-field-error">
                      {formErrors.licenseId}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="categoryId">
                    หมวดหมู่ <em>*</em>
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className={
                      formErrors.categoryId
                        ? "request-account-input--error"
                        : ""
                    }
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map((cat) => (
                      <option
                        key={cat.categoryId || cat.id}
                        value={cat.categoryId || cat.id}
                      >
                        {cat.categoryName || cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p className="request-account-field-error">
                      {formErrors.categoryId}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="districtId">
                    อำเภอ / พื้นที่ <em>*</em>
                  </label>
                  <select
                    id="districtId"
                    name="districtId"
                    value={formData.districtId}
                    onChange={handleInputChange}
                    className={
                      formErrors.districtId
                        ? "request-account-input--error"
                        : ""
                    }
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {districts.map((dist) => (
                      <option
                        key={dist.districtId || dist.id}
                        value={dist.districtId || dist.id}
                      >
                        {dist.districtName || dist.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.districtId && (
                    <p className="request-account-field-error">
                      {formErrors.districtId}
                    </p>
                  )}
                </div>

                <div className="request-account-field request-account-field--full">
                  <label htmlFor="certificateType">
                    ประเภทใบรับรอง / มาตรฐาน
                  </label>
                  <input
                    id="certificateType"
                    name="certificateType"
                    type="text"
                    value={formData.certificateType}
                    onChange={handleInputChange}
                    placeholder="เช่น มาตรฐาน SHA Plus, นวดเพื่อสุขภาพ (สบส.)"
                  />
                </div>
              </div>
            </section>

            {/* ส่วนที่ 02: รูปภาพ */}
            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>02</span>
                <div>
                  <h2>รูปภาพสถานประกอบการ</h2>
                  <p>
                    เลือกรูปที่ช่วยให้ผู้ใช้งานเห็นบรรยากาศและสถานที่ได้ชัดเจน
                  </p>
                </div>
              </div>

              <div className="request-account-photo-layout">
                <div className="request-account-cover-group">
                  <div className="request-account-label-row">
                    <label>รูปหน้าปก</label>
                    <span>แนะนำภาพแนวนอน</span>
                  </div>

                  <button
                    type="button"
                    className="request-account-cover-upload"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {coverPreview ? (
                      <img src={coverPreview} alt="ตัวอย่างรูปหน้าปก" />
                    ) : (
                      <div className="request-account-upload-placeholder">
                        <ImagePlus />
                        <strong>เพิ่มรูปหน้าปก</strong>
                        <span>JPG, PNG หรือ WEBP</span>
                      </div>
                    )}

                    <span className="request-account-cover-upload__action">
                      <Upload />
                      {coverPreview ? "เปลี่ยนรูป" : "อัปโหลด"}
                    </span>
                  </button>

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handleCoverChange}
                  />

                  {formErrors.coverFile && (
                    <p className="request-account-field-error">
                      {formErrors.coverFile}
                    </p>
                  )}
                </div>

                <div className="request-account-gallery-group">
                  <div className="request-account-gallery-heading">
                    <label>รูปภาพบรรยากาศ</label>
                    <span>
                      {galleryImages.length}/{MAX_GALLERY_IMAGES} รูป
                    </span>
                  </div>

                  <div className="request-account-gallery">
                    {galleryImages.map((image) => (
                      <div
                        key={image.id}
                        className="request-account-gallery__item"
                      >
                        <img src={image.preview} alt={image.file.name} />
                        <button
                          type="button"
                          aria-label="ลบรูปภาพ"
                          onClick={() => removeGalleryImage(image.id)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}

                    {galleryImages.length < MAX_GALLERY_IMAGES && (
                      <button
                        type="button"
                        className="request-account-gallery__add"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <ImagePlus />
                        <span>เพิ่มรูปภาพ</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={handleGalleryChange}
                  />

                  {formErrors.galleryImages && (
                    <p className="request-account-field-error">
                      {formErrors.galleryImages}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ส่วนที่ 03: ที่ตั้งและช่องทางติดต่อ */}
            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>03</span>
                <div>
                  <h2>ที่ตั้งและช่องทางติดต่อ</h2>
                  <p>ข้อมูลส่วนนี้จะแสดงต่อผู้ใช้งานหลังคำขอได้รับอนุมัติ</p>
                </div>
              </div>

              <div className="request-account-fields">
                <div className="request-account-field request-account-field--full">
                  <label htmlFor="address">
                    ที่อยู่ <em>*</em>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                    className={
                      formErrors.address ? "request-account-input--error" : ""
                    }
                  />
                  {formErrors.address && (
                    <p className="request-account-field-error">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div className="request-account-field request-account-field--full">
                  <label htmlFor="googleMapsLink">
                    ลิงก์ Google Maps <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <MapPin />
                    <input
                      id="googleMapsLink"
                      name="googleMapsLink"
                      type="url"
                      value={formData.googleMapsLink}
                      onChange={handleInputChange}
                      placeholder="https://maps.app.goo.gl/..."
                      className={
                        formErrors.googleMapsLink
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.googleMapsLink && (
                    <p className="request-account-field-error">
                      {formErrors.googleMapsLink}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="tellInformation">
                    เบอร์โทรศัพท์ <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <Phone />
                    <input
                      id="tellInformation"
                      name="tellInformation"
                      type="tel"
                      value={formData.tellInformation}
                      onChange={handleInputChange}
                      placeholder="เช่น 0812345678"
                      className={
                        formErrors.tellInformation
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.tellInformation && (
                    <p className="request-account-field-error">
                      {formErrors.tellInformation}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="contactInformation">LINE ID / Facebook</label>
                  <input
                    id="contactInformation"
                    name="contactInformation"
                    type="text"
                    value={formData.contactInformation}
                    onChange={handleInputChange}
                    placeholder="ช่องทางติดต่อเพิ่มเติม"
                  />
                </div>

                <div className="request-account-field request-account-field--full">
                  <label htmlFor="wellnessHubDescription">
                    รายละเอียดบริการ <em>*</em>
                  </label>
                  <textarea
                    id="wellnessHubDescription"
                    name="wellnessHubDescription"
                    rows={5}
                    value={formData.wellnessHubDescription}
                    onChange={handleInputChange}
                    placeholder="อธิบายบริการ จุดเด่น และข้อมูลสำคัญของสถานประกอบการ"
                    className={
                      formErrors.wellnessHubDescription
                        ? "request-account-input--error"
                        : ""
                    }
                  />
                  {formErrors.wellnessHubDescription && (
                    <p className="request-account-field-error">
                      {formErrors.wellnessHubDescription}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ส่วนที่ 04: เวลาทำการ */}
            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>04</span>
                <div>
                  <h2>วันและเวลาทำการ</h2>
                  <p>
                    เลือกเฉพาะวันที่เปิดให้บริการและระบุเวลาให้ถูกต้อง
                    หรือเปิดบริการ 24 ชั่วโมง
                  </p>
                </div>
              </div>

              {/* 24 Hours Toggle Banner */}
              <div className="request-account-24hours-toggle">
                <div className="request-account-24hours-info">
                  <span className="request-account-24hours-title">
                    <Clock3 size={18} /> เปิดให้บริการตลอด 24 ชั่วโมง (ทุกวัน)
                  </span>
                  <p className="request-account-24hours-desc">
                    สำหรับสถานพยาบาล โรงพยาบาล หรือหน่วยบริการกู้ภัยฉุกเฉิน
                  </p>
                </div>
                <label
                  className="request-account-switch"
                  htmlFor="toggle-24hours"
                >
                  <input
                    id="toggle-24hours"
                    type="checkbox"
                    checked={is24Hours}
                    onChange={(e) => handle24HoursToggle(e.target.checked)}
                  />
                  <span />
                </label>
              </div>

              {!is24Hours ? (
                <div className="request-account-hours">
                  <div className="request-account-hours__header">
                    <span>วัน</span>
                    <span>เปิดบริการ</span>
                    <span>เวลาเปิด</span>
                    <span>เวลาปิด</span>
                  </div>

                  {DAYS.map((day) => {
                    const detail = operatingHours[day.key];
                    return (
                      <div
                        key={day.key}
                        className={
                          detail.active
                            ? "request-account-hours__row request-account-hours__row--active"
                            : "request-account-hours__row"
                        }
                      >
                        <strong>{day.label}</strong>

                        <label className="request-account-switch">
                          <input
                            type="checkbox"
                            checked={detail.active}
                            onChange={() => handleDayToggle(day.key)}
                          />
                          <span />
                        </label>

                        <input
                          type="time"
                          value={detail.open}
                          disabled={!detail.active}
                          onChange={(event) =>
                            handleTimeChange(
                              day.key,
                              "open",
                              event.target.value,
                            )
                          }
                        />

                        <input
                          type="time"
                          value={detail.close}
                          disabled={!detail.active}
                          onChange={(event) =>
                            handleTimeChange(
                              day.key,
                              "close",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="request-account-24hours-badge">
                  <span>
                    ✓ เปิดให้บริการตลอด 24 ชั่วโมงทุกวัน (จันทร์ - อาทิตย์)
                  </span>
                </div>
              )}

              {formErrors.operatingHours && (
                <p className="request-account-field-error">
                  {formErrors.operatingHours}
                </p>
              )}
            </section>

            {/* ส่วนที่ 05: ข้อมูลผู้ยื่นคำขอ บัญชีผู้ใช้ และเอกสารยืนยัน */}
            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>05</span>
                <div>
                  <h2>ผู้ยื่นคำขอและบัญชีผู้ใช้งาน</h2>
                  <p>
                    ใช้สำหรับสร้างบัญชีเข้าใช้งานและติดต่อกลับหลังการพิจารณา
                  </p>
                </div>
              </div>

              <div className="request-account-fields">
                <div className="request-account-field">
                  <label htmlFor="requesterName">
                    ชื่อ–นามสกุลผู้ยื่นคำขอ <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <UserRound />
                    <input
                      id="requesterName"
                      name="requesterName"
                      type="text"
                      value={formData.requesterName}
                      onChange={handleInputChange}
                      placeholder="ระบุชื่อและนามสกุลจริง"
                      className={
                        formErrors.requesterName
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.requesterName && (
                    <p className="request-account-field-error">
                      {formErrors.requesterName}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="userEmail">
                    อีเมลสำหรับรับผลการอนุมัติ <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <Mail />
                    <input
                      id="userEmail"
                      name="userEmail"
                      type="email"
                      value={formData.userEmail}
                      onChange={handleInputChange}
                      placeholder="example@email.com"
                      className={
                        formErrors.userEmail
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.userEmail && (
                    <p className="request-account-field-error">
                      {formErrors.userEmail}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="username">
                    ชื่อผู้ใช้ (Username) <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <UserRound />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      maxLength={20}
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="กำหนดชื่อผู้ใช้ (ภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษ 4–20 ตัวอักษร)"
                      className={
                        formErrors.username
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.username && (
                    <p className="request-account-field-error">
                      {formErrors.username}
                    </p>
                  )}
                </div>

                <div className="request-account-field">
                  <label htmlFor="password">
                    รหัสผ่าน (Password) <em>*</em>
                  </label>
                  <div className="request-account-input-icon">
                    <LockKeyhole />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="กำหนดรหัสผ่านเข้าสู่ระบบ (8 ตัวอักษร)"
                      maxLength={8}
                      className={
                        formErrors.password
                          ? "request-account-input--error"
                          : ""
                      }
                    />
                  </div>
                  {formErrors.password && (
                    <p className="request-account-field-error">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div className="request-account-field request-account-field--full">
                  <label>
                    ใบอนุญาตหรือเอกสารยืนยันสิทธิ์ <em>*</em>
                  </label>
                  <button
                    type="button"
                    className={
                      verificationDocument
                        ? "request-account-document request-account-document--selected"
                        : "request-account-document"
                    }
                    onClick={() => documentInputRef.current?.click()}
                  >
                    <div className="request-account-document__icon">
                      {verificationDocument ? <FileCheck2 /> : <FileText />}
                    </div>

                    <div className="request-account-document__content">
                      <strong>
                        {verificationDocument
                          ? verificationDocument.name
                          : "เลือกไฟล์หลักฐานยืนยันสิทธิ์"}
                      </strong>
                      <span>PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB</span>
                    </div>

                    <Upload />
                  </button>

                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    hidden
                    onChange={handleDocumentChange}
                  />

                  {verificationDocument && (
                    <button
                      type="button"
                      className="request-account-document-remove"
                      onClick={() => setVerificationDocument(null)}
                    >
                      <X />
                      นำไฟล์ออก
                    </button>
                  )}

                  {formErrors.verificationDocument && (
                    <p className="request-account-field-error">
                      {formErrors.verificationDocument}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {formErrors.submit && (
              <div className="request-account-submit-error" role="alert">
                <CircleAlert />
                {formErrors.submit}
              </div>
            )}

            <div className="request-account-form-actions">
              <div>
                <strong>พร้อมส่งคำขอแล้ว?</strong>
                <span>กรุณาตรวจสอบข้อมูลและเอกสารอีกครั้งก่อนส่ง</span>
              </div>

              <div className="request-account-form-actions__buttons">
                <button
                  type="button"
                  className="request-account-cancel-button"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="request-account-submit-button"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="request-account-button-spinner" />
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    <>
                      <Send />
                      ส่งข้อมูลลงทะเบียน
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showSuccessModal && (
        <div
          className="request-account-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-success-title"
        >
          <div className="request-account-modal">
            <div className="request-account-modal__icon">
              <CheckCircle2 />
            </div>

            <p className="request-account-modal__eyebrow">REQUEST RECEIVED</p>
            <h2 id="request-success-title">ส่งคำขอเรียบร้อยแล้ว</h2>

            <p>
              ผู้ดูแลระบบจะตรวจสอบข้อมูลและเอกสาร และส่งผลการพิจารณาไปยัง
              <strong> {formData.userEmail}</strong>
            </p>

            <div className="request-account-modal__notice">
              โดยปกติใช้เวลาตรวจสอบประมาณ 1–3 วัน
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/");
              }}
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
