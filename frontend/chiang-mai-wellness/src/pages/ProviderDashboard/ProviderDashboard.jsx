// src/pages/ProviderDashboard/ProviderDashboard.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Eye,
  ImageIcon,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
  ZoomIn,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import LoadingState from "../../Components/LoadingState/LoadingState";
import "./ProviderDashboard.css";

const API_BASE_URL = "http://localhost:8080/api";

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

function createEmptyOperatingHours() {
  return DAYS.reduce((result, day) => {
    result[day.key] = {
      active: false,
      open: "",
      close: "",
    };

    return result;
  }, {});
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  return (
    normalizedValue !== "" &&
    normalizedValue !== "null" &&
    normalizedValue !== "undefined"
  );
}

function displayValue(value) {
  return hasValue(value) ? String(value) : "-";
}

function formatThaiDateTime(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return (
      date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  } catch (error) {
    return "-";
  }
}

function normalizeCertificate(value) {
  if (!hasValue(value)) {
    return "";
  }

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  const normalizedValue = String(value).trim();

  try {
    const parsedValue = JSON.parse(normalizedValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue[0] || "";
    }

    return normalizedValue;
  } catch (error) {
    return normalizedValue;
  }
}

function normalizeCertificateList(value) {
  if (!hasValue(value)) {
    return [];
  }

  let parsed = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      if (trimmed.includes(",")) {
        parsed = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        parsed = [trimmed];
      }
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  return parsed.map((item) => String(item).trim()).filter(Boolean);
}

function parseOperatingHours(value) {
  const defaultHours = createEmptyOperatingHours();

  if (!hasValue(value)) {
    return defaultHours;
  }

  let parsedValue = value;

  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value);
    } catch (error) {
      return defaultHours;
    }
  }

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    Array.isArray(parsedValue)
  ) {
    return defaultHours;
  }

  DAYS.forEach((day) => {
    const currentDay = parsedValue[day.key];

    if (!currentDay) {
      return;
    }

    defaultHours[day.key] = {
      active: Boolean(currentDay.active),
      open: currentDay.open || "",
      close: currentDay.close || "",
    };
  });

  return defaultHours;
}

function checkIs24Hours(hours) {
  if (!hours || typeof hours !== "object") return false;
  return DAYS.every((day) => {
    const d = hours[day.key];
    return (
      d &&
      Boolean(d.active) &&
      d.open === "00:00" &&
      (d.close === "23:59" || d.close === "24:00" || d.close === "00:00")
    );
  });
}

function normalizeImageSource(value) {
  if (!hasValue(value)) {
    return "";
  }

  let normalizedValue = value;

  if (typeof normalizedValue === "string") {
    const trimmedValue = normalizedValue.trim();

    try {
      const parsedValue = JSON.parse(trimmedValue);

      normalizedValue = Array.isArray(parsedValue)
        ? parsedValue[0] || ""
        : trimmedValue;
    } catch (error) {
      normalizedValue = trimmedValue;
    }
  }

  if (Array.isArray(normalizedValue)) {
    normalizedValue = normalizedValue[0] || "";
  }

  if (!hasValue(normalizedValue)) return "";

  const imageSource = String(normalizedValue).trim();

  if (
    imageSource.startsWith("data:image/") ||
    imageSource.startsWith("http://") ||
    imageSource.startsWith("https://") ||
    imageSource.startsWith("blob:")
  ) {
    return imageSource;
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(imageSource) && imageSource.length > 100) {
    return `data:image/jpeg;base64,${imageSource}`;
  }

  if (!imageSource.includes("/") && !imageSource.includes("\\")) {
    return `${API_BASE_URL.replace("/api", "")}/uploads/${imageSource}`;
  }

  return imageSource;
}

function normalizeGalleryImages(galleryValue) {
  if (!hasValue(galleryValue)) return [];

  let parsed = galleryValue;

  if (typeof galleryValue === "string") {
    const trimmed = galleryValue.trim();
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      if (trimmed.includes(",")) {
        parsed = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        parsed = [trimmed];
      }
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  return parsed
    .map((item) => {
      if (!item) return "";
      return normalizeImageSource(item);
    })
    .filter((src) => hasValue(src));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    };

    reader.readAsDataURL(file);
  });
}

