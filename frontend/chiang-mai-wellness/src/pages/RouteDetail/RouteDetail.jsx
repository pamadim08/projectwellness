import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet-routing-machine";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleAlert,
  Flag,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Store,
  Cross,
  Ambulance,
  HeartPulse,
  Utensils,
  Bed,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./RouteDetail.css";

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_CENTER = [18.7883, 98.9853];

const DEFAULT_CATEGORIES = [
  {
    id: "SPA",
    name: "นวด/สปาเพื่อสุขภาพ",
    color: "#28a745",
    icon: "fa-spa",
    lucideIcon: Sparkles,
  },
  {
    id: "RESTAURANT",
    name: "อาหารและเครื่องดื่ม",
    color: "#F4A261",
    icon: "fa-utensils",
    lucideIcon: Utensils,
  },
  {
    id: "HOTEL",
    name: "ที่พักฟื้นฟูสุขภาพ",
    color: "#A29BFE",
    icon: "fa-bed",
    lucideIcon: Bed,
  },
  {
    id: "CLINIC",
    name: "คลินิก/สถานพยาบาล",
    color: "#457B9D",
    icon: "fa-notes-medical",
    lucideIcon: HeartPulse,
  },
  {
    id: "HOSPITAL",
    name: "โรงพยาบาล",
    color: "#E63946",
    icon: "fa-hospital",
    lucideIcon: Cross,
    alwaysVisible: true,
  },
  {
    id: "RESCUE",
    name: "หน่วยกู้ภัย",
    color: "#D97706",
    icon: "fa-truck-medical",
    lucideIcon: Ambulance,
    alwaysVisible: true,
  },
];

function createCustomDivIcon(pinColor, pinIcon) {
  return L.divIcon({
    html: `
      <div style="background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:2px solid white;">
        <div style="background:${pinColor}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">
          <i class="fa-solid ${pinIcon}" style="font-size:11px;"></i>
        </div>
      </div>
    `,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    "ไม่สามารถโหลดรายละเอียดเส้นทางได้ กรุณาลองใหม่อีกครั้ง"
  );
}

// 🌟 ฟังก์ชันสกัด Lat/Lng ให้ยืดหยุ่น ป้องกันปัญหาโครงสร้าง JSON ต่างรูปแบบ
function extractLatLng(item) {
  if (!item) return null;
  const lat =
    item.latitude ??
    item.district?.latitude ??
    item.wellnessHubLatitude ??
    item.lat;
  const lng =
    item.longitude ??
    item.district?.longitude ??
    item.wellnessHubLongitude ??
    item.lng;

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
    return { lat: parsedLat, lng: parsedLng };
  }
  return null;
}

