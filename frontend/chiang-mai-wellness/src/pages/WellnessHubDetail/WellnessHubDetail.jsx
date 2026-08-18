import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileBadge2,
  ImageOff,
  Info,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Tag,
} from "lucide-react";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link, useNavigate, useParams } from "react-router-dom";

import "./WellnessHubDetail.css";

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_CENTER = [18.7883, 98.9853];

const DEFAULT_CATEGORIES = [
  {
    id: "SPA",
    keyMatch: ["C01", "SPA", "MASSAGE", "นวด", "สปา"],
    name: "นวด/สปาเพื่อสุขภาพ",
    color: "#2E9D62",
    icon: "fa-spa",
  },
  {
    id: "RESTAURANT",
    keyMatch: ["C03", "REST", "FOOD", "อาหาร"],
    name: "อาหารและเครื่องดื่ม",
    color: "#F28C28",
    icon: "fa-utensils",
  },
  {
    id: "HOTEL",
    keyMatch: ["C04", "HOTEL", "ACCOM", "ที่พัก"],
    name: "ที่พักฟื้นฟูสุขภาพ",
    color: "#7C63D9",
    icon: "fa-bed",
  },
  {
    id: "CLINIC",
    keyMatch: ["C02", "CLINIC", "คลินิก"],
    name: "คลินิก/สถานพยาบาล",
    color: "#2563A6",
    icon: "fa-notes-medical",
  },
  {
    id: "HOSPITAL",
    keyMatch: ["EM02", "HOSPITAL", "โรงพยาบาล", "ALS"],
    name: "โรงพยาบาล",
    color: "#D9434E",
    icon: "fa-hospital",
  },
  {
    id: "RESCUE",
    keyMatch: ["EM01", "RESCUE", "กู้ภัย", "BLS"],
    name: "หน่วยกู้ภัย",
    color: "#E0A000",
    icon: "fa-truck-medical",
  },
];

const DAY_LABELS = {
  monday: "วันจันทร์",
  tuesday: "วันอังคาร",
  wednesday: "วันพุธ",
  thursday: "วันพฤหัสบดี",
  friday: "วันศุกร์",
  saturday: "วันเสาร์",
  sunday: "วันอาทิตย์",
};

function hasValue(value) {
  if (value === null || value === undefined) return false;

  const str = String(value).trim();

  return (
    str !== "" && str !== "#ERROR!" && str !== "undefined" && str !== "null"
  );
}

function hasCoordinates(latitude, longitude) {
  return (
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
  );
}

function getCategoryInfo(hub) {
  const catKey = (
    hub?.categoryId ||
    hub?.categoryName ||
    hub?.category?.categoryId ||
    ""
  )
    .toString()
    .toUpperCase();

  const matched = DEFAULT_CATEGORIES.find((cat) =>
    cat.keyMatch.some((k) => catKey.includes(k)),
  );

  if (matched) return matched;

  return {
    id: "OTHER",
    name: hub?.categoryName || "สถานประกอบการ",
    color: "#64748B",
    icon: "fa-location-dot",
  };
}