function isGoogleMapsUrl(value) {
  if (!hasValue(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(String(value).trim());

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    const allowedHosts = [
      "google.com",
      "maps.google.com",
      "maps.app.goo.gl",
      "goo.gl",
    ];

    return allowedHosts.some((allowedHost) => {
      return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    });
  } catch (error) {
    return false;
  }
}

function parseLatLngFromGoogleMapsLink(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  const placeMatch = trimmed.match(
    /!3d(-?\d+(?:\.\d+)?)(?:.*)!4d(-?\d+(?:\.\d+)?)/,
  );
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  const qMatch = trimmed.match(
    /[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  );
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  const dirMatch =
    trimmed.match(
      /\/(?:dir|search)\/[^/]*\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    ) || trimmed.match(/\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (dirMatch) {
    const lat = parseFloat(dirMatch[1]);
    const lng = parseFloat(dirMatch[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }

  return null;
}

function getErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  if (typeof error.response?.data === "string") {
    return error.response.data;
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
  );
}

export default function ProviderDashboard() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [hub, setHub] = useState(null);

  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [formData, setFormData] = useState({
    wellnessHubName: "",
    categoryId: "",
    certificateType: "",
    contactInformation: "",
    telInformation: "",
    wellnessHubDescription: "",
    address: "",
    districtId: "",
    googleMapsLink: "",
    wellnessHubLatitude: "",
    wellnessHubLongitude: "",
    wellnessHubImg: "",
    wellnessHubGallery: [],
  });

  // State สำหรับจัดการรายการใบรับรอง 1 ใบต่อ 1 ช่อง
  const [certificateList, setCertificateList] = useState([""]);

  const handleCertChange = (index, value) => {
    setCertificateList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addCertField = () => {
    setCertificateList((prev) => [...prev, ""]);
  };

  const removeCertField = (index) => {
    setCertificateList((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const [is24Hours, setIs24Hours] = useState(false);
  const [operatingHours, setOperatingHours] = useState(
    createEmptyOperatingHours(),
  );

  const [imagePreview, setImagePreview] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [toast, setToast] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Lightbox modal state สำหรับขยายดูรูป
  const [lightboxImage, setLightboxImage] = useState(null);

  const licenseId = useMemo(() => {
    const storedLicenseId =
      provider?.licenseId || localStorage.getItem("wellnessProviderLicenseId");

    if (!storedLicenseId) {
      return null;
    }

    return String(storedLicenseId).trim();
  }, [provider]);

  const selectedCategory = useMemo(() => {
    return categories.find(
      (category) => String(category.categoryId) === String(formData.categoryId),
    );
  }, [categories, formData.categoryId]);

  const selectedDistrict = useMemo(() => {
    return districts.find(
      (district) => String(district.districtId) === String(formData.districtId),
    );
  }, [districts, formData.districtId]);

  const categoryName =
    selectedCategory?.categoryName || hub?.category?.categoryName || "-";

  const districtName =
    selectedDistrict?.districtName || hub?.district?.districtName || "-";

  const activeOperatingDays = useMemo(() => {
    return DAYS.filter((day) => operatingHours[day.key]?.active);
  }, [operatingHours]);

  const showToast = useCallback((type, message) => {
    setToast({
      type,
      message,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const clearProviderSession = useCallback(() => {
    localStorage.removeItem("wellnessProvider");
    localStorage.removeItem("wellnessProviderLicenseId");
    localStorage.removeItem("wellnessProviderName");
  }, []);

  useEffect(() => {
    const storedProvider = localStorage.getItem("wellnessProvider");

    if (!storedProvider) {
      navigate("/provider/login", {
        replace: true,
      });

      return;
    }

    try {
      const parsedProvider = JSON.parse(storedProvider);

      const isActive =
        String(parsedProvider?.status || "").toUpperCase() === "ACTIVE";

      if (!parsedProvider?.licenseId || !isActive) {
        clearProviderSession();

        navigate("/provider/login", {
          replace: true,
        });

        return;
      }

      setProvider(parsedProvider);
    } catch (error) {
      clearProviderSession();

      navigate("/provider/login", {
        replace: true,
      });
    }
  }, [clearProviderSession, navigate]);

  const mapHubToForm = useCallback((hubData) => {
    const gallery = normalizeGalleryImages(hubData.wellnessHubGallery);
    const mainImg = normalizeImageSource(hubData.wellnessHubImg);
    const certList = normalizeCertificateList(hubData.certificateType);

    setCertificateList(certList.length > 0 ? certList : [""]);

    setFormData({
      wellnessHubName: hubData.wellnessHubName || "",

      categoryId: hubData.category?.categoryId || hubData.categoryId || "",

      certificateType: normalizeCertificate(hubData.certificateType),

      contactInformation: hubData.contactInformation || "",

      telInformation: hubData.telInformation || hubData.tellInformation || "",

      wellnessHubDescription: hubData.wellnessHubDescription || "",

      address: hubData.address || "",

      districtId: hubData.district?.districtId || hubData.districtId || "",

      googleMapsLink: hubData.googleMapsLink || "",

      wellnessHubLatitude:
        hubData.wellnessHubLatitude ?? hubData.latitude ?? "",

      wellnessHubLongitude:
        hubData.wellnessHubLongitude ?? hubData.longitude ?? "",

      wellnessHubImg: mainImg,
      wellnessHubGallery: gallery,
    });

    const parsedHours = parseOperatingHours(hubData.operatingHours);
    setOperatingHours(parsedHours);
    setIs24Hours(checkIs24Hours(parsedHours));

    setImagePreview(mainImg);

    setImageFileName("");
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!licenseId) {
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const [hubResponse, categoryResponse, districtResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/wellness-hubs/${licenseId}`, {
            timeout: 30000,
            withCredentials: true,
          }),

          axios.get(`${API_BASE_URL}/categories`, {
            timeout: 30000,
          }),

          axios.get(`${API_BASE_URL}/districts`, {
            timeout: 30000,
          }),
        ]);

      if (!hubResponse.data) {
        throw new Error("ไม่พบข้อมูลสถานประกอบการ");
      }

      setHub(hubResponse.data);
      mapHubToForm(hubResponse.data);

      setCategories(
        Array.isArray(categoryResponse.data) ? categoryResponse.data : [],
      );

      setDistricts(
        Array.isArray(districtResponse.data) ? districtResponse.data : [],
      );
    } catch (error) {
      console.error("Load provider dashboard error:", error);

      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [licenseId, mapHubToForm]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));
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
      setOperatingHours(createEmptyOperatingHours());
    }
    setFormErrors((previousErrors) => ({
      ...previousErrors,
      operatingHours: "",
    }));
  };

  const handleDayToggle = (dayKey) => {
    setOperatingHours((previousHours) => {
      const currentDay = previousHours[dayKey];
      const nextActive = !currentDay.active;

      return {
        ...previousHours,
        [dayKey]: {
          active: nextActive,
          open: nextActive ? currentDay.open || "09:00" : "",
          close: nextActive ? currentDay.close || "18:00" : "",
        },
      };
    });

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      operatingHours: "",
    }));
  };

  const handleTimeChange = (dayKey, field, value) => {
    setOperatingHours((previousHours) => ({
      ...previousHours,
      [dayKey]: {
        ...previousHours[dayKey],
        [field]: value,
      },
    }));

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      operatingHours: "",
    }));
  };

  const handleImageChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ WEBP",
      }));

      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "รูปภาพต้องมีขนาดไม่เกิน 20 MB",
      }));

      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);

      setFormData((previousData) => ({
        ...previousData,
        wellnessHubImg: dataUrl,
      }));

      setImagePreview(dataUrl);
      setImageFileName(selectedFile.name);

      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "",
      }));
    } catch (error) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "ไม่สามารถอ่านรูปภาพที่เลือกได้",
      }));
    }
  };

  const removeImage = () => {
    setFormData((previousData) => ({
      ...previousData,
      wellnessHubImg: "",
    }));

    setImagePreview("");
    setImageFileName("");

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      wellnessHubImg: "",
    }));
  };

  const handleGalleryChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    const newImages = [];

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setFormErrors((previousErrors) => ({
          ...previousErrors,
          wellnessHubGallery: "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
        }));

        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((previousErrors) => ({
          ...previousErrors,
          wellnessHubGallery: "รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป",
        }));

        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        newImages.push(dataUrl);
      } catch (error) {
        setFormErrors((previousErrors) => ({
          ...previousErrors,
          wellnessHubGallery: "ไม่สามารถอ่านรูปภาพที่เลือกได้",
        }));
      }
    }

    if (newImages.length > 0) {
      setFormData((previousData) => ({
        ...previousData,
        wellnessHubGallery: [
          ...(Array.isArray(previousData.wellnessHubGallery)
            ? previousData.wellnessHubGallery
            : []),
          ...newImages,
        ],
      }));

      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubGallery: "",
      }));
    }
  };

  const removeGalleryImage = (index) => {
    setFormData((previousData) => {
      const arr = Array.isArray(previousData.wellnessHubGallery)
        ? [...previousData.wellnessHubGallery]
        : [];

      arr.splice(index, 1);

      return {
        ...previousData,
        wellnessHubGallery: arr,
      };
    });

    setFormErrors((previousErrors) => ({
      ...previousErrors,
      wellnessHubGallery: "",
    }));
  };

  const validateForm = () => {
    const errors = {};

    const normalizedName = formData.wellnessHubName
      ? formData.wellnessHubName.trim()
      : "";
    const normalizedTelephone = formData.telInformation
      ? formData.telInformation.trim()
      : "";
    const normalizedAddress = formData.address ? formData.address.trim() : "";
    const normalizedMapsLink = formData.googleMapsLink
      ? formData.googleMapsLink.trim()
      : "";
    const normalizedContact = formData.contactInformation
      ? formData.contactInformation.trim()
      : "";
    const normalizedDesc = formData.wellnessHubDescription
      ? formData.wellnessHubDescription.trim()
      : "";

    // 0. wellnessHubName: required, 5–100 ตัว
    if (!normalizedName) {
      errors.wellnessHubName = "ชื่อสถานประกอบการ: กรุณากรอกชื่อสถานประกอบการ";
    } else if (normalizedName.length < 5 || normalizedName.length > 100) {
      errors.wellnessHubName = `ชื่อสถานประกอบการ: ต้องมีความยาว 5–100 ตัวอักษร (ปัจจุบัน ${normalizedName.length} ตัวอักษร)`;
    } else if (!/^[a-zA-Z0-9\u0E00-\u0E7F\s]+$/.test(normalizedName)) {
      errors.wellnessHubName =
        "ชื่อสถานประกอบการ: ต้องเป็นภาษาไทย ภาษาอังกฤษ หรือตัวเลขเท่านั้น";
    }

    // 1. address: required, 10–255 ตัว
    if (!normalizedAddress) {
      errors.address = "ที่อยู่: กรุณากรอกรายละเอียดที่อยู่";
    } else if (normalizedAddress.length < 10 || normalizedAddress.length > 255) {
      errors.address = `ที่อยู่: ต้องมีความยาว 10–255 ตัวอักษร (ปัจจุบัน ${normalizedAddress.length} ตัวอักษร)`;
    }

    // 2. telInformation: required, ตัวเลข 9-10 หลัก ไม่มีช่องว่าง
    if (!normalizedTelephone) {
      errors.telInformation = "เบอร์โทรศัพท์: กรุณากรอกเบอร์โทรศัพท์ติดต่อ";
    } else if (!/^[0-9]{9,10}$/.test(normalizedTelephone)) {
      errors.telInformation =
        "เบอร์โทรศัพท์: ต้องเป็นตัวเลข 9–10 หลัก และไม่มีช่องว่าง";
    }

    // 3. contactInformation: optional, ถ้ามี 3–255 ตัว
    if (
      normalizedContact &&
      (normalizedContact.length < 3 || normalizedContact.length > 255)
    ) {
      errors.contactInformation = `ช่องทางติดต่อเพิ่มเติม: ต้องมีความยาว 3–255 ตัวอักษร (ปัจจุบัน ${normalizedContact.length} ตัวอักษร)`;
    }

    // 4. wellnessHubDescription: optional, if provided max 255 chars
    if (normalizedDesc && normalizedDesc.length > 255) {
      errors.wellnessHubDescription = `รายละเอียดสถานประกอบการ: ต้องมีความยาวไม่เกิน 255 ตัวอักษร (ปัจจุบัน ${normalizedDesc.length} ตัวอักษร)`;
    }

    // 5. googleMapsLink: required, valid Google Maps URL, no whitespace
    if (!normalizedMapsLink) {
      errors.googleMapsLink = "ลิงก์ Google Maps: กรุณากรอกลิงก์ Google Maps";
    } else if (/\s/.test(normalizedMapsLink)) {
      errors.googleMapsLink = "ลิงก์ Google Maps: ต้องไม่มีช่องว่าง (Whitespace)";
    } else if (!isGoogleMapsUrl(normalizedMapsLink)) {
      errors.googleMapsLink =
        "ลิงก์ Google Maps: กรุณาระบุลิงก์จาก Google Maps ที่ถูกต้อง";
    }

    // 6. Operating Hours: จันทร์–อาทิตย์
    if (!is24Hours) {
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      DAYS.forEach((day) => {
        const detail = operatingHours[day.key];

        if (!detail.active) {
          return;
        }

        if (!detail.open || !detail.close) {
          errors.operatingHours = `เวลาทำการ: กรุณาระบุเวลาเปิดและเวลาปิดของ${day.label}`;
          return;
        }

        if (!timePattern.test(detail.open) || !timePattern.test(detail.close)) {
          errors.operatingHours = `เวลาทำการ: รูปแบบเวลาเปิด/ปิดของ${day.label}ต้องเป็น HH:mm`;
        }
      });
    }

    setFormErrors(errors);

    return errors;
  };

  const requestSave = () => {
    const errors = validateForm();
    const errorKeys = Object.keys(errors);

    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const firstErrorMessage = errors[firstKey];

      showToast("error", firstErrorMessage || "กรุณากรอกข้อมูลให้ถูกต้อง");

      const element =
        document.getElementById(firstKey) ||
        document.querySelector(`[name="${firstKey}"]`);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus?.();
      }

      return;
    }

    setShowConfirmModal(true);
  };

  const saveHubData = async () => {
    if (!licenseId || saving) {
      return;
    }

    setSaving(true);

    try {
      let galleryValue = null;
      if (Array.isArray(formData.wellnessHubGallery)) {
        galleryValue = JSON.stringify(formData.wellnessHubGallery);
      } else if (typeof formData.wellnessHubGallery === "string") {
        galleryValue = formData.wellnessHubGallery;
      }

      const certTypePayload = certificateList
        .map((c) => c.trim())
        .filter(Boolean)
        .join(", ");

      const gmapsLink = formData.googleMapsLink
        ? formData.googleMapsLink.trim()
        : "";
      const parsedCoords = parseLatLngFromGoogleMapsLink(gmapsLink);

      let latVal =
        hub?.wellnessHubLatitude ??
        (formData.wellnessHubLatitude !== ""
          ? Number(formData.wellnessHubLatitude)
          : null);
      let lngVal =
        hub?.wellnessHubLongitude ??
        (formData.wellnessHubLongitude !== ""
          ? Number(formData.wellnessHubLongitude)
          : null);

      if (parsedCoords) {
        latVal = parsedCoords.lat;
        lngVal = parsedCoords.lng;
      }

      const payload = {
        licenseId: licenseId,

        wellnessHubName: formData.wellnessHubName
          ? formData.wellnessHubName.trim()
          : hub?.wellnessHubName || null,

        categoryId: formData.categoryId || hub?.category?.categoryId || null,

        category:
          formData.categoryId || hub?.category?.categoryId
            ? {
                categoryId: String(
                  formData.categoryId || hub?.category?.categoryId,
                )
                  .trim()
                  .toUpperCase(),
              }
            : null,

        districtId: formData.districtId || hub?.district?.districtId || null,

        district:
          formData.districtId || hub?.district?.districtId
            ? {
                districtId: parseInt(
                  formData.districtId || hub?.district?.districtId,
                  10,
                ),
              }
            : null,

        address: formData.address.trim(),

        telInformation: formData.telInformation.trim(),

        certificateType: certTypePayload || null,

        contactInformation: formData.contactInformation
          ? formData.contactInformation.trim() || null
          : null,

        wellnessHubDescription: formData.wellnessHubDescription
          ? formData.wellnessHubDescription.trim()
          : null,

        googleMapsLink: gmapsLink,

        wellnessHubLatitude: latVal,

        wellnessHubLongitude: lngVal,

        operatingHours: JSON.stringify(operatingHours),

        wellnessHubImg: formData.wellnessHubImg || null,

        wellnessHubGallery: galleryValue,
      };

      const response = await axios.put(
        `${API_BASE_URL}/wellness-hubs/${licenseId}`,
        payload,
        {
          timeout: 60000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const updatedHub = response.data;

      if (!updatedHub) {
        throw new Error("ระบบไม่ได้ส่งข้อมูลสถานประกอบการกลับมา");
      }

      setHub(updatedHub);
      mapHubToForm(updatedHub);

      const updatedProvider = {
        ...provider,
        wellnessHubName: updatedHub.wellnessHubName,
        categoryId: updatedHub.category?.categoryId || null,
        categoryName: updatedHub.category?.categoryName || null,
        districtId: updatedHub.district?.districtId || null,
        districtName: updatedHub.district?.districtName || null,
      };

      setProvider(updatedProvider);

      localStorage.setItem("wellnessProvider", JSON.stringify(updatedProvider));

      localStorage.setItem(
        "wellnessProviderName",
        updatedHub.wellnessHubName || "",
      );

      setEditing(false);
      setShowConfirmModal(false);

      showToast("success", "บันทึกข้อมูลสถานประกอบการสำเร็จ");
    } catch (error) {
      console.error("Save wellness hub error:", error);

      setShowConfirmModal(false);

      if (error.response?.status === 401) {
        showToast(
          "error",
          "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        );
        setTimeout(() => {
          clearProviderSession();
          navigate("/provider/login");
        }, 2000);
        return;
      }

      const errorMsg = getErrorMessage(error);

      // ระบุฟิลด์ที่มีปัญหาให้ขึ้นสีแดงและแจ้งเตือนอย่างชัดเจน
      const lower = errorMsg.toLowerCase();
      let fieldTarget = null;
      if (lower.includes("ที่อยู่") || lower.includes("address")) {
        setFormErrors((prev) => ({ ...prev, address: errorMsg }));
        fieldTarget = "address";
      } else if (lower.includes("โทรศัพท์") || lower.includes("tel")) {
        setFormErrors((prev) => ({ ...prev, telInformation: errorMsg }));
        fieldTarget = "telInformation";
      } else if (
        lower.includes("google") ||
        lower.includes("พิกัด") ||
        lower.includes("ละติจูด") ||
        lower.includes("ลองจิจูด") ||
        lower.includes("maps")
      ) {
        setFormErrors((prev) => ({ ...prev, googleMapsLink: errorMsg }));
        fieldTarget = "googleMapsLink";
      } else if (
        lower.includes("คำอธิบาย") ||
        lower.includes("รายละเอียด") ||
        lower.includes("description")
      ) {
        setFormErrors((prev) => ({
          ...prev,
          wellnessHubDescription: errorMsg,
        }));
        fieldTarget = "wellnessHubDescription";
      } else if (
        lower.includes("เวลา") ||
        lower.includes("ชั่วโมง") ||
        lower.includes("hours")
      ) {
        setFormErrors((prev) => ({ ...prev, operatingHours: errorMsg }));
        fieldTarget = "operatingHours";
      } else if (
        lower.includes("ภาพ") ||
        lower.includes("รูป") ||
        lower.includes("image")
      ) {
        setFormErrors((prev) => ({ ...prev, wellnessHubImg: errorMsg }));
        fieldTarget = "wellnessHubImg";
      } else if (
        lower.includes("ใบรับรอง") ||
        lower.includes("certificate")
      ) {
        setFormErrors((prev) => ({ ...prev, certificateType: errorMsg }));
        fieldTarget = "certificateType";
      }

      showToast("error", errorMsg);

      if (fieldTarget) {
        setTimeout(() => {
          const el =
            document.getElementById(fieldTarget) ||
            document.querySelector(`[name="${fieldTarget}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus?.();
          }
        }, 100);
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (hub) {
      mapHubToForm(hub);
    }

    setFormErrors({});
    setEditing(false);
  };

  const handleLogout = () => {
    clearProviderSession();

    navigate("/provider/login", {
      replace: true,
    });
  };

  if (loading) {
    return (
      <LoadingState
        fullPage
        title="กำลังโหลดข้อมูลสถานประกอบการ"
        message="ระบบกำลังเตรียมข้อมูลสถานประกอบการของคุณ กรุณารอสักครู่"
      />
    );
  }

  if (loadError || !hub) {
    return (
      <main className="provider-dashboard">
        <section className="provider-dashboard-state">
          <AlertCircle />

          <h1>ไม่สามารถโหลดข้อมูลได้</h1>

          <p>{loadError || "ไม่พบข้อมูลสถานประกอบการ"}</p>

          <div className="provider-dashboard-state__actions">
            <button type="button" onClick={loadDashboardData}>
              <RefreshCw />
              ลองใหม่
            </button>

            <button
              type="button"
              className="provider-dashboard-state__logout"
              onClick={handleLogout}
            >
              <LogOut />
              ออกจากระบบ
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isActive = String(hub.status || "").toUpperCase() === "ACTIVE";

  return (
    <main className="provider-dashboard">
      {toast && (
        <div
          className={`provider-dashboard-toast provider-dashboard-toast--${toast.type}`}
          role="alert"
        >
          {toast.type === "success" ? <CheckCircle2 /> : <AlertCircle />}

          <span>{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="ปิดข้อความ"
          >
            <X />
          </button>
        </div>
      )}

      {/* Header Topbar */}
      <header className="provider-dashboard-topbar">
        <div className="provider-dashboard-container provider-dashboard-topbar__inner">
          <div className="provider-dashboard-brand">
            <div className="provider-dashboard-brand__mark">
              <Building2 />
            </div>

            <div>
              <strong>ศูนย์จัดการข้อมูลผู้ประกอบการ</strong>
              <span>CHIANG MAI WELLNESS</span>
            </div>
          </div>

          <div className="provider-dashboard-topbar__actions">
            {/* Direct Public Preview Link */}
            <a
              href={`/wellness-hubs/${hub.licenseId}`}
              target="_blank"
              rel="noreferrer"
              className="provider-dashboard-button provider-dashboard-button--preview"
              title="เปิดดูหน้าสถานประกอบการบนมุมมองของผู้ใช้ทั่วไป"
            >
              <Eye />
              <span>ดูหน้าร้านจริง</span>
              <ExternalLink size={14} />
            </a>

            {!editing ? (
              <button
                type="button"
                className="provider-dashboard-button provider-dashboard-button--primary"
                onClick={() => setEditing(true)}
              >
                <Edit3 />
                แก้ไขข้อมูล
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="provider-dashboard-button provider-dashboard-button--secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X />
                  ยกเลิก
                </button>

                <button
                  type="button"
                  className="provider-dashboard-button provider-dashboard-button--primary"
                  onClick={requestSave}
                  disabled={saving}
                >
                  <Save />
                  บันทึกข้อมูล
                </button>
              </>
            )}

            <button
              type="button"
              className="provider-dashboard-button provider-dashboard-button--logout"
              onClick={handleLogout}
              disabled={saving}
            >
              <LogOut />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="provider-dashboard-container provider-dashboard-content">
        {/* Profile Hero Header */}
        <section className="provider-dashboard-profile-header">
          <div className="provider-dashboard-profile-header__main">
            <div className="provider-dashboard-profile-header__label">
              <Building2 />
              <span>สถานประกอบการที่ได้รับสิทธิ์</span>
            </div>

            <h1>{displayValue(hub.wellnessHubName)}</h1>

            <div className="provider-dashboard-profile-header__meta">
              <span>
                <Tag />
                {displayValue(categoryName)}
              </span>

              <span>
                <MapPin />
                อำเภอ{displayValue(districtName)}
              </span>

              <span
                className={
                  isActive
                    ? "provider-dashboard-profile-status provider-dashboard-profile-status--active"
                    : "provider-dashboard-profile-status provider-dashboard-profile-status--inactive"
                }
              >
                <i />
                {isActive ? "บัญชีพร้อมให้บริการ" : "บัญชีถูกระงับ"}
              </span>
            </div>
          </div>

          <div className="provider-dashboard-profile-header__summary">
            <div>
              <span>เลขใบอนุญาต (License ID)</span>
              <strong>{displayValue(hub.licenseId)}</strong>
            </div>

            <div>
              <span>เวลาให้บริการ</span>
              <strong>
                {is24Hours
                  ? "เปิด 24 ชม. ทุกวัน"
                  : activeOperatingDays.length > 0
                    ? `เปิด ${activeOperatingDays.length} วัน / สัปดาห์`
                    : "ยังไม่ได้ระบุเวลา"}
              </strong>
            </div>

            <div>
              <span>อัปเดตข้อมูลล่าสุด</span>
              <strong>
                {formatThaiDateTime(hub.updatedAt || hub.createdAt)}
              </strong>
            </div>
          </div>
        </section>

        <div className="provider-dashboard-layout">
          {/* Left Sticky Sidebar */}
          <aside className="provider-dashboard-sidebar">
            <section className="provider-dashboard-profile-media">
              <div
                className="provider-dashboard-image-frame"
                onClick={() => imagePreview && setLightboxImage(imagePreview)}
                style={{ cursor: imagePreview ? "pointer" : "default" }}
                title={imagePreview ? "คลิกเพื่อดูรูปภาพขนาดใหญ่" : ""}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt={hub.wellnessHubName || "สถานประกอบการ"}
                    />
                    <div className="provider-dashboard-image-zoom-hint">
                      <ZoomIn size={16} />
                      <span>ขยายรูปภาพ</span>
                    </div>
                  </>
                ) : (
                  <div className="provider-dashboard-image-empty">
                    <ImageIcon />
                    <strong>ยังไม่มีรูปภาพหลัก</strong>
                    <span>เพิ่มรูปภาพได้จากโหมดแก้ไข</span>
                  </div>
                )}

                <span className="provider-dashboard-image-frame__label">
                  รูปภาพหลัก
                </span>
              </div>

              {/* Sidebar Quick Action to Public View */}
              <div className="provider-dashboard-media-action">
                <a
                  href={`/wellness-hubs/${hub.licenseId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="provider-dashboard-media-link"
                >
                  <Eye size={15} />
                  เปิดดูหน้าร้านจริงบนเว็บไซต์
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </section>

            {/* Account Card */}
            <section className="provider-dashboard-account-card">
              <div className="provider-dashboard-sidebar-heading">
                <UserRound />

                <div>
                  <span>บัญชีผู้ใช้งาน</span>
                  <h2>ข้อมูลสำหรับเข้าสู่ระบบ</h2>
                </div>
              </div>

              <dl className="provider-dashboard-account-list">
                <div>
                  <dt>ชื่อผู้ใช้ (Username)</dt>
                  <dd>{displayValue(hub.username)}</dd>
                </div>

                <div>
                  <dt>สถานะบัญชี</dt>

                  <dd
                    className={
                      isActive
                        ? "provider-dashboard-account-status"
                        : "provider-dashboard-account-status provider-dashboard-account-status--inactive"
                    }
                  >
                    <i />
                    {isActive ? "พร้อมใช้งาน (ACTIVE)" : "ระงับการใช้งาน"}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="provider-dashboard-sidebar-note">
              <ShieldCheck />

              <p>
                ข้อมูลที่บันทึกจากหน้านี้จะถูกนำไปแสดงในหน้าสถานประกอบการสำหรับผู้ใช้งานทั่วไปบนแพลตฟอร์ม
                Chiang Mai Wellness
              </p>
            </div>
          </aside>

          {/* Right Main Content */}
          <section className="provider-dashboard-main">
            <div className="provider-dashboard-main__header">
              <div className="provider-dashboard-main__heading">
                <div className="provider-dashboard-main__heading-icon">
                  {editing ? <Edit3 /> : <Eye />}
                </div>

                <div>
                  <span>{editing ? "โหมดแก้ไข" : "ข้อมูลปัจจุบัน"}</span>

                  <h2>
                    {editing
                      ? "แก้ไขข้อมูลสถานประกอบการ"
                      : "รายละเอียดสถานประกอบการ"}
                  </h2>
                </div>
              </div>

              {!editing && (
                <div className="provider-dashboard-view-mode-tag">
                  <span>✓ ข้อมูลดึงจากฐานข้อมูลจริง</span>
                </div>
              )}
            </div>

            {editing ? (
              /* ======================= EDIT MODE ======================= */
              <div className="provider-dashboard-edit">
                {Object.keys(formErrors).filter((k) => formErrors[k]).length >
                  0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "16px 20px",
                      background: "#fef2f2",
                      border: "1.5px solid #f87171",
                      borderRadius: "12px",
                      marginBottom: "24px",
                      color: "#991b1b",
                    }}
                    role="alert"
                  >
                    <AlertCircle
                      style={{
                        width: "22px",
                        height: "22px",
                        flexShrink: 0,
                        marginTop: "2px",
                        color: "#dc2626",
                      }}
                    />
                    <div>
                      <strong
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        พบข้อผิดพลาด กรุณาตรวจสอบและแก้ไขข้อมูล:
                      </strong>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "18px",
                          fontSize: "13.5px",
                          lineHeight: "1.6",
                        }}
                      >
                        {Object.entries(formErrors)
                          .filter(([_, msg]) => Boolean(msg))
                          .map(([key, msg]) => (
                            <li key={key}>{msg}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Section 1: General Info */}
                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>01</span>

                    <div>
                      <h3>ข้อมูลทั่วไป</h3>
                      <p>ชื่อ หมวดหมู่ ใบรับรอง และช่องทางติดต่อ</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-form-grid">
                    <div className="provider-dashboard-field">
                      <label htmlFor="providerLicenseId">
                        เลขใบอนุญาตประกอบกิจการ
                      </label>

                      <div className="provider-dashboard-input-icon">
                        <KeyRound />

                        <input
                          id="providerLicenseId"
                          type="text"
                          value={hub.licenseId || ""}
                          readOnly
                          className="provider-dashboard-readonly"
                        />
                      </div>

                      <small>เลขใบอนุญาตไม่สามารถแก้ไขได้</small>
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="wellnessHubName">
                        ชื่อสถานประกอบการ
                        <b>*</b>
                      </label>

                      <input
                        id="wellnessHubName"
                        name="wellnessHubName"
                        type="text"
                        value={formData.wellnessHubName}
                        onChange={handleInputChange}
                        placeholder="กรอกชื่อสถานประกอบการ"
                        className={
                          formErrors.wellnessHubName
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      {formErrors.wellnessHubName && (
                        <small className="provider-dashboard-error">
                          {formErrors.wellnessHubName}
                        </small>
                      )}
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="categoryId">
                        หมวดหมู่ธุรกิจ
                        <b>*</b>
                      </label>

                      <select
                        id="categoryId"
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleInputChange}
                        className={
                          formErrors.categoryId
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      >
                        <option value="">เลือกหมวดหมู่ธุรกิจ</option>

                        {categories.map((category) => (
                          <option
                            key={category.categoryId}
                            value={category.categoryId}
                          >
                            {category.categoryName}
                          </option>
                        ))}
                      </select>

                      {formErrors.categoryId && (
                        <small className="provider-dashboard-error">
                          {formErrors.categoryId}
                        </small>
                      )}
                    </div>

                    <div className="provider-dashboard-field provider-dashboard-field-full">
                      <div className="provider-dashboard-cert-header">
                        <label>ประเภทใบรับรอง / มาตรฐาน (1 ใบต่อ 1 ช่อง)</label>
                        <button
                          type="button"
                          className="provider-dashboard-btn-add-cert"
                          onClick={addCertField}
                        >
                          + เพิ่มใบรับรอง
                        </button>
                      </div>
                      <div className="provider-dashboard-cert-list">
                        {certificateList.map((cert, index) => (
                          <div
                            key={index}
                            className="provider-dashboard-cert-row"
                          >
                            <input
                              type="text"
                              placeholder={`ระบุชื่อใบรับรอง / มาตรฐานที่ ${index + 1} (เช่น ศูนย์เวลเนสประเภทสปาเพื่อสุขภาพ)`}
                              value={cert}
                              maxLength={150}
                              onChange={(e) =>
                                handleCertChange(index, e.target.value)
                              }
                            />
                            {certificateList.length > 1 && (
                              <button
                                type="button"
                                className="provider-dashboard-btn-del-cert"
                                onClick={() => removeCertField(index)}
                                title="ลบช่องใบรับรองนี้"
                              >
                                ✕ ลบ
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="telInformation">
                        เบอร์โทรศัพท์ติดต่อ
                        <b>*</b>
                      </label>

                      <div className="provider-dashboard-input-icon">
                        <Phone />

                        <input
                          id="telInformation"
                          name="telInformation"
                          type="tel"
                          maxLength={10}
                          value={formData.telInformation}
                          onChange={handleInputChange}
                          placeholder="เช่น 0812345678"
                          className={
                            formErrors.telInformation
                              ? "provider-dashboard-field-error-input"
                              : ""
                          }
                        />
                      </div>

                      <div className="provider-dashboard-field-footer">
                        {formErrors.telInformation ? (
                          <small className="provider-dashboard-error">
                            {formErrors.telInformation}
                          </small>
                        ) : (
                          <span />
                        )}
                        <span className="provider-dashboard-char-count">
                          {formData.telInformation?.length || 0}/10
                        </span>
                      </div>
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="contactInformation">
                        ช่องทางติดต่อเพิ่มเติม
                      </label>

                      <div className="provider-dashboard-input-icon">
                        <Mail />

                        <input
                          id="contactInformation"
                          name="contactInformation"
                          type="text"
                          maxLength={255}
                          value={formData.contactInformation}
                          onChange={handleInputChange}
                          placeholder="เช่น Facebook, LINE หรือ Email"
                          className={
                            formErrors.contactInformation
                              ? "provider-dashboard-field-error-input"
                              : ""
                          }
                        />
                      </div>

                      <div className="provider-dashboard-field-footer">
                        {formErrors.contactInformation ? (
                          <small className="provider-dashboard-error">
                            {formErrors.contactInformation}
                          </small>
                        ) : (
                          <span />
                        )}
                        <span className="provider-dashboard-char-count">
                          {formData.contactInformation?.length || 0}/255
                        </span>
                      </div>
                    </div>

                    <div className="provider-dashboard-field provider-dashboard-field--full">
                      <label htmlFor="wellnessHubDescription">
                        รายละเอียดสถานประกอบการ
                      </label>

                      <textarea
                        id="wellnessHubDescription"
                        name="wellnessHubDescription"
                        rows={5}
                        maxLength={255}
                        value={formData.wellnessHubDescription}
                        onChange={handleInputChange}
                        placeholder="กรอกรายละเอียดบริการ จุดเด่น และข้อมูลที่ต้องการแสดงต่อผู้ใช้ (สูงสุด 255 ตัวอักษร)"
                        className={
                          formErrors.wellnessHubDescription
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      <div className="provider-dashboard-field-footer">
                        {formErrors.wellnessHubDescription ? (
                          <small className="provider-dashboard-error">
                            {formErrors.wellnessHubDescription}
                          </small>
                        ) : (
                          <span />
                        )}
                        <span className="provider-dashboard-char-count">
                          {formData.wellnessHubDescription?.length || 0}/255
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Location */}
                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>02</span>

                    <div>
                      <h3>สถานที่ตั้ง</h3>
                      <p>ที่อยู่ อำเภอ และลิงก์ Google Maps</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-form-grid">
                    <div className="provider-dashboard-field provider-dashboard-field--full">
                      <label htmlFor="address">
                        รายละเอียดที่อยู่
                        <b>*</b>
                      </label>

                      <textarea
                        id="address"
                        name="address"
                        rows={4}
                        maxLength={255}
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="กรอกบ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์"
                        className={
                          formErrors.address
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      <div className="provider-dashboard-field-footer">
                        {formErrors.address ? (
                          <small className="provider-dashboard-error">
                            {formErrors.address}
                          </small>
                        ) : (
                          <span />
                        )}
                        <span className="provider-dashboard-char-count">
                          {formData.address?.length || 0}/255
                        </span>
                      </div>
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="districtId">
                        อำเภอที่ตั้ง
                        <b>*</b>
                      </label>

                      <select
                        id="districtId"
                        name="districtId"
                        value={formData.districtId}
                        onChange={handleInputChange}
                        className={
                          formErrors.districtId
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      >
                        <option value="">เลือกอำเภอที่ตั้ง</option>

                        {districts.map((district) => (
                          <option
                            key={district.districtId}
                            value={district.districtId}
                          >
                            {district.districtName}
                          </option>
                        ))}
                      </select>

                      {formErrors.districtId && (
                        <small className="provider-dashboard-error">
                          {formErrors.districtId}
                        </small>
                      )}
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="googleMapsLink">
                        ลิงก์ Google Maps
                        <b>*</b>
                      </label>

                      <div className="provider-dashboard-input-icon">
                        <Navigation />

                        <input
                          id="googleMapsLink"
                          name="googleMapsLink"
                          type="url"
                          value={formData.googleMapsLink}
                          onChange={handleInputChange}
                          placeholder="https://maps.app.goo.gl/..."
                          className={
                            formErrors.googleMapsLink
                              ? "provider-dashboard-field-error-input"
                              : ""
                          }
                        />
                      </div>

                      {formErrors.googleMapsLink && (
                        <small className="provider-dashboard-error">
                          {formErrors.googleMapsLink}
                        </small>
                      )}

                      {formData.googleMapsLink &&
                        !formErrors.googleMapsLink && (
                          <a
                            href={formData.googleMapsLink}
                            target="_blank"
                            rel="noreferrer"
                            className="provider-dashboard-map-link"
                          >
                            <Navigation />
                            ตรวจสอบตำแหน่งบน Google Maps
                            <ArrowUpRight />
                          </a>
                        )}
                    </div>
                  </div>
                </section>

                {/* Section 3: Operating Hours */}
                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>03</span>

                    <div>
                      <h3>วันและเวลาให้บริการ</h3>
                      <p>
                        กำหนดเวลาเปิดให้บริการของสถานประกอบการ หรือเปิดบริการ 24
                        ชั่วโมง
                      </p>
                    </div>
                  </div>

                  {/* 24 Hours Toggle Banner */}
                  <div className="provider-dashboard-24hours-toggle">
                    <div className="provider-dashboard-24hours-info">
                      <span className="provider-dashboard-24hours-title">
                        <Clock3 size={18} /> เปิดให้บริการตลอด 24 ชั่วโมง (ทุกวัน)
                      </span>
                      <p className="provider-dashboard-24hours-desc">
                        สำหรับสถานพยาบาล โรงพยาบาล หรือหน่วยบริการกู้ชีพฉุกเฉิน
                      </p>
                    </div>
                    <label
                      className="provider-dashboard-switch"
                      htmlFor="provider-toggle-24hours"
                    >
                      <input
                        id="provider-toggle-24hours"
                        type="checkbox"
                        checked={is24Hours}
                        onChange={(e) => handle24HoursToggle(e.target.checked)}
                      />
                      <span />
                    </label>
                  </div>

                  {!is24Hours ? (
                    <div className="provider-dashboard-hours">
                      <div className="provider-dashboard-hours__header">
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
                                ? "provider-dashboard-hours__row provider-dashboard-hours__row--active"
                                : "provider-dashboard-hours__row"
                            }
                          >
                            <strong>{day.label}</strong>

                            <label className="provider-dashboard-switch">
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
                    <div className="provider-dashboard-24hours-badge">
                      <span>
                        ✓ เปิดให้บริการตลอด 24 ชั่วโมงทุกวัน (จันทร์ - อาทิตย์)
                      </span>
                    </div>
                  )}

                  {formErrors.operatingHours && (
                    <small className="provider-dashboard-error">
                      {formErrors.operatingHours}
                    </small>
                  )}
                </section>

                {/* Section 4: Main Image */}
                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>04</span>

                    <div>
                      <h3>รูปภาพหลัก</h3>
                      <p>ภาพที่ใช้ในหน้ารายละเอียดและผลการค้นหา</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-image-editor">
                    <div className="provider-dashboard-image-editor__preview">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt={formData.wellnessHubName || "สถานประกอบการ"}
                        />
                      ) : (
                        <div className="provider-dashboard-image-empty">
                          <ImageIcon />
                          <strong>ยังไม่มีรูปภาพ</strong>
                          <span>เลือกรูปเพื่อแสดงตัวอย่าง</span>
                        </div>
                      )}
                    </div>

                    <div className="provider-dashboard-image-editor__actions">
                      <div>
                        <h4>ภาพหน้าปกสถานประกอบการ</h4>

                        <p>
                          แนะนำภาพแนวนอน JPG, PNG หรือ WEBP ขนาดไม่เกิน 20 MB
                        </p>
                      </div>

                      <label className="provider-dashboard-upload">
                        <Upload />

                        {imagePreview ? "เปลี่ยนรูปภาพ" : "เลือกรูปภาพ"}

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                          hidden
                        />
                      </label>

                      {imagePreview && (
                        <button
                          type="button"
                          className="provider-dashboard-remove-image"
                          onClick={removeImage}
                        >
                          <Trash2 />
                          ลบรูปภาพ
                        </button>
                      )}

                      {imageFileName && (
                        <span className="provider-dashboard-file-name">
                          ไฟล์ที่เลือก: {imageFileName}
                        </span>
                      )}

                      {formErrors.wellnessHubImg && (
                        <small className="provider-dashboard-error">
                          {formErrors.wellnessHubImg}
                        </small>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 5: Gallery Images */}
                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>05</span>

                    <div>
                      <h3>ภาพภายในสถานประกอบการ</h3>
                      <p>รูปภาพบรรยากาศและบริการภายในสถานประกอบการ (แกลเลอรี)</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-gallery-editor">
                    <div className="provider-dashboard-gallery-preview">
                      {Array.isArray(formData.wellnessHubGallery) &&
                      formData.wellnessHubGallery.length > 0 ? (
                        <div className="provider-dashboard-gallery-grid">
                          {formData.wellnessHubGallery.map((src, idx) => (
                            <div
                              className="provider-dashboard-gallery-item"
                              key={idx}
                            >
                              <img
                                src={normalizeImageSource(src)}
                                alt={`Gallery ${idx + 1}`}
                              />
                              <button
                                type="button"
                                className="provider-dashboard-gallery-remove"
                                onClick={() => removeGalleryImage(idx)}
                                title="ลบรูปภาพนี้"
                              >
                                <Trash2 />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="provider-dashboard-image-empty">
                          <ImageIcon />
                          <strong>ยังไม่มีรูปภาพภายใน</strong>
                          <span>เพิ่มรูปภาพได้จากปุ่มอัปโหลดด้านล่าง</span>
                        </div>
                      )}
                    </div>

                    <div className="provider-dashboard-gallery-actions">
                      <div>
                        <h4>อัปโหลดภาพภายใน</h4>
                        <p>รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 5 MB ต่อรูป</p>
                      </div>

                      <label className="provider-dashboard-upload">
                        <Upload />
                        เลือก/เพิ่มรูปภาพ
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleGalleryChange}
                          hidden
                        />
                      </label>

                      {formErrors.wellnessHubGallery && (
                        <small className="provider-dashboard-error">
                          {formErrors.wellnessHubGallery}
                        </small>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              /* ======================= VIEW MODE ======================= */
              <div className="provider-dashboard-view">
                {/* View Section 1: General Info */}
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <Building2 />

                    <div>
                      <h3>ข้อมูลทั่วไป</h3>
                      <p>ข้อมูลธุรกิจ ใบรับรอง และช่องทางติดต่อ</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-info-list">
                    <div className="provider-dashboard-info-row">
                      <span>หมวดหมู่ธุรกิจ</span>
                      <strong>{displayValue(categoryName)}</strong>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>ประเภทใบรับรอง / มาตรฐาน</span>
                      <div className="provider-dashboard-cert-view-list">
                        {normalizeCertificateList(hub.certificateType).length >
                        0 ? (
                          normalizeCertificateList(hub.certificateType).map(
                            (cert, index) => (
                              <div
                                key={index}
                                className="provider-dashboard-cert-view-item"
                              >
                                <ShieldCheck size={14} />
                                <span>{cert}</span>
                              </div>
                            ),
                          )
                        ) : (
                          <strong className="provider-dashboard-empty-dash">
                            -
                          </strong>
                        )}
                      </div>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>เบอร์โทรศัพท์ติดต่อ</span>
                      <strong>
                        {hub.telInformation || hub.tellInformation ? (
                          <a
                            href={`tel:${hub.telInformation || hub.tellInformation}`}
                            className="provider-dashboard-tel-link"
                          >
                            <Phone size={14} />
                            {displayValue(
                              hub.telInformation || hub.tellInformation,
                            )}
                          </a>
                        ) : (
                          "-"
                        )}
                      </strong>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>ช่องทางติดต่อเพิ่มเติม</span>
                      <strong>
                        {displayValue(hub.contactInformation)}
                      </strong>
                    </div>

                    <div className="provider-dashboard-info-row provider-dashboard-info-row--description">
                      <span>รายละเอียดสถานประกอบการ</span>
                      <strong style={{ whiteSpace: "pre-line" }}>
                        {displayValue(hub.wellnessHubDescription)}
                      </strong>
                    </div>
                  </div>
                </section>

                {/* View Section 2: Location */}
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <MapPin />

                    <div>
                      <h3>สถานที่ตั้ง</h3>
                      <p>ที่อยู่ อำเภอ และตำแหน่งบนแผนที่</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-location-layout">
                    <div className="provider-dashboard-location-main">
                      <span>ที่อยู่</span>

                      <strong>{displayValue(hub.address)}</strong>
                    </div>

                    <div className="provider-dashboard-location-meta">
                      <div>
                        <span>อำเภอที่ตั้ง</span>
                        <strong>{displayValue(districtName)}</strong>
                      </div>
                    </div>

                    {hasValue(hub.googleMapsLink) && (
                      <a
                        href={hub.googleMapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="provider-dashboard-location-link"
                      >
                        <Navigation />
                        เปิดตำแหน่งใน Google Maps
                        <ArrowUpRight />
                      </a>
                    )}
                  </div>
                </section>

                {/* View Section 3: Operating Hours */}
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <Clock3 />

                    <div>
                      <h3>วันและเวลาให้บริการ</h3>
                      <p>เวลาเปิดให้บริการที่แสดงต่อผู้ใช้งานบนระบบ</p>
                    </div>
                  </div>

                  {checkIs24Hours(operatingHours) ? (
                    <div className="provider-dashboard-24hours-badge">
                      <span>
                        ✓ เปิดให้บริการตลอด 24 ชั่วโมงทุกวัน (จันทร์ - อาทิตย์)
                      </span>
                    </div>
                  ) : (
                    <div className="provider-dashboard-hours-table">
                      {DAYS.map((day) => {
                        const detail = operatingHours[day.key];
                        const isOpen = detail && Boolean(detail.active);

                        return (
                          <div
                            key={day.key}
                            className={`provider-dashboard-hours-item ${isOpen ? "provider-dashboard-hours-item--open" : "provider-dashboard-hours-item--closed"}`}
                          >
                            <span className="provider-dashboard-hours-day">
                              {day.label}
                            </span>
                            <span className="provider-dashboard-hours-status">
                              {isOpen ? (
                                <span className="provider-dashboard-status-tag provider-dashboard-status-tag--open">
                                  เปิดบริการ
                                </span>
                              ) : (
                                <span className="provider-dashboard-status-tag provider-dashboard-status-tag--closed">
                                  ปิดทำการ
                                </span>
                              )}
                            </span>
                            <span className="provider-dashboard-hours-time">
                              {isOpen
                                ? `${displayValue(detail.open)} – ${displayValue(detail.close)} น.`
                                : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* View Section 4: Main Cover Image */}
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <ImageIcon />

                    <div>
                      <h3>รูปภาพหน้าปกสถานประกอบการ</h3>
                      <p>ภาพหลักที่กำลังเผยแพร่บนระบบ</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-view-image">
                    {imagePreview ? (
                      <div
                        className="provider-dashboard-view-image-frame"
                        onClick={() => setLightboxImage(imagePreview)}
                        title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                      >
                        <img
                          src={imagePreview}
                          alt={hub?.wellnessHubName || "สถานประกอบการ"}
                        />
                        <div className="provider-dashboard-image-zoom-hint">
                          <ZoomIn size={16} />
                          <span>ขยายรูปภาพ</span>
                        </div>
                      </div>
                    ) : (
                      <div className="provider-dashboard-image-empty">
                        <ImageIcon />
                        <strong>ยังไม่มีรูปภาพหลัก</strong>
                      </div>
                    )}
                  </div>
                </section>

                {/* View Section 5: Gallery */}
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <ImageIcon />

                    <div>
                      <h3>ภาพบรรยากาศ / ภาพภายใน</h3>
                      <p>
                        รูปภาพบรรยากาศที่กำลังเผยแพร่ (
                        {Array.isArray(formData.wellnessHubGallery)
                          ? formData.wellnessHubGallery.length
                          : 0}{" "}
                        รูป)
                      </p>
                    </div>
                  </div>

                  {Array.isArray(formData.wellnessHubGallery) &&
                  formData.wellnessHubGallery.length > 0 ? (
                    <div className="provider-dashboard-gallery-grid">
                      {formData.wellnessHubGallery.map((src, idx) => (
                        <div
                          className="provider-dashboard-gallery-item"
                          key={idx}
                          onClick={() =>
                            setLightboxImage(normalizeImageSource(src))
                          }
                          title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                          style={{ cursor: "pointer" }}
                        >
                          <img
                            src={normalizeImageSource(src)}
                            alt={`Gallery ${idx + 1}`}
                          />
                          <div className="provider-dashboard-gallery-zoom-overlay">
                            <ZoomIn size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="provider-dashboard-empty-value">
                      ยังไม่มีรูปภาพบรรยากาศเพิ่มเติม
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Confirmation Save Modal */}
      {showConfirmModal && (
        <div
          className="provider-dashboard-modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="provider-dashboard-modal">
            <div className="provider-dashboard-modal__icon">
              <Save />
            </div>

            <h2>ยืนยันการบันทึกข้อมูล?</h2>

            <p>
              ข้อมูลที่แก้ไขจะถูกนำไปแสดงในหน้าสถานประกอบการบนระบบ
              กรุณาตรวจสอบความถูกต้องก่อนยืนยัน
            </p>

            <div className="provider-dashboard-modal__actions">
              <button
                type="button"
                className="provider-dashboard-button provider-dashboard-button--secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="provider-dashboard-button provider-dashboard-button--primary"
                onClick={saveHubData}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="provider-dashboard-small-spinner" />
                    กำลังบันทึก
                  </>
                ) : (
                  <>
                    <Save />
                    ยืนยันการบันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="provider-dashboard-lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="provider-dashboard-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="provider-dashboard-lightbox-close"
              onClick={() => setLightboxImage(null)}
              aria-label="ปิดรูปภาพ"
            >
              <X size={22} />
            </button>
            <img src={lightboxImage} alt="รูปภาพขนาดใหญ่" />
          </div>
        </div>
      )}
    </main>
  );
}