export default function RouteDetail() {
  const { routeId } = useParams();
  const navigate = useNavigate();

  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const districtMarkersRef = useRef({});
  const placeMarkersRef = useRef({});

  const [activeFilters, setActiveFilters] = useState({
    SPA: true,
    RESTAURANT: true,
    HOTEL: true,
    CLINIC: true,
    HOSPITAL: true,
    RESCUE: true,
  });

  const loadRouteDetail = useCallback(async () => {
    const normalizedRouteId = Number(routeId);

    if (!Number.isInteger(normalizedRouteId) || normalizedRouteId <= 0) {
      setRouteData(null);
      setError("รหัสเส้นทางไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/home/routes/${normalizedRouteId}`,
        { timeout: 10000 }
      );

      if (!response.data || !response.data.routeId) {
        setRouteData(null);
        setError("ไม่พบข้อมูลเส้นทางที่ต้องการ");
        return;
      }

      setRouteData(response.data);
    } catch (requestError) {
      setRouteData(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadRouteDetail();
  }, [loadRouteDetail]);

  const districts = useMemo(() => {
    if (!Array.isArray(routeData?.districts)) return [];
    return [...routeData.districts].sort(
      (a, b) => Number(a.orderNumber || 0) - Number(b.orderNumber || 0)
    );
  }, [routeData]);

  const wellnessHubs = useMemo(() => {
    return Array.isArray(routeData?.wellnessHubs) ? routeData.wellnessHubs : [];
  }, [routeData]);

  const getCategoryInfo = useCallback((hub) => {
    const catKey = (
      hub.categoryKey ||
      hub.categoryName ||
      hub.categoryId ||
      hub.category?.categoryId ||
      ""
    )
      .toString()
      .toUpperCase();

    if (
      catKey.includes("EM02") ||
      catKey.includes("HOSPITAL") ||
      catKey.includes("โรงพยาบาล") ||
      catKey.includes("ALS")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "HOSPITAL");
    }
    if (
      catKey.includes("EM01") ||
      catKey.includes("RESCUE") ||
      catKey.includes("กู้ภัย") ||
      catKey.includes("BLS")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "RESCUE");
    }
    if (
      catKey.includes("C01") ||
      catKey.includes("SPA") ||
      catKey.includes("MASSAGE") ||
      catKey.includes("นวด") ||
      catKey.includes("สปา")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "SPA");
    }
    if (
      catKey.includes("C03") ||
      catKey.includes("REST") ||
      catKey.includes("FOOD") ||
      catKey.includes("อาหาร")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "RESTAURANT");
    }
    if (
      catKey.includes("C04") ||
      catKey.includes("HOTEL") ||
      catKey.includes("ACCOM") ||
      catKey.includes("ที่พัก")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "HOTEL");
    }
    if (
      catKey.includes("C02") ||
      catKey.includes("CLINIC") ||
      catKey.includes("คลินิก")
    ) {
      return DEFAULT_CATEGORIES.find((c) => c.id === "CLINIC");
    }

    return {
      id: "OTHER",
      name: hub.categoryName || "อื่นๆ",
      color: "#64748B",
      icon: "fa-location-dot",
    };
  }, []);

  // 1. Initial Leaflet Map
  useEffect(() => {
    if (
      !loading &&
      !error &&
      routeData &&
      mapContainerRef.current &&
      !mapRef.current
    ) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView(DEFAULT_CENTER, 10);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(mapRef.current);

      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 200);
    }

    return () => {
      if (routingControlRef.current && mapRef.current) {
        try {
          routingControlRef.current.setWaypoints([]);
          mapRef.current.removeControl(routingControlRef.current);
        } catch (e) {}
        routingControlRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, error, routeData]);

  // 2. Render Markers & Draw Routing Line
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // --- 🟢 1. หมุดอำเภอแบบวงกลมสีเข้ม ---
    Object.values(districtMarkersRef.current).forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    districtMarkersRef.current = {};

    districts.forEach((dist, idx) => {
      const coords = extractLatLng(dist);
      if (coords) {
        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a2332",
          fillOpacity: 1,
        }).addTo(map).bindPopup(`
            <div style="font-family:'Sarabun',sans-serif; text-align:center; padding:2px;">
              <span style="font-size:11px; color:#64748b; font-weight:bold; display:block;">จุดที่ ${dist.orderNumber || idx + 1}</span>
              <strong style="font-size:14px; color:#0f172a;">อำเภอ${dist.districtName || dist.district?.districtName || ""}</strong>
            </div>
          `);

        districtMarkersRef.current[dist.districtId || idx] = marker;
      }
    });

    // --- 🛣️ 2. Leaflet Routing Machine (วาดเส้นวิ่งตามถนนจริง) ---
    if (routingControlRef.current) {
      try {
        routingControlRef.current.setWaypoints([]);
        if (map && map.removeControl) {
          map.removeControl(routingControlRef.current);
        }
      } catch (e) {}
      routingControlRef.current = null;
    }

    const waypoints = districts
      .map((d) => extractLatLng(d))
      .filter(Boolean)
      .map((c) => L.latLng(c.lat, c.lng));

    if (waypoints.length >= 2) {
      try {
        routingControlRef.current = L.Routing.control({
          waypoints: waypoints,
          // 🛠️ กำหนด router URL ของ OSRM API v1 ที่ถูกต้อง
          router: L.Routing.osrmv1({
            serviceUrl: "https://router.project-osrm.org/route/v1",
          }),
          lineOptions: {
            styles: [{ color: "#28a745", weight: 5, opacity: 0.85 }],
          },
          createMarker: () => null,
          show: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: false,
        }).addTo(map);
      } catch (err) {
        console.error("ขัดข้องในการสร้าง Routing Control:", err);
      }
    }

    if (waypoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(waypoints), { padding: [50, 50] });
      } catch (e) {}
    }

    // --- 📍 3. แสดง/ซ่อนหมุดสถานที่ตาม Filter ---
    Object.values(placeMarkersRef.current).forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    placeMarkersRef.current = {};

    wellnessHubs.forEach((hub) => {
      const coords = extractLatLng(hub);
      if (!coords) return;

      const catInfo = getCategoryInfo(hub);

      if (activeFilters[catInfo.id]) {
        const customIcon = createCustomDivIcon(catInfo.color, catInfo.icon);

        const popupHtml = `
          <div style="font-family:'Sarabun',sans-serif; padding:2px; min-width:140px;">
            <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">🏢 ${hub.wellnessHubName}</strong>
            ${hub.districtName || hub.district?.districtName ? `<span style="font-size:11px; color:#666; display:block;">อ.${hub.districtName || hub.district?.districtName}</span>` : ""}
            <span style="font-size:12px; color:${catInfo.color}; font-weight:bold; display:block; margin-top:4px;">✨ ${catInfo.name}</span>
          </div>
        `;

        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
        })
          .addTo(map)
          .bindPopup(popupHtml);

        placeMarkersRef.current[
          hub.licenseId || `${coords.lat}-${coords.lng}`
        ] = marker;
      }
    });
  }, [districts, wellnessHubs, activeFilters, getCategoryInfo]);

  const handleToggleFilter = (catId) => {
    setActiveFilters((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleOpenWellnessHub = (licenseId) => {
    if (!licenseId || String(licenseId).trim() === "") return;
    navigate(`/wellness-hubs/${licenseId}`);
  };

  if (loading) {
    return (
      <main className="route-detail-page">
        <div className="route-detail-container">
          <section className="route-detail-state">
            <div className="route-detail-spinner" />
            <h1>กำลังโหลดรายละเอียดเส้นทาง</h1>
            <p>ระบบกำลังเตรียมข้อมูลแผนที่ อำเภอ และสถานประกอบการ</p>
          </section>
        </div>
      </main>
    );
  }

  if (error || !routeData) {
    return (
      <main className="route-detail-page">
        <div className="route-detail-container">
          <section className="route-detail-state">
            <CircleAlert />
            <h1>ไม่สามารถแสดงเส้นทางได้</h1>
            <p>{error || "ไม่พบข้อมูลเส้นทาง"}</p>
            <div className="route-detail-state__actions">
              <button type="button" onClick={loadRouteDetail}>
                <RefreshCw /> ลองใหม่
              </button>
              <Link to="/">
                <ArrowLeft /> กลับหน้าแรก
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="route-detail-page">
      <header className="route-detail-hero">
        <div className="route-detail-container">
          <Link to="/" className="route-detail-back">
            <ArrowLeft /> กลับหน้าแรก
          </Link>

          <p className="route-detail-eyebrow">WELLNESS TOURISM ROUTE</p>

          <h1>{routeData.routeName}</h1>

          {routeData.routeDescription && (
            <p className="route-detail-hero__description">
              {routeData.routeDescription}
            </p>
          )}

          <div className="route-detail-summary">
            {routeData.startDistrict && (
              <article className="route-detail-summary__card">
                <div className="route-detail-summary__icon">
                  <Flag />
                </div>
                <div>
                  <span>อำเภอเริ่มต้น</span>
                  <strong>อ. {routeData.startDistrict}</strong>
                </div>
              </article>
            )}

            {routeData.endDistrict && (
              <article className="route-detail-summary__card">
                <div className="route-detail-summary__icon">
                  <MapPin />
                </div>
                <div>
                  <span>อำเภอปลายทาง</span>
                  <strong>อ. {routeData.endDistrict}</strong>
                </div>
              </article>
            )}

            <article className="route-detail-summary__card">
              <div className="route-detail-summary__icon">
                <Route />
              </div>
              <div>
                <span>จำนวนอำเภอ</span>
                <strong>
                  {routeData.districtCount || districts.length} อำเภอ
                </strong>
              </div>
            </article>

            <article className="route-detail-summary__card">
              <div className="route-detail-summary__icon">
                <Store />
              </div>
              <div>
                <span>สถานประกอบการ</span>
                <strong>
                  {routeData.wellnessHubCount || wellnessHubs.length} แห่ง
                </strong>
              </div>
            </article>
          </div>
        </div>
      </header>

      <div className="route-detail-container route-detail-content">
        <section className="route-detail-section">
          <div className="route-detail-heading">
            <div>
              <p>ROUTE MAP</p>
              <h2>แผนที่เส้นทาง</h2>
              <span>
                หมุดหมายเลขแสดงลำดับอำเภอ และหมุดสีแสดงสถานประกอบการตามหมวดหมู่
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "15px",
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              borderRadius: "12px",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {DEFAULT_CATEGORIES.map((cat) => {
              const isChecked = activeFilters[cat.id];
              return (
                <label
                  key={cat.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    background: isChecked ? `${cat.color}15` : "#f1f5f9",
                    border: `1px solid ${isChecked ? cat.color : "#cbd5e1"}`,
                    fontSize: "13px",
                    fontWeight: isChecked ? "600" : "normal",
                    color: isChecked ? cat.color : "#64748b",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleFilter(cat.id)}
                    style={{ accentColor: cat.color, cursor: "pointer" }}
                  />
                  <span>{cat.name}</span>
                </label>
              );
            })}
          </div>

          <div className="route-detail-map-layout">
            <div className="route-detail-map-card">
              <div
                ref={mapContainerRef}
                className="route-detail-map"
                style={{ height: "450px", width: "100%", borderRadius: "12px" }}
              />
            </div>

            <aside className="route-detail-legend">
              <h3>คำอธิบายสัญลักษณ์</h3>

              <div className="route-detail-legend__item">
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#1a2332",
                    border: "2px solid #fff",
                    boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                    display: "inline-block",
                  }}
                />
                <p>อำเภอตามลำดับเส้นทาง</p>
              </div>

              {DEFAULT_CATEGORIES.map((cat) => (
                <div key={cat.id} className="route-detail-legend__item">
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: cat.color,
                      display: "inline-block",
                    }}
                  />
                  <p>{cat.name}</p>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="route-detail-section">
          <div className="route-detail-heading">
            <div>
              <p>JOURNEY ORDER</p>
              <h2>ลำดับอำเภอในเส้นทาง</h2>
              <span>แสดงลำดับการเดินทางตั้งแต่ต้นทางถึงปลายทาง</span>
            </div>
          </div>

          {districts.length > 0 ? (
            <div className="route-detail-timeline">
              {districts.map((district, index) => (
                <article
                  key={`${district.districtId || index}-${district.orderNumber || index}`}
                  className="route-detail-timeline__card"
                >
                  <div className="route-detail-timeline__number">
                    {district.orderNumber || index + 1}
                  </div>

                  <div className="route-detail-timeline__content">
                    <span>
                      {index === 0
                        ? "จุดเริ่มต้น"
                        : index === districts.length - 1
                          ? "จุดปลายทาง"
                          : `จุดแวะที่ ${index + 1}`}
                    </span>

                    <h3>อ. {district.districtName || district.district?.districtName || ""}</h3>

                    <p>สถานประกอบการ {district.wellnessHubCount || 0} แห่ง</p>
                  </div>

                  {index < districts.length - 1 && (
                    <Navigation className="route-detail-timeline__arrow" />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="route-detail-empty">
              <MapPin />
              <h3>ยังไม่มีข้อมูลอำเภอ</h3>
              <p>เส้นทางนี้ยังไม่ได้กำหนดลำดับอำเภอ</p>
            </div>
          )}
        </section>

        <section className="route-detail-section">
          <div className="route-detail-heading">
            <div>
              <p>WELLNESS PLACES</p>
              <h2>สถานประกอบการในเส้นทาง</h2>
              <span>เลือกสถานประกอบการเพื่อดูรายละเอียดเพิ่มเติม</span>
            </div>
          </div>

          {wellnessHubs.length > 0 ? (
            <div className="route-detail-hub-grid">
              {wellnessHubs.map((hub) => {
                const catInfo = getCategoryInfo(hub);

                return (
                  <article
                    key={hub.licenseId || hub.wellnessHubId}
                    className="route-detail-hub-card"
                  >
                    <div className="route-detail-hub-card__category">
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: catInfo.color,
                          display: "inline-block",
                        }}
                      />
                      <p>{hub.categoryName || catInfo.name}</p>
                    </div>

                    <div className="route-detail-hub-card__icon">
                      <Building2 />
                    </div>

                    <h3>{hub.wellnessHubName}</h3>

                    {(hub.districtName || hub.district?.districtName) && (
                      <p className="route-detail-hub-card__location">
                        <MapPin /> อ. {hub.districtName || hub.district?.districtName}
                      </p>
                    )}

                    {hub.wellnessHubDescription && (
                      <p className="route-detail-hub-card__description">
                        {hub.wellnessHubDescription}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenWellnessHub(hub.licenseId)}
                    >
                      ดูรายละเอียดสถานประกอบการ
                      <ArrowRight />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="route-detail-empty">
              <Store />
              <h3>ยังไม่มีสถานประกอบการ</h3>
              <p>ไม่พบสถานประกอบการที่ตรงกับอำเภอและหมวดหมู่ของเส้นทางนี้</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}