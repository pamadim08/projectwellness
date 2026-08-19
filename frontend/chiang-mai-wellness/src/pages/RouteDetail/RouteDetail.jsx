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
  Palmtree,
  Eye,
  EyeOff,
  Maximize2,
} from "lucide-react";

import { Link, useNavigate, useParams } from "react-router-dom";

import "./RouteDetail.css";

const API_BASE_URL = "http://localhost:8080/api";

const DEFAULT_CENTER = [18.7883, 98.9853];

const MASTER_CATEGORIES = [
  {
    id: "SPA",
    name: "นวด/สปาเพื่อสุขภาพ",
    color: "#2E9D62",
    icon: "fa-spa",
    lucideIcon: Sparkles,
  },
  {
    id: "RESTAURANT",
    name: "อาหารและเครื่องดื่ม",
    color: "#F28C28",
    icon: "fa-utensils",
    lucideIcon: Utensils,
  },
  {
    id: "HOTEL",
    name: "ที่พักฟื้นฟูสุขภาพ",
    color: "#7C63D9",
    icon: "fa-bed",
    lucideIcon: Bed,
  },
  {
    id: "CLINIC",
    name: "คลินิก/สถานพยาบาล",
    color: "#2563A6",
    icon: "fa-notes-medical",
    lucideIcon: HeartPulse,
  },
  {
    id: "ATTRACTION",
    name: "สถานที่ท่องเที่ยว",
    color: "#28A9D8",
    icon: "fa-map-location-dot",
    lucideIcon: Palmtree,
  },
  {
    id: "HOSPITAL",
    name: "โรงพยาบาล",
    color: "#D9434E",
    icon: "fa-hospital",
    lucideIcon: Cross,
    alwaysVisible: true,
  },
  {
    id: "RESCUE",
    name: "หน่วยกู้ภัย",
    color: "#E0A000",
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

function extractLatLng(item) {
  if (!item) {
    return null;
  }

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

  if (
    lat === null ||
    lat === undefined ||
    lng === null ||
    lng === undefined ||
    String(lat).trim() === "" ||
    String(lng).trim() === ""
  ) {
    return null;
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return null;
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
  };
}

function isMapReady(map, container) {
  if (!map || !container || !container.isConnected) {
    return false;
  }

  try {
    return map.getContainer?.() === container && Boolean(map._loaded);
  } catch (error) {
    return false;
  }
}

export default function RouteDetail() {
  const { routeId } = useParams();

  const navigate = useNavigate();

  const [routeData, setRouteData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activeFilters, setActiveFilters] = useState({});

  const mapContainerRef = useRef(null);

  const mapRef = useRef(null);

  const hubsLayerRef = useRef(null);

  const routingControlRef = useRef(null);

  const routeBoundsRef = useRef(null);

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
      return MASTER_CATEGORIES.find((c) => c.id === "HOSPITAL");
    }

    if (
      catKey.includes("EM01") ||
      catKey.includes("RESCUE") ||
      catKey.includes("กู้ภัย") ||
      catKey.includes("BLS")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "RESCUE");
    }

    if (
      catKey.includes("C01") ||
      catKey.includes("SPA") ||
      catKey.includes("MASSAGE") ||
      catKey.includes("นวด") ||
      catKey.includes("สปา")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "SPA");
    }

    if (
      catKey.includes("C03") ||
      catKey.includes("REST") ||
      catKey.includes("FOOD") ||
      catKey.includes("อาหาร")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "RESTAURANT");
    }

    if (
      catKey.includes("C04") ||
      catKey.includes("HOTEL") ||
      catKey.includes("ACCOM") ||
      catKey.includes("ที่พัก")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "HOTEL");
    }

    if (
      catKey.includes("C02") ||
      catKey.includes("CLINIC") ||
      catKey.includes("คลินิก")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "CLINIC");
    }

    if (
      catKey.includes("C05") ||
      catKey.includes("ATTRACTION") ||
      catKey.includes("TOURIST") ||
      catKey.includes("TRAVEL") ||
      catKey.includes("ท่องเที่ยว")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "ATTRACTION");
    }

    return {
      id: "OTHER",
      name: hub.categoryName || "อื่นๆ",
      color: "#64748B",
      icon: "fa-location-dot",
    };
  }, []);

  const wellnessHubs = useMemo(() => {
    return Array.isArray(routeData?.wellnessHubs) ? routeData.wellnessHubs : [];
  }, [routeData]);

  // 🌟 ดึงเฉพาะหมวดหมู่ที่มีอยู่จริงในเส้นทางนี้
  const availableCategories = useMemo(() => {
    if (!wellnessHubs.length) {
      return [];
    }

    const foundCategoryIds = new Set(
      wellnessHubs.map((hub) => getCategoryInfo(hub)?.id).filter(Boolean),
    );

    return MASTER_CATEGORIES.filter((cat) => foundCategoryIds.has(cat.id));
  }, [wellnessHubs, getCategoryInfo]);

  // 🌟 นับเฉพาะสถานประกอบการที่มีพิกัดจริง แยกตามหมวดหมู่
  // categoryCounts, totalMapHubs, visibleMapHubs intentionally removed — UI will show only names

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
        {
          timeout: 10000,
        },
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

  // ตั้งค่า activeFilters เริ่มต้นให้เปิดครบเฉพาะที่มีในเส้นทาง
  useEffect(() => {
    if (availableCategories.length > 0) {
      const initialFilters = availableCategories.reduce((acc, cat) => {
        acc[cat.id] = true;

        return acc;
      }, {});

      setActiveFilters(initialFilters);
    }
  }, [availableCategories]);

  const districts = useMemo(() => {
    if (!Array.isArray(routeData?.districts)) {
      return [];
    }

    return [...routeData.districts].sort(
      (a, b) => Number(a.orderNumber || 0) - Number(b.orderNumber || 0),
    );
  }, [routeData]);

  // 🟢 1. สร้าง Map เพียงครั้งเดียวเมื่อข้อมูลหลักพร้อม
  useEffect(() => {
    const mapContainer = mapContainerRef.current;

    if (loading || error || !routeData || !mapContainer || mapRef.current) {
      return;
    }

    let isDisposed = false;

    let routingControl = null;

    let hubsLayer = null;

    let invalidateTimer = null;

    const map = L.map(mapContainer, {
      zoomControl: true,

      /*
       * ปิดการ Zoom ที่คำนวณจากตำแหน่ง Pointer
       * เพราะ error _leaflet_pos เกิดจาก setZoomAround
       * ในจังหวะที่ DOM ของ Map ถูก cleanup ไปแล้ว
       */
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,

      /*
       * ยังคงลาก Map และใช้ปุ่ม +/- ได้
       */
      dragging: true,
      keyboard: true,

      /*
       * ปิด Animation เพื่อลด race condition
       */
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    mapRef.current = map;

    try {
      map.setView(DEFAULT_CENTER, 10, {
        animate: false,
      });
    } catch (err) {
      console.warn("ไม่สามารถกำหนดตำแหน่งเริ่มต้นของ Map ได้:", err);
    }

    const tileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    );

    tileLayer.addTo(map);

    // LayerGroup สำหรับสถานประกอบการ
    hubsLayer = L.layerGroup().addTo(map);

    hubsLayerRef.current = hubsLayer;

    // วาดหมุดอำเภอ
    districts.forEach((dist, idx) => {
      if (isDisposed) {
        return;
      }

      const coords = extractLatLng(dist);

      if (!coords) {
        return;
      }

      L.circleMarker([coords.lat, coords.lng], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1a2332",
        fillOpacity: 1,
      }).addTo(map).bindPopup(`
          <div style="font-family:'Sarabun',sans-serif; text-align:center; padding:2px;">
            <span style="font-size:11px; color:#64748b; font-weight:bold; display:block;">
              จุดที่ ${dist.orderNumber || idx + 1}
            </span>

            <strong style="font-size:14px; color:#0f172a;">
              อำเภอ${dist.districtName || dist.district?.districtName || ""}
            </strong>
          </div>
        `);
    });

    // วาดเส้นทาง Routing
    const waypoints = districts
      .map((district) => extractLatLng(district))
      .filter(Boolean)
      .map((coords) => L.latLng(coords.lat, coords.lng));

    if (waypoints.length >= 2) {
      try {
        routingControl = L.Routing.control({
          waypoints,

          router: L.Routing.osrmv1({
            serviceUrl: "https://router.project-osrm.org/route/v1",
          }),

          lineOptions: {
            styles: [
              {
                color: "#28a745",
                weight: 5,
                opacity: 0.85,
              },
            ],
          },

          createMarker: () => null,

          show: false,

          addWaypoints: false,

          draggableWaypoints: false,

          fitSelectedRoutes: false,
        });

        routingControlRef.current = routingControl;

        routingControl.on("routingerror", (routingError) => {
          if (
            isDisposed ||
            mapRef.current !== map ||
            !isMapReady(map, mapContainer)
          ) {
            return;
          }

          console.warn(
            "ไม่สามารถคำนวณเส้นทางจาก Routing Service ได้:",
            routingError,
          );
        });

        routingControl.addTo(map);
      } catch (err) {
        console.error("ขัดข้องในการสร้าง Routing Control:", err);

        routingControlRef.current = null;

        routingControl = null;
      }
    }

    if (waypoints.length > 0) {
      try {
        const bounds = L.latLngBounds(waypoints);

        if (
          bounds.isValid() &&
          !isDisposed &&
          mapRef.current === map &&
          isMapReady(map, mapContainer)
        ) {
          routeBoundsRef.current = bounds;

          map.fitBounds(bounds, {
            padding: [50, 50],
            animate: false,
          });
        }
      } catch (err) {
        console.error("ไม่สามารถปรับขอบเขตแผนที่ได้:", err);
      }
    }

    invalidateTimer = window.setTimeout(() => {
      if (
        isDisposed ||
        mapRef.current !== map ||
        !isMapReady(map, mapContainer)
      ) {
        return;
      }

      try {
        map.invalidateSize({
          animate: false,
          pan: false,
        });
      } catch (err) {
        console.warn("ไม่สามารถปรับขนาดแผนที่ได้:", err);
      }
    }, 200);

    // Clean up
    return () => {
      isDisposed = true;

      if (invalidateTimer) {
        window.clearTimeout(invalidateTimer);
      }

      /*
       * สำคัญ:
       * ตัด Ref ก่อนเริ่ม cleanup เพื่อไม่ให้ Effect/Handler อื่น
       * ได้ Map instance ที่กำลังถูกทำลาย
       */
      if (mapRef.current === map) {
        mapRef.current = null;
      }

      routeBoundsRef.current = null;

      /*
       * หยุด movement ก่อน
       */
      try {
        map.stop();
      } catch (err) {
        console.warn("ไม่สามารถหยุด Map animation ได้:", err);
      }

      /*
       * ปิด interaction handler ก่อน DOM ของ Leaflet ถูกถอด
       */
      try {
        if (map.scrollWheelZoom?.enabled()) {
          map.scrollWheelZoom.disable();
        }

        if (map.doubleClickZoom?.enabled()) {
          map.doubleClickZoom.disable();
        }

        if (map.touchZoom?.enabled()) {
          map.touchZoom.disable();
        }

        if (map.boxZoom?.enabled()) {
          map.boxZoom.disable();
        }

        if (map.keyboard?.enabled()) {
          map.keyboard.disable();
        }

        if (map.dragging?.enabled()) {
          map.dragging.disable();
        }

        if (map.tap?.enabled()) {
          map.tap.disable();
        }
      } catch (err) {
        console.warn("ไม่สามารถปิด Map handlers ได้:", err);
      }

      /*
       * Cleanup Routing ก่อน Map
       */
      if (routingControl) {
        try {
          routingControl.off();
        } catch (err) {
          console.warn("ไม่สามารถปิด Routing Control events ได้:", err);
        }

        try {
          if (typeof routingControl._requestCount === "number") {
            routingControl._requestCount += 1;
          }

          if (
            routingControl._pendingRequest &&
            typeof routingControl._pendingRequest.abort === "function"
          ) {
            routingControl._pendingRequest.abort();
          }

          routingControl._pendingRequest = null;
        } catch (err) {
          console.warn("ไม่สามารถยกเลิก Routing request ได้:", err);
        }

        try {
          if (routingControl._map === map) {
            map.removeControl(routingControl);
          }
        } catch (err) {
          console.warn("ไม่สามารถลบ Routing Control ได้:", err);
        }

        if (routingControlRef.current === routingControl) {
          routingControlRef.current = null;
        }

        routingControl = null;
      }

      /*
       * Cleanup Layer สถานประกอบการ
       */
      if (hubsLayer) {
        try {
          hubsLayer.clearLayers();

          if (map.hasLayer(hubsLayer)) {
            map.removeLayer(hubsLayer);
          }
        } catch (err) {
          console.warn("ไม่สามารถล้าง Layer สถานประกอบการได้:", err);
        }

        if (hubsLayerRef.current === hubsLayer) {
          hubsLayerRef.current = null;
        }

        hubsLayer = null;
      }

      /*
       * ปิด Event ทั้งหมดของ Map
       */
      try {
        map.off();
      } catch (err) {
        console.warn("ไม่สามารถปิด Map events ได้:", err);
      }

      /*
       * ทำลาย Map หลังสุด
       */
      try {
        map.remove();
      } catch (err) {
        console.warn("ไม่สามารถทำลาย Map ได้:", err);
      }
    };
  }, [loading, error, routeData, districts]);

  // 🟢 2. อัปเดตเฉพาะหมุดสถานประกอบการเมื่อ Filter เปลี่ยน
  useEffect(() => {
    const map = mapRef.current;

    const hubsLayer = hubsLayerRef.current;

    const mapContainer = mapContainerRef.current;

    if (!map || !hubsLayer || !mapContainer || !isMapReady(map, mapContainer)) {
      return;
    }

    try {
      hubsLayer.clearLayers();
    } catch (err) {
      console.warn("ไม่สามารถล้างหมุดสถานประกอบการได้:", err);

      return;
    }

    wellnessHubs.forEach((hub) => {
      if (mapRef.current !== map || !isMapReady(map, mapContainer)) {
        return;
      }

      const coords = extractLatLng(hub);

      if (!coords) {
        return;
      }

      const catInfo = getCategoryInfo(hub);

      if (!catInfo || !activeFilters[catInfo.id]) {
        return;
      }

      const customIcon = createCustomDivIcon(catInfo.color, catInfo.icon);

      const popupHtml = `
        <div style="font-family:'Sarabun',sans-serif; padding:4px; min-width:160px;">
          <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">
            🏢 ${hub.wellnessHubName}
          </strong>

          ${
            hub.districtName || hub.district?.districtName
              ? `
                <span style="font-size:11px; color:#666; display:block;">
                  อ.${hub.districtName || hub.district?.districtName}
                </span>
              `
              : ""
          }

          <span style="font-size:12px; color:${catInfo.color}; font-weight:bold; display:block; margin-top:4px;">
            ✨ ${catInfo.name}
          </span>

          <button
            type="button"
            class="route-popup-detail-button"
            data-license-id="${hub.licenseId || hub.wellnessHubId || ""}"
            style="
              margin-top:8px;
              width:100%;
              padding:6px 10px;
              font-size:12px;
              font-family:'Sarabun',sans-serif;
              font-weight:600;
              color:#ffffff;
              background-color:#2563eb;
              border:none;
              border-radius:6px;
              cursor:pointer;
            "
          >
            ดูรายละเอียดสถานประกอบการ
          </button>
        </div>
      `;

      try {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
        });

        marker.bindPopup(popupHtml);

        marker.on("popupopen", (event) => {
          if (mapRef.current !== map || !isMapReady(map, mapContainer)) {
            return;
          }

          const popupElement = event.popup?.getElement();

          if (!popupElement) {
            return;
          }

          const detailButton = popupElement.querySelector(
            ".route-popup-detail-button",
          );

          if (!detailButton) {
            return;
          }

          detailButton.onclick = () => {
            const licenseId = detailButton.getAttribute("data-license-id");

            if (!licenseId || String(licenseId).trim() === "") {
              return;
            }

            navigate(`/wellness-hubs/${licenseId}`);
          };
        });

        marker.addTo(hubsLayer);
      } catch (err) {
        console.warn(`ไม่สามารถปักหมุด ${hub.wellnessHubName || ""}:`, err);
      }
    });
  }, [activeFilters, wellnessHubs, getCategoryInfo, navigate]);

  const handleToggleFilter = (catId) => {
    setActiveFilters((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 🌟 เปิดหมวดหมู่ทั้งหมด
  const handleShowAllCategories = () => {
    const nextFilters = availableCategories.reduce((acc, cat) => {
      acc[cat.id] = true;

      return acc;
    }, {});

    setActiveFilters(nextFilters);
  };

  // 🌟 ซ่อนหมวดหมู่ทั้งหมด
  const handleHideAllCategories = () => {
    const nextFilters = availableCategories.reduce((acc, cat) => {
      acc[cat.id] = false;

      return acc;
    }, {});

    setActiveFilters(nextFilters);
  };

  // 🌟 กลับไปดูภาพรวมเส้นทางทั้งหมด
  const handleResetRouteView = () => {
    const map = mapRef.current;

    const bounds = routeBoundsRef.current;

    const mapContainer = mapContainerRef.current;

    if (
      !map ||
      !bounds ||
      !bounds.isValid() ||
      !mapContainer ||
      !isMapReady(map, mapContainer)
    ) {
      return;
    }

    try {
      map.stop();

      map.fitBounds(bounds, {
        padding: [50, 50],
        animate: false,
      });
    } catch (err) {
      console.warn("ไม่สามารถแสดงภาพรวมเส้นทางได้:", err);
    }
  };

  // 🌟 กดอำเภอแล้วเลื่อนแผนที่ไปยังอำเภอนั้น
  const handleFocusDistrict = (district) => {
    const map = mapRef.current;

    const coords = extractLatLng(district);

    const mapContainer = mapContainerRef.current;

    if (!map || !coords || !mapContainer || !isMapReady(map, mapContainer)) {
      return;
    }

    try {
      map.stop();

      map.setView([coords.lat, coords.lng], 12, {
        animate: false,
      });

      if (mapContainer.isConnected) {
        mapContainer.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } catch (err) {
      console.warn("ไม่สามารถเลื่อนไปยังอำเภอที่เลือกได้:", err);
    }
  };

  const handleOpenWellnessHub = (licenseId) => {
    if (!licenseId || String(licenseId).trim() === "") {
      return;
    }

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
    <main className="route-detail-page">
      <header className="route-detail-hero">
        <div className="route-detail-container">
          <Link to="/" className="route-detail-back">
            <ArrowLeft />
            กลับหน้าแรก
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

          {availableCategories.length > 0 && (
            <div className="route-detail-map-toolbar">
              <div className="route-detail-map-toolbar__top">
                {/* map counter removed — only controls remain per request */}

                <div className="route-detail-map-actions">
                  <button
                    type="button"
                    className="route-detail-map-action"
                    onClick={handleShowAllCategories}
                  >
                    <Eye />
                    แสดงทั้งหมด
                  </button>

                  <button
                    type="button"
                    className="route-detail-map-action"
                    onClick={handleHideAllCategories}
                  >
                    <EyeOff />
                    ซ่อนทั้งหมด
                  </button>

                  <button
                    type="button"
                    className="route-detail-map-action route-detail-map-action--primary"
                    onClick={handleResetRouteView}
                  >
                    <Maximize2 />
                    ดูเส้นทางทั้งหมด
                  </button>
                </div>
              </div>

              <div className="route-detail-filter-list">
                {availableCategories.map((cat) => {
                  const isChecked = !!activeFilters[cat.id];

                  return (
                    <label
                      key={cat.id}
                      className={`route-detail-filter-chip ${
                        isChecked ? "active" : ""
                      }`}
                      style={{
                        "--route-category-color": cat.color,
                        "--route-category-background": `${cat.color}15`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFilter(cat.id)}
                        style={{
                          accentColor: cat.color,
                        }}
                      />

                      <span>{cat.name}</span>
                    </label>
                  );
                })}
              </div>

              {/* แถวที่ 3: ลำดับอำเภอ (compact, scrollable) */}
              {districts.length > 0 && (
                <div className="route-detail-districts-row">
                  <small className="route-detail-districts-title">
                    ลำดับอำเภอ
                  </small>

                  <div className="route-detail-districts-scroll" role="list">
                    {districts.map((district, idx) => {
                      const order = district.orderNumber || idx + 1;

                      const name =
                        district.districtName ||
                        district.district?.districtName ||
                        "";

                      return (
                        <div
                          className="route-detail-district-item"
                          key={`${district.districtId || idx}-${order}`}
                        >
                          <button
                            type="button"
                            className="route-detail-district-chip"
                            onClick={() => handleFocusDistrict(district)}
                            title={`เลื่อนแผนที่ไปยัง อ. ${name}`}
                          >
                            <span className="route-detail-district-number">
                              {order}
                            </span>

                            <span className="route-detail-district-name">
                              อ. {name}
                            </span>
                          </button>

                          {idx < districts.length - 1 && (
                            <span className="route-detail-district-arrow">
                              →
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="route-detail-map-layout">
            <div className="route-detail-map-card">
              <div
                ref={mapContainerRef}
                className="route-detail-map"
                style={{
                  height: "450px",
                  width: "100%",
                  borderRadius: "12px",
                }}
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

              {availableCategories.map((cat) => (
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

        {/* Removed separate JOURNEY ORDER section — districts now displayed inside map toolbar */}

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
                        <MapPin />
                        อ. {hub.districtName || hub.district?.districtName}
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
