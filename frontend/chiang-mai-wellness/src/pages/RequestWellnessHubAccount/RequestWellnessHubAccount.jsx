import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { Link, useNavigate, useParams } from "react-router-dom";

import "./RequestWellnessHubAccount.css";

const API_BASE_URL = "http://localhost:8080/api";

const MAX_COVER_SIZE = 5 * 1024 * 1024;

const MAX_GALLERY_SIZE = 5 * 1024 * 1024;

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const MAX_GALLERY_IMAGES = 4;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const DAYS = [
  {
    key: "monday",
    label: "วันจันทร์",
  },
  {
    key: "tuesday",
    label: "วันอังคาร",
  },
  {
    key: "wednesday",
    label: "วันพุธ",
  },
  {
    key: "thursday",
    label: "วันพฤหัสบดี",
  },
  {
    key: "friday",
    label: "วันศุกร์",
  },
  {
    key: "saturday",
    label: "วันเสาร์",
  },
  {
    key: "sunday",
    label: "วันอาทิตย์",
  },
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

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  const normalizedValue = String(value).trim();

  return (
    normalizedValue !== "" &&
    normalizedValue !== "null" &&
    normalizedValue !== "undefined" &&
    normalizedValue !== "#ERROR!"
  );
}

function parseJsonValue(value) {
  if (!hasValue(value)) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeOperatingHours(value) {
  const parsedValue = parseJsonValue(value);

  const defaultHours = createDefaultOperatingHours();

  if (!parsedValue || Array.isArray(parsedValue)) {
    return defaultHours;
  }

  DAYS.forEach((day) => {
    const source = parsedValue[day.key];

    if (source) {
      defaultHours[day.key] = {
        active: Boolean(source.active),
        open: source.open || "09:00",
        close: source.close || "18:00",
      };
    }
  });

  return defaultHours;
}

function normalizeCertificateType(value) {
  if (!hasValue(value)) {
    return "-";
  }

  const parsedValue = parseJsonValue(value);

  if (Array.isArray(parsedValue)) {
    return parsedValue.filter(hasValue).join(", ");
  }

  return String(value);
}

function normalizeImageSource(value) {
  if (!hasValue(value)) {
    return "";
  }

  let imageValue = value;

  if (typeof imageValue === "string") {
    const trimmedValue = imageValue.trim();

    try {
      const parsedValue = JSON.parse(trimmedValue);

      imageValue = Array.isArray(parsedValue)
        ? parsedValue[0] || ""
        : trimmedValue;
    } catch (error) {
      imageValue = trimmedValue;
    }
  }

  if (Array.isArray(imageValue)) {
    imageValue = imageValue[0] || "";
  }

  if (!hasValue(imageValue)) {
    return "";
  }

  const normalizedValue = String(imageValue).trim();

  if (
    normalizedValue.startsWith("data:image/") ||
    normalizedValue.startsWith("http://") ||
    normalizedValue.startsWith("https://") ||
    normalizedValue.startsWith("blob:")
  ) {
    return normalizedValue;
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(normalizedValue)) {
    return `data:image/jpeg;base64,${normalizedValue}`;
  }

  return normalizedValue;
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
    "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function RequestWellnessHubAccount() {
  const { licenseId } = useParams();

  const navigate = useNavigate();

  const coverInputRef = useRef(null);

  const galleryInputRef = useRef(null);

  const documentInputRef = useRef(null);

  const [hub, setHub] = useState(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [loadError, setLoadError] = useState("");

  const [formErrors, setFormErrors] = useState({});

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [coverFile, setCoverFile] = useState(null);

  const [coverPreview, setCoverPreview] = useState("");

  const [galleryImages, setGalleryImages] = useState([]);

  const [verificationDocument, setVerificationDocument] = useState(null);

  const [operatingHours, setOperatingHours] = useState(
    createDefaultOperatingHours(),
  );

  const [formData, setFormData] = useState({
    address: "",
    googleMapsLink: "",
    tellInformation: "",
    contactInformation: "",
    wellnessHubDescription: "",
    requesterName: "",
    userEmail: "",
  });

  const normalizedLicenseId = useMemo(() => Number(licenseId), [licenseId]);

  const loadWellnessHub = useCallback(async () => {
    if (!Number.isInteger(normalizedLicenseId) || normalizedLicenseId <= 0) {
      setLoadError("รหัสสถานประกอบการไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/home/wellness-hubs/${normalizedLicenseId}`,
        {
          timeout: 30000,
        },
      );

      const data = response.data;

      if (!data || !data.licenseId) {
        throw new Error("ไม่พบข้อมูลสถานประกอบการ");
      }

      setHub(data);

      setFormData({
        address: data.address || "",
        googleMapsLink: data.googleMapsLink || "",
        tellInformation: data.telInformation || data.tellInformation || "",
        contactInformation: data.contactInformation || "",
        wellnessHubDescription: data.wellnessHubDescription || "",
        requesterName: "",
        userEmail: "",
      });

      setOperatingHours(normalizeOperatingHours(data.operatingHours));

      setCoverPreview(normalizeImageSource(data.wellnessHubImg));
    } catch (error) {
      setHub(null);
      setLoadError(error.message || getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [normalizedLicenseId]);

  useEffect(() => {
    loadWellnessHub();
  }, [loadWellnessHub]);

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

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        coverFile: "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
      }));
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        coverFile: "รูปหน้าปกต้องมีขนาดไม่เกิน 5 MB",
      }));
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);

      setCoverFile(file);
      setCoverPreview(preview);

      setFormErrors((previousErrors) => ({
        ...previousErrors,
        coverFile: "",
      }));
    } catch (error) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        coverFile: "ไม่สามารถอ่านรูปภาพได้",
      }));
    }
  };

  const handleGalleryChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;

    if (remainingSlots <= 0) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        galleryImages: "เพิ่มรูปบรรยากาศได้สูงสุด 6 รูป",
      }));
      return;
    }

    const acceptedFiles = selectedFiles
      .filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type))
      .filter((file) => file.size <= MAX_GALLERY_SIZE)
      .slice(0, remainingSlots);

    if (acceptedFiles.length !== selectedFiles.length) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        galleryImages:
          "บางไฟล์ไม่ถูกเพิ่ม เนื่องจากชนิดไฟล์ไม่รองรับ ขนาดเกิน 5 MB หรือเกินจำนวนสูงสุด",
      }));
    } else {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        galleryImages: "",
      }));
    }

    const newImages = await Promise.all(
      acceptedFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: await readFileAsDataUrl(file),
      })),
    );

    setGalleryImages((previousImages) => [...previousImages, ...newImages]);
  };

  const removeGalleryImage = (imageId) => {
    setGalleryImages((previousImages) =>
      previousImages.filter((image) => image.id !== imageId),
    );
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        verificationDocument: "เอกสารต้องเป็นไฟล์ PDF, JPG หรือ PNG",
      }));
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        verificationDocument: "ไฟล์เอกสารต้องมีขนาดไม่เกิน 10 MB",
      }));
      return;
    }

    setVerificationDocument(file);

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      verificationDocument: "",
    }));
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
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        operatingHours: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.address.trim()) {
      errors.address = "กรุณาระบุที่อยู่";
    }

    if (!formData.googleMapsLink.trim()) {
      errors.googleMapsLink = "กรุณาระบุลิงก์ Google Maps";
    } else if (!/^https?:\/\//i.test(formData.googleMapsLink.trim())) {
      errors.googleMapsLink =
        "ลิงก์ Google Maps ต้องขึ้นต้นด้วย http:// หรือ https://";
    }

    if (!formData.tellInformation.trim()) {
      errors.tellInformation = "กรุณาระบุเบอร์โทรศัพท์";
    } else if (!/^[0-9+\-\s()]{8,20}$/.test(formData.tellInformation.trim())) {
      errors.tellInformation = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง";
    }

    if (!formData.wellnessHubDescription.trim()) {
      errors.wellnessHubDescription = "กรุณาระบุรายละเอียดบริการ";
    }

    if (!formData.requesterName.trim()) {
      errors.requesterName = "กรุณาระบุชื่อผู้ยื่นคำขอ";
    }

    if (!formData.userEmail.trim()) {
      errors.userEmail = "กรุณาระบุอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.userEmail.trim())) {
      errors.userEmail = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!verificationDocument) {
      errors.verificationDocument = "กรุณาแนบเอกสารยืนยันสิทธิ์";
    }

    const activeDays = Object.entries(operatingHours).filter(
      ([, detail]) => detail.active,
    );

    activeDays.forEach(([dayKey, detail]) => {
      if (!detail.open || !detail.close) {
        errors.operatingHours =
          "วันที่เปิดให้บริการต้องระบุเวลาเปิดและเวลาปิดให้ครบ";
      } else if (detail.open >= detail.close) {
        const dayLabel = DAYS.find((day) => day.key === dayKey)?.label;

        errors.operatingHours = `เวลาเปิดของ${dayLabel}ต้องน้อยกว่าเวลาปิด`;
      }
    });

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const coverImage = coverFile
        ? await readFileAsDataUrl(coverFile)
        : coverPreview;

      const galleryImageValues = galleryImages.map((image) => image.preview);

      const documentValue = await readFileAsDataUrl(verificationDocument);

      const payload = {
        licenseId: hub.licenseId,
        categoryId: hub.categoryId,
        districtId: hub.districtId,

        requesterName: formData.requesterName.trim(),
        userEmail: formData.userEmail.trim(),

        wellnessHubName: hub.wellnessHubName,

        tellInformation: formData.tellInformation.trim(),
        contactInformation: formData.contactInformation.trim(),
        address: formData.address.trim(),
        googleMapsLink: formData.googleMapsLink.trim(),
        wellnessHubDescription: formData.wellnessHubDescription.trim(),

        operatingHours: JSON.stringify(operatingHours),

        wellnessHubLatitude: hub.latitude || null,
        wellnessHubLongitude: hub.longitude || null,

        wellnessHubImg: coverImage || "",
        wellnessHubGallery: JSON.stringify(galleryImageValues),

        certificateType: hub.certificateType || "",

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
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        submit: getErrorMessage(error),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="request-account-page">
        <div className="request-account-container request-account-container--state">
          <section className="request-account-state">
            <LoaderCircle className="request-account-spinner" />

            <h1>กำลังโหลดข้อมูลสถานประกอบการ</h1>

            <p>กรุณารอสักครู่ ระบบกำลังเตรียมข้อมูลสำหรับการยื่นคำขอ</p>
          </section>
        </div>
      </main>
    );
  }

  if (loadError || !hub) {
    return (
      <main className="request-account-page">
        <div className="request-account-container request-account-container--state">
          <section className="request-account-state">
            <CircleAlert />

            <h1>ไม่สามารถเปิดแบบฟอร์มได้</h1>

            <p>{loadError || "ไม่พบข้อมูลสถานประกอบการ"}</p>

            <div className="request-account-state__actions">
              <button type="button" onClick={loadWellnessHub}>
                <RefreshCw />
                ลองใหม่
              </button>

              <Link to="/">
                <ArrowLeft />
                กลับหน้าแรก
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

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

              <h1>ขอสิทธิ์ดูแลสถานประกอบการ</h1>

              <p className="request-account-hero__description">
                ตรวจสอบข้อมูลให้ถูกต้อง แนบหลักฐานยืนยันสิทธิ์
                และส่งคำขอให้ผู้ดูแลระบบพิจารณา
              </p>
            </div>

            <div className="request-account-hero__hub">
              <Building2 />

              <div>
                <span>สถานประกอบการที่กำลังยื่นคำขอ</span>

                <strong>{hub.wellnessHubName}</strong>

                <p>ใบอนุญาต {hub.licenseId}</p>
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
                <h2>ขั้นตอนการยื่นคำขอ</h2>
              </div>
            </div>

            <div className="request-account-progress__list">
              <div className="request-account-progress__item">
                <span>01</span>

                <div>
                  <strong>ข้อมูลในระบบ</strong>
                  <p>ตรวจสอบข้อมูลพื้นฐาน</p>
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
                  <strong>ยืนยันตัวตน</strong>
                  <p>ข้อมูลผู้ยื่นและเอกสาร</p>
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

            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>01</span>

                <div>
                  <h2>ข้อมูลพื้นฐานในระบบ</h2>

                  <p>ข้อมูลจากฐานข้อมูล ใช้สำหรับระบุตัวสถานประกอบการ</p>
                </div>
              </div>

              <div className="request-account-system-info">
                <LockKeyhole className="request-account-system-info__lock" />

                <div className="request-account-system-info__item">
                  <span>ชื่อสถานประกอบการ</span>
                  <strong>{hub.wellnessHubName}</strong>
                </div>

                <div className="request-account-system-info__item">
                  <span>เลขที่ใบอนุญาต</span>
                  <strong>{hub.licenseId}</strong>
                </div>

                <div className="request-account-system-info__item">
                  <span>ประเภทใบรับรอง</span>
                  <strong>
                    {normalizeCertificateType(hub.certificateType)}
                  </strong>
                </div>

                <div className="request-account-system-info__item">
                  <span>หมวดหมู่</span>
                  <strong>{hub.categoryName || "-"}</strong>
                </div>
              </div>
            </section>

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
                      เปลี่ยนรูป
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
                    ที่อยู่
                    <em>*</em>
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
                    ลิงก์ Google Maps
                    <em>*</em>
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
                    เบอร์โทรศัพท์
                    <em>*</em>
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
                    รายละเอียดบริการ
                    <em>*</em>
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

            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>04</span>

                <div>
                  <h2>วันและเวลาทำการ</h2>

                  <p>เลือกเฉพาะวันที่เปิดให้บริการและระบุเวลาให้ถูกต้อง</p>
                </div>
              </div>

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
                          handleTimeChange(day.key, "open", event.target.value)
                        }
                      />

                      <input
                        type="time"
                        value={detail.close}
                        disabled={!detail.active}
                        onChange={(event) =>
                          handleTimeChange(day.key, "close", event.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>

              {formErrors.operatingHours && (
                <p className="request-account-field-error">
                  {formErrors.operatingHours}
                </p>
              )}
            </section>

            <section className="request-account-section">
              <div className="request-account-section__heading">
                <span>05</span>

                <div>
                  <h2>ผู้ยื่นคำขอและหลักฐานยืนยัน</h2>

                  <p>ใช้สำหรับตรวจสอบสิทธิ์และติดต่อกลับหลังการพิจารณา</p>
                </div>
              </div>

              <div className="request-account-fields">
                <div className="request-account-field">
                  <label htmlFor="requesterName">
                    ชื่อ–นามสกุลผู้ยื่นคำขอ
                    <em>*</em>
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
                    อีเมลสำหรับรับบัญชีใช้งาน
                    <em>*</em>
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

                <div className="request-account-field request-account-field--full">
                  <label>
                    ใบอนุญาตหรือเอกสารยืนยันสิทธิ์
                    <em>*</em>
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
                      ส่งคำขอให้ตรวจสอบ
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
