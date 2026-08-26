// src/pages/ProviderDashboard/ProviderDashboard.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
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

const CERTIFICATE_OPTIONS = [
  "ศูนย์เวลเนสประเภทสปาเพื่อสุขภาพ (Wellness Spa)",
  "ศูนย์เวลเนสประเภทนวดเพื่อสุขภาพ (Wellness Massage)",
  "ศูนย์เวลเนสประเภทสถานพยาบาล (Wellness Clinic)",
  "ศูนย์เวลเนสประเภทที่พักนักท่องเที่ยว (Wellness Accommodation)",
  "ศูนย์เวลเนสประเภทภัตตาคารและร้านอาหาร (Wellness Restaurant)",
  "ศูนย์เวลเนสแหล่งท่องเที่ยวเชิงสุขภาพ (Wellness Tourism)",
  "Thainess Wellness Destination",
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
        parsed = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
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

  const licenseId = useMemo(() => {
    const storedLicenseId =
      provider?.licenseId || localStorage.getItem("wellnessProviderLicenseId");

    const parsedLicenseId = Number(storedLicenseId);

    if (!Number.isInteger(parsedLicenseId) || parsedLicenseId <= 0) {
      return null;
    }

    return parsedLicenseId;
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

  const certificateOptions = useMemo(() => {
    const currentValue = formData.certificateType;

    if (hasValue(currentValue) && !CERTIFICATE_OPTIONS.includes(currentValue)) {
      return [currentValue, ...CERTIFICATE_OPTIONS];
    }

    return CERTIFICATE_OPTIONS;
  }, [formData.certificateType]);

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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
      }));

      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        wellnessHubImg: "รูปภาพต้องมีขนาดไม่เกิน 5 MB",
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
          wellnessHubGallery: "รูปภาพต้องมีขนาดไม่เกิน 5 MB",
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

    const normalizedName = formData.wellnessHubName.trim();

    const normalizedTelephone = formData.telInformation.trim();

    const normalizedAddress = formData.address.trim();

    const normalizedMapsLink = formData.googleMapsLink.trim();

    const normalizedContact = formData.contactInformation.trim();

    if (!normalizedName) {
      errors.wellnessHubName = "กรุณากรอกชื่อสถานประกอบการ";
    } else if (normalizedName.length > 255) {
      errors.wellnessHubName = "ชื่อสถานประกอบการต้องไม่เกิน 255 ตัวอักษร";
    }

    if (!formData.categoryId) {
      errors.categoryId = "กรุณาเลือกหมวดหมู่ธุรกิจ";
    }

    if (!normalizedTelephone) {
      errors.telInformation = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (!/^[0-9+\-\s()]{8,20}$/.test(normalizedTelephone)) {
      errors.telInformation = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง";
    }

    if (normalizedContact && normalizedContact.length > 255) {
      errors.contactInformation = "ช่องทางติดต่อต้องไม่เกิน 255 ตัวอักษร";
    }

    if (!normalizedAddress) {
      errors.address = "กรุณากรอกรายละเอียดที่อยู่";
    } else if (normalizedAddress.length > 255) {
      errors.address = "ที่อยู่ต้องไม่เกิน 255 ตัวอักษร";
    }

    if (!formData.districtId) {
      errors.districtId = "กรุณาเลือกอำเภอที่ตั้ง";
    }

    if (!normalizedMapsLink) {
      errors.googleMapsLink = "กรุณากรอกลิงก์ Google Maps";
    } else if (!isGoogleMapsUrl(normalizedMapsLink)) {
      errors.googleMapsLink = "กรุณาระบุลิงก์จาก Google Maps ที่ถูกต้อง";
    }

    if (
      formData.wellnessHubLatitude !== "" &&
      Number.isNaN(Number(formData.wellnessHubLatitude))
    ) {
      errors.wellnessHubLatitude = "ละติจูดต้องเป็นตัวเลข";
    } else if (
      formData.wellnessHubLatitude !== "" &&
      (Number(formData.wellnessHubLatitude) < -90 ||
        Number(formData.wellnessHubLatitude) > 90)
    ) {
      errors.wellnessHubLatitude = "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90";
    }

    if (
      formData.wellnessHubLongitude !== "" &&
      Number.isNaN(Number(formData.wellnessHubLongitude))
    ) {
      errors.wellnessHubLongitude = "ลองจิจูดต้องเป็นตัวเลข";
    } else if (
      formData.wellnessHubLongitude !== "" &&
      (Number(formData.wellnessHubLongitude) < -180 ||
        Number(formData.wellnessHubLongitude) > 180)
    ) {
      errors.wellnessHubLongitude = "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180";
    }

    if (!is24Hours) {
      DAYS.forEach((day) => {
        const detail = operatingHours[day.key];

        if (!detail.active) {
          return;
        }

        if (!detail.open || !detail.close) {
          errors.operatingHours = `กรุณาระบุเวลาเปิดและเวลาปิดของ${day.label}`;

          return;
        }

        if (detail.open >= detail.close) {
          errors.operatingHours = `เวลาเปิดของ${day.label}ต้องน้อยกว่าเวลาปิด`;
        }
      });
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const requestSave = () => {
    if (!validateForm()) {
      showToast("error", "กรุณาตรวจสอบข้อมูลที่กรอกให้ถูกต้อง");

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
      const payload = {
        wellnessHubName: formData.wellnessHubName.trim(),

        contactInformation: formData.contactInformation.trim() || null,

        telInformation: formData.telInformation.trim(),

        wellnessHubDescription: formData.wellnessHubDescription.trim() || null,

        address: formData.address.trim(),

        googleMapsLink: formData.googleMapsLink.trim(),

        wellnessHubLatitude:
          formData.wellnessHubLatitude === ""
            ? null
            : Number(formData.wellnessHubLatitude),

        wellnessHubLongitude:
          formData.wellnessHubLongitude === ""
            ? null
            : Number(formData.wellnessHubLongitude),

        certificateType: formData.certificateType || null,

        operatingHours: JSON.stringify(operatingHours),

        wellnessHubImg: formData.wellnessHubImg || null,

        wellnessHubGallery: JSON.stringify(formData.wellnessHubGallery || []),

        category: selectedCategory || null,

        district: selectedDistrict || null,
      };

      const response = await axios.put(
        `${API_BASE_URL}/wellness-hubs/${licenseId}`,
        payload,
        {
          timeout: 60000,
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

      showToast("error", getErrorMessage(error));
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
        <section className="provider-dashboard-profile-header">
          <div className="provider-dashboard-profile-header__main">
            <div className="provider-dashboard-profile-header__label">
              <Building2 />
              <span>สถานประกอบการของคุณ</span>
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
                {isActive ? "บัญชีพร้อมใช้งาน" : "บัญชีถูกระงับ"}
              </span>
            </div>
          </div>

          <div className="provider-dashboard-profile-header__summary">
            <div>
              <span>เลขใบอนุญาต</span>
              <strong>{displayValue(hub.licenseId)}</strong>
            </div>

            <div>
              <span>เปิดให้บริการ</span>
              <strong>{activeOperatingDays.length} วัน / สัปดาห์</strong>
            </div>
          </div>
        </section>

        <div className="provider-dashboard-layout">
          <aside className="provider-dashboard-sidebar">
            <section className="provider-dashboard-profile-media">
              <div className="provider-dashboard-image-frame">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={hub.wellnessHubName || "สถานประกอบการ"}
                  />
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
            </section>

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
                  <dt>ชื่อผู้ใช้</dt>
                  <dd>{displayValue(hub.username)}</dd>
                </div>

                <div>
                  <dt>สถานะ</dt>

                  <dd
                    className={
                      isActive
                        ? "provider-dashboard-account-status"
                        : "provider-dashboard-account-status provider-dashboard-account-status--inactive"
                    }
                  >
                    <i />
                    {isActive ? "กำลังใช้งาน" : "ระงับการใช้งาน"}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="provider-dashboard-sidebar-note">
              <ShieldCheck />

              <p>
                ข้อมูลที่บันทึกจากหน้านี้จะถูกนำไปแสดงในหน้าสถานประกอบการสำหรับผู้ใช้งานทั่วไป
              </p>
            </div>
          </aside>

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

              {!editing && <p>ตรวจสอบข้อมูลที่กำลังเผยแพร่ต่อผู้ใช้งาน</p>}
            </div>

            {editing ? (
              <div className="provider-dashboard-edit">
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

                    <div className="provider-dashboard-field">
                      <label htmlFor="certificateType">
                        ประเภทใบรับรองศูนย์เวลเนส
                      </label>

                      <select
                        id="certificateType"
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleInputChange}
                      >
                        <option value="">ยังไม่ได้ระบุใบรับรอง</option>

                        {certificateOptions.map((certificate) => (
                          <option key={certificate} value={certificate}>
                            {certificate}
                          </option>
                        ))}
                      </select>
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

                      {formErrors.telInformation && (
                        <small className="provider-dashboard-error">
                          {formErrors.telInformation}
                        </small>
                      )}
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

                      {formErrors.contactInformation && (
                        <small className="provider-dashboard-error">
                          {formErrors.contactInformation}
                        </small>
                      )}
                    </div>

                    <div className="provider-dashboard-field provider-dashboard-field--full">
                      <label htmlFor="wellnessHubDescription">
                        รายละเอียดสถานประกอบการ
                      </label>

                      <textarea
                        id="wellnessHubDescription"
                        name="wellnessHubDescription"
                        rows={5}
                        value={formData.wellnessHubDescription}
                        onChange={handleInputChange}
                        placeholder="กรอกรายละเอียดบริการ จุดเด่น และข้อมูลที่ต้องการแสดงต่อผู้ใช้"
                      />
                    </div>
                  </div>
                </section>

                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>02</span>

                    <div>
                      <h3>สถานที่ตั้ง</h3>
                      <p>ที่อยู่ อำเภอ Google Maps และพิกัด</p>
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
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="กรอกบ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์"
                        className={
                          formErrors.address
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      {formErrors.address && (
                        <small className="provider-dashboard-error">
                          {formErrors.address}
                        </small>
                      )}
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

                    <div className="provider-dashboard-field">
                      <label htmlFor="wellnessHubLatitude">ละติจูด</label>

                      <input
                        id="wellnessHubLatitude"
                        name="wellnessHubLatitude"
                        type="number"
                        step="any"
                        value={formData.wellnessHubLatitude}
                        onChange={handleInputChange}
                        placeholder="เช่น 18.7883"
                        className={
                          formErrors.wellnessHubLatitude
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      {formErrors.wellnessHubLatitude && (
                        <small className="provider-dashboard-error">
                          {formErrors.wellnessHubLatitude}
                        </small>
                      )}
                    </div>

                    <div className="provider-dashboard-field">
                      <label htmlFor="wellnessHubLongitude">ลองจิจูด</label>

                      <input
                        id="wellnessHubLongitude"
                        name="wellnessHubLongitude"
                        type="number"
                        step="any"
                        value={formData.wellnessHubLongitude}
                        onChange={handleInputChange}
                        placeholder="เช่น 98.9853"
                        className={
                          formErrors.wellnessHubLongitude
                            ? "provider-dashboard-field-error-input"
                            : ""
                        }
                      />

                      {formErrors.wellnessHubLongitude && (
                        <small className="provider-dashboard-error">
                          {formErrors.wellnessHubLongitude}
                        </small>
                      )}
                    </div>
                  </div>
                </section>

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
                        สำหรับสถานพยาบาล โรงพยาบาล หรือหน่วยบริการกู้ภัยฉุกเฉิน
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
                          แนะนำภาพแนวนอน JPG, PNG หรือ WEBP ขนาดไม่เกิน 5 MB
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

                <section className="provider-dashboard-form-section">
                  <div className="provider-dashboard-form-section__title">
                    <span>05</span>

                    <div>
                      <h3>ภาพภายในสถานประกอบการ</h3>
                      <p>รูปภาพภายในสถานประกอบการ (แกลเลอรี)</p>
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
                          <span>เพิ่มรูปภาพได้จากปุ่มอัปโหลด</span>
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
              <div className="provider-dashboard-view">
                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <Building2 />

                    <div>
                      <h3>ข้อมูลทั่วไป</h3>
                      <p>ข้อมูลธุรกิจและช่องทางติดต่อ</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-info-list">
                    <div className="provider-dashboard-info-row">
                      <span>หมวดหมู่ธุรกิจ</span>
                      <strong>{displayValue(categoryName)}</strong>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>ประเภทใบรับรอง</span>
                      <strong>
                        {displayValue(
                          normalizeCertificate(hub.certificateType),
                        )}
                      </strong>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>เบอร์โทรศัพท์</span>
                      <strong>
                        {displayValue(
                          hub.telInformation || hub.tellInformation,
                        )}
                      </strong>
                    </div>

                    <div className="provider-dashboard-info-row">
                      <span>ช่องทางติดต่อเพิ่มเติม</span>
                      <strong>{displayValue(hub.contactInformation)}</strong>
                    </div>

                    <div className="provider-dashboard-info-row provider-dashboard-info-row--description">
                      <span>รายละเอียด</span>
                      <strong>
                        {displayValue(hub.wellnessHubDescription)}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <MapPin />

                    <div>
                      <h3>สถานที่ตั้ง</h3>
                      <p>ที่อยู่และตำแหน่งบนแผนที่</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-location-layout">
                    <div className="provider-dashboard-location-main">
                      <span>ที่อยู่</span>

                      <strong>{displayValue(hub.address)}</strong>
                    </div>

                    <div className="provider-dashboard-location-meta">
                      <div>
                        <span>อำเภอ</span>
                        <strong>{displayValue(districtName)}</strong>
                      </div>

                      <div>
                        <span>ละติจูด</span>
                        <strong>
                          {displayValue(
                            hub.wellnessHubLatitude ?? hub.latitude,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>ลองจิจูด</span>
                        <strong>
                          {displayValue(
                            hub.wellnessHubLongitude ?? hub.longitude,
                          )}
                        </strong>
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

                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <Clock3 />

                    <div>
                      <h3>วันและเวลาให้บริการ</h3>
                      <p>เวลาที่แสดงต่อผู้ใช้งาน</p>
                    </div>
                  </div>

                  {checkIs24Hours(operatingHours) ? (
                    <div className="provider-dashboard-24hours-badge">
                      <span>✓ เปิดให้บริการตลอด 24 ชั่วโมงทุกวัน</span>
                    </div>
                  ) : activeOperatingDays.length > 0 ? (
                    <div className="provider-dashboard-hours-display">
                      {activeOperatingDays.map((day) => {
                        const detail = operatingHours[day.key];

                        return (
                          <div key={day.key}>
                            <strong>{day.label}</strong>

                            <span>
                              {displayValue(detail.open)}
                              {" – "}
                              {displayValue(detail.close)}
                              {" น."}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="provider-dashboard-empty-value">
                      ยังไม่ได้กำหนดเวลาให้บริการ
                    </div>
                  )}
                </section>

                <section className="provider-dashboard-view-section">
                  <div className="provider-dashboard-view-section__heading">
                    <ImageIcon />

                    <div>
                      <h3>รูปภาพสถานประกอบการ</h3>
                      <p>ภาพหลักที่กำลังเผยแพร่</p>
                    </div>
                  </div>

                  <div className="provider-dashboard-view-image">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt={hub?.wellnessHubName || "สถานประกอบการ"}
                      />
                    ) : (
                      <div className="provider-dashboard-image-empty">
                        <ImageIcon />
                        <strong>ยังไม่มีรูปภาพหลัก</strong>
                      </div>
                    )}
                  </div>
                </section>

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
                        >
                          <img
                            src={normalizeImageSource(src)}
                            alt={`Gallery ${idx + 1}`}
                          />
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
              ข้อมูลที่แก้ไขจะถูกนำไปแสดงในหน้าสถานประกอบการ
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
    </main>
  );
}