function createWellnessHubMarkerIcon(hub) {
  const catInfo = getCategoryInfo(hub);

  return L.divIcon({
    html: `
      <div style="background:white; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 12px rgba(0,0,0,0.25); border:2px solid white;">
        <div style="background:${catInfo.color}; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">
          <i class="fa-solid ${catInfo.icon}" style="font-size:12px;"></i>
        </div>
      </div>
    `,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function parseJsonValue(value) {
  if (!hasValue(value)) return null;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeOperatingHours(value) {
  const parsedValue = parseJsonValue(value);

  if (!parsedValue || Array.isArray(parsedValue)) return [];

  return Object.entries(parsedValue)
    .filter(([, detail]) => Boolean(detail?.active))
    .map(([day, detail]) => ({
      day,
      label: DAY_LABELS[day] || day,
      open: detail?.open || "",
      close: detail?.close || "",
    }));
}

// แปลงข้อมูลประเภทใบรับรองให้อยู่ในรูปแบบ Array เสมอ
function normalizeCertificateTypes(value) {
  if (!hasValue(value)) return [];

  const parsedValue = parseJsonValue(value);

  if (Array.isArray(parsedValue)) {
    return parsedValue
      .map((item) => String(item).trim())
      .filter((item) => hasValue(item));
  }

  const strValue = String(value).trim();

  if (strValue.includes(",")) {
    return strValue
      .split(",")
      .map((item) => item.trim())
      .filter((item) => hasValue(item));
  }

  return [strValue];
}

function normalizeImageSource(imageValue) {
  if (!hasValue(imageValue)) return "";

  let normalizedValue = imageValue;

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

  if (/^[A-Za-z0-9+/=\s]+$/.test(imageSource)) {
    return `data:image/jpeg;base64,${imageSource}`;
  }

  return imageSource;
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    "ไม่สามารถโหลดข้อมูลสถานประกอบการได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function WellnessHubDetail() {
  const { hubId } = useParams();
  const licenseId = hubId;
  const navigate = useNavigate();

  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  const loadWellnessHub = useCallback(async () => {
    const normalizedLicenseId = Number(licenseId);

    if (!Number.isInteger(normalizedLicenseId) || normalizedLicenseId <= 0) {
      setHub(null);
      setError("รหัสสถานประกอบการไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setImageError(false);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/home/wellness-hubs/${normalizedLicenseId}`,
        {
          timeout: 30000,
        },
      );

      if (!response.data || !response.data.licenseId) {
        setHub(null);
        setError("ไม่พบข้อมูลสถานประกอบการที่ต้องการ");
        return;
      }

      setHub(response.data);
    } catch (requestError) {
      setHub(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [licenseId]);

  useEffect(() => {
    loadWellnessHub();
  }, [loadWellnessHub]);

  const imageSource = useMemo(
    () => normalizeImageSource(hub?.wellnessHubImg),
    [hub],
  );

  const operatingHours = useMemo(
    () => normalizeOperatingHours(hub?.operatingHours),
    [hub?.operatingHours],
  );

  const certificateTypes = useMemo(
    () => normalizeCertificateTypes(hub?.certificateType),
    [hub?.certificateType],
  );

  const markerIcon = useMemo(
    () => (hub ? createWellnessHubMarkerIcon(hub) : null),
    [hub],
  );

  const catInfo = useMemo(() => (hub ? getCategoryInfo(hub) : null), [hub]);

  // สถานประกอบการที่มี Username แล้วถือว่ามีบัญชีผู้ใช้งานแล้ว
  // จึงไม่ต้องแสดงช่องส่งคำขอเป็นเจ้าของอีก
  const hasOwnerAccount = useMemo(
    () => hasValue(hub?.username),
    [hub?.username],
  );

  const coordinatesAvailable = hasCoordinates(hub?.latitude, hub?.longitude);

  const mapPosition = coordinatesAvailable
    ? [Number(hub.latitude), Number(hub.longitude)]
    : DEFAULT_CENTER;

  const handleRequestOwnership = () => {
    if (!hub?.licenseId || hasOwnerAccount) return;

    navigate(`/request-wellness-hub-account/${hub.licenseId}`, {
      state: {
        wellnessHub: {
          licenseId: hub.licenseId,
          wellnessHubName: hub.wellnessHubName,
          categoryName: hub.categoryName,
          districtName: hub.districtName,
        },
      },
    });
  };

  if (loading) {
    return (
      <main className="hub-detail-page">
        <div className="hub-detail-container">
          <section className="hub-detail-state">
            <div className="hub-detail-spinner" />
            <h1>กำลังโหลดข้อมูลสถานประกอบการ</h1>
            <p>ระบบกำลังเตรียมรูปภาพ ตำแหน่ง และข้อมูลที่เกี่ยวข้อง</p>
          </section>
        </div>
      </main>
    );
  }

  if (error || !hub) {
    return (
      <main className="hub-detail-page">
        <div className="hub-detail-container">
          <section className="hub-detail-state">
            <CircleAlert />

            <h1>ไม่สามารถแสดงข้อมูลได้</h1>

            <p>{error || "ไม่พบข้อมูลสถานประกอบการ"}</p>

            <div className="hub-detail-state__actions">
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
    <main className="hub-detail-page">
      {/* 1. Header Hero */}
      <header className="hub-detail-hero">
        <div className="hub-detail-container">
          <button
            type="button"
            className="hub-detail-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft />
            กลับหน้าก่อนหน้า
          </button>

          {hasValue(hub.categoryName) && (
            <p className="hub-detail-eyebrow">{hub.categoryName}</p>
          )}

          <h1>{hub.wellnessHubName}</h1>

          <div className="hub-detail-hero__meta">
            {hasValue(hub.districtName) && (
              <span>
                <MapPin />
                อ. {hub.districtName} จังหวัดเชียงใหม่
              </span>
            )}

            {certificateTypes.length > 0 && (
              <span>
                <ShieldCheck />
                มีข้อมูลการรับรอง
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Content Layout */}
      <div className="hub-detail-container hub-detail-content">
        <div className="hub-detail-layout">
          {/* ฝั่งซ้าย: รูปภาพหลัก + เกี่ยวกับ + แผนที่ */}
          <section className="hub-detail-main">
            {/* รูปภาพหลักของการ์ดฝั่งซ้าย */}
            <div className="hub-detail-image-box">
              {imageSource && !imageError ? (
                <img
                  src={imageSource}
                  alt={hub.wellnessHubName}
                  className="hub-detail-main-image"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="hub-detail-image-placeholder">
                  {imageError ? <ImageOff /> : <Building2 />}

                  <span>
                    {imageError
                      ? "ไม่สามารถแสดงรูปภาพได้"
                      : "ไม่มีรูปภาพสถานประกอบการ"}
                  </span>
                </div>
              )}

              {hasValue(hub.categoryName) && (
                <div className="hub-detail-image-badge">
                  <Tag />
                  {hub.categoryName}
                </div>
              )}
            </div>

            {/* เกี่ยวกับสถานประกอบการ */}
            {hasValue(hub.wellnessHubDescription) && (
              <article className="hub-detail-card">
                <div className="hub-detail-card__heading">
                  <Building2 />

                  <div>
                    <p>ABOUT THIS PLACE</p>
                    <h2>เกี่ยวกับสถานประกอบการ</h2>
                  </div>
                </div>

                <p className="hub-detail-description">
                  {hub.wellnessHubDescription}
                </p>
              </article>
            )}

            {/* แผนที่ตำแหน่งที่ตั้ง */}
            {coordinatesAvailable && (
              <article className="hub-detail-card">
                <div className="hub-detail-card__heading">
                  <Navigation />

                  <div>
                    <p>LOCATION</p>
                    <h2>ตำแหน่งที่ตั้ง</h2>
                  </div>
                </div>

                <div className="hub-detail-map-wrapper">
                  <MapContainer
                    center={mapPosition}
                    zoom={15}
                    scrollWheelZoom
                    className="hub-detail-map"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />

                    <Marker position={mapPosition} icon={markerIcon}>
                      <Popup>
                        <div className="hub-detail-map-popup">
                          <strong
                            style={{
                              fontSize: "13px",
                              color: "#111",
                            }}
                          >
                            🏢 {hub.wellnessHubName}
                          </strong>

                          {hasValue(hub.districtName) && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#666",
                              }}
                            >
                              อ.{hub.districtName}
                            </span>
                          )}

                          {catInfo && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: catInfo.color,
                                fontWeight: "bold",
                                marginTop: "2px",
                              }}
                            >
                              ✨ {catInfo.name}
                            </span>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>

                {hasValue(hub.googleMapsLink) && (
                  <a
                    href={hub.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="hub-detail-google-map"
                  >
                    <Navigation />
                    เปิดเส้นทางใน Google Maps
                    <ExternalLink />
                  </a>
                )}
              </article>
            )}
          </section>

          {/* ฝั่งขวา */}
          <aside className="hub-detail-sidebar">
            {/* Request Ownership
                แสดงเฉพาะสถานประกอบการที่ยังไม่มีบัญชี */}
            {!hasOwnerAccount && (
              <article className="hub-detail-ownership-card">
                <div className="hub-detail-ownership-card__icon">
                  <CheckCircle2 />
                </div>

                <h2>คุณเป็นเจ้าของสถานประกอบการนี้หรือไม่?</h2>

                <p>
                  ส่งคำขอเพื่อยืนยันสิทธิ์ในการจัดการข้อมูลสถานประกอบการ
                  หลังจากผู้ดูแลระบบตรวจสอบและอนุมัติ
                </p>

                <button type="button" onClick={handleRequestOwnership}>
                  <Send />
                  ส่งคำขอเป็นเจ้าของสถานประกอบการ
                </button>

                <span>คำขอจะเข้าสู่กระบวนการตรวจสอบโดยผู้ดูแลระบบ</span>
              </article>
            )}

            {/* กลุ่มที่ 1: ข้อมูลพื้นฐาน (Basic Information) */}
            <article className="hub-detail-info-card">
              <div className="hub-detail-info-card__heading">
                <h2>ข้อมูลพื้นฐาน</h2>
                <span>การติดต่อและเวลาเปิด-ปิด</span>
              </div>

              {hasValue(hub.address) && (
                <div className="hub-detail-info-row">
                  <div className="hub-detail-info-row__icon">
                    <MapPin />
                  </div>

                  <div>
                    <span>ที่อยู่</span>
                    <p>{hub.address}</p>
                  </div>
                </div>
              )}

              {hasValue(hub.telInformation) && (
                <div className="hub-detail-info-row">
                  <div className="hub-detail-info-row__icon">
                    <Phone />
                  </div>

                  <div>
                    <span>โทรศัพท์</span>

                    <a href={`tel:${hub.telInformation}`}>
                      {hub.telInformation}
                    </a>
                  </div>
                </div>
              )}

              {hasValue(hub.contactInformation) && (
                <div className="hub-detail-info-row">
                  <div className="hub-detail-info-row__icon">
                    <Mail />
                  </div>

                  <div>
                    <span>ช่องทางติดต่อ</span>
                    <p>{hub.contactInformation}</p>
                  </div>
                </div>
              )}

              {operatingHours.length > 0 && (
                <div className="hub-detail-info-row">
                  <div className="hub-detail-info-row__icon">
                    <Clock3 />
                  </div>

                  <div>
                    <span>เวลาให้บริการ</span>

                    <div className="hub-detail-hours">
                      {operatingHours.map((item) => (
                        <div key={item.day} className="hub-detail-hours__row">
                          <strong>{item.label}</strong>

                          <span className="hub-detail-hours__status hub-detail-hours__status--open">
                            {item.open} – {item.close} น.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>

            {/* กลุ่มที่ 2: ข้อมูลเพิ่มเติม (Additional Information) */}
            {(certificateTypes.length > 0 || hasValue(hub.categoryName)) && (
              <article className="hub-detail-info-card">
                <div className="hub-detail-info-card__heading">
                  <h2>ข้อมูลเพิ่มเติม</h2>
                  <span>หมวดหมู่และใบรับรอง</span>
                </div>

                {hasValue(hub.categoryName) && (
                  <div className="hub-detail-info-row">
                    <div className="hub-detail-info-row__icon">
                      <Tag />
                    </div>

                    <div>
                      <span>หมวดหมู่</span>
                      <p>{hub.categoryName}</p>
                    </div>
                  </div>
                )}

                {certificateTypes.length > 0 && (
                  <div className="hub-detail-info-row">
                    <div className="hub-detail-info-row__icon">
                      <FileBadge2 />
                    </div>

                    <div>
                      <span>ประเภทใบรับรอง</span>

                      <div className="hub-detail-certificates">
                        {certificateTypes.map((certificate, index) => (
                          <div
                            key={`${certificate}-${index}`}
                            className="hub-detail-certificate-item"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: index === 0 ? "4px" : "8px",
                            }}
                          >
                            <ShieldCheck
                              style={{
                                width: "16px",
                                height: "16px",
                                color: "#28a745",
                                flexShrink: 0,
                              }}
                            />

                            <span
                              style={{
                                fontSize: "14px",
                                color: "#334155",
                              }}
                            >
                              {certificate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
