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
  Building2,
  CircleAlert,
  Flag,
  MapPin,
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
  Pencil,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Filter,
  Layers,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LoadingState from "../../Components/LoadingState/LoadingState";
import {
  getCategoryMarkerIcon,
  getCategoryMarkerImage,
} from "../../utils/categoryMarkerIcons";
import "./RouteDetail.css";

const API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_CENTER = [18.7883, 98.9853];

// Cache รายละเอียดเส้นทางระหว่างเปลี่ยนหน้า
const routeDetailCache = new Map();

export const clearRouteDetailCache = (routeId = null) => {
  if (routeId !== null && routeId !== undefined) {
    routeDetailCache.delete(String(routeId));
    return;
  }

  routeDetailCache.clear();
};

const MASTER_CATEGORIES = [
  {
    id: "SPA",
    name: "นวด/สปาเพื่อสุขภาพ",
    color: "#E02873",
    icon: "fa-spa",
    lucideIcon: Sparkles,
  },
  {
    id: "RESTAURANT",
    name: "อาหารและเครื่องดื่ม",
    color: "#0B7D31",
    icon: "fa-utensils",
    lucideIcon: Utensils,
  },
  {
    id: "HOTEL",
    name: "ที่พักฟื้นฟูสุขภาพ",
    color: "#5E27AB",
    icon: "fa-bed",
    lucideIcon: Bed,
  },
  {
    id: "CLINIC",
    name: "คลินิก/สถานพยาบาล",
    color: "#004CB4",
    icon: "fa-notes-medical",
    lucideIcon: HeartPulse,
  },
  {
    id: "ATTRACTION",
    name: "สถานที่ท่องเที่ยว",
    color: "#009BB0",
    icon: "fa-map-location-dot",
    lucideIcon: Palmtree,
  },
  {
    id: "HOSPITAL",
    name: "โรงพยาบาล",
    color: "#BD0915",
    icon: "fa-hospital",
    lucideIcon: Cross,
    alwaysVisible: true,
  },
  {
    id: "RESCUE",
    name: "หน่วยกู้ภัย",
    color: "#C98600",
    icon: "fa-truck-medical",
    lucideIcon: Ambulance,
    alwaysVisible: true,
  },
];

export function getCategoryStyle(categoryId = "") {
  const normalizedId = String(categoryId || "")
    .trim()
    .toUpperCase();

  if (
    normalizedId.includes("C01") ||
    normalizedId.includes("SPA") ||
    normalizedId.includes("MASSAGE") ||
    normalizedId.includes("นวด") ||
    normalizedId.includes("สปา")
  ) {
    return { name: "นวด/สปาเพื่อสุขภาพ", color: "#E02873" };
  }
  if (
    normalizedId.includes("C03") ||
    normalizedId.includes("REST") ||
    normalizedId.includes("FOOD") ||
    normalizedId.includes("อาหาร")
  ) {
    return { name: "อาหารและเครื่องดื่ม", color: "#0B7D31" };
  }
  if (
    normalizedId.includes("C04") ||
    normalizedId.includes("HOTEL") ||
    normalizedId.includes("ACCOM") ||
    normalizedId.includes("ที่พัก")
  ) {
    return { name: "ที่พักฟื้นฟูสุขภาพ", color: "#5E27AB" };
  }
  if (
    normalizedId.includes("C02") ||
    normalizedId.includes("CLINIC") ||
    normalizedId.includes("คลินิก")
  ) {
    return { name: "คลินิก/สถานพยาบาล", color: "#004CB4" };
  }
  if (
    normalizedId.includes("C05") ||
    normalizedId.includes("ATTRACTION") ||
    normalizedId.includes("TOURIS") ||
    normalizedId.includes("TOURISM") ||
    normalizedId.includes("TOURIST") ||
    normalizedId.includes("TRAVEL") ||
    normalizedId.includes("ท่องเที่ยว")
  ) {
    return { name: "สถานที่ท่องเที่ยว", color: "#009BB0" };
  }
  if (
    normalizedId.includes("EM02") ||
    normalizedId.includes("HOSPITAL") ||
    normalizedId.includes("โรงพยาบาล") ||
    normalizedId.includes("ALS") ||
    normalizedId.includes("ADVANCED")
  ) {
    return { name: "โรงพยาบาล", color: "#BD0915" };
  }
  if (
    normalizedId.includes("EM01") ||
    normalizedId.includes("RESCUE") ||
    normalizedId.includes("กู้ภัย") ||
    normalizedId.includes("BLS") ||
    normalizedId.includes("BASIC")
  ) {
    return { name: "หน่วยกู้ภัย", color: "#C98600" };
  }

  return { name: "อื่นๆ", color: "#64748B" };
}

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

  if (
    lat == null ||
    lng == null ||
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

  return { lat: parsedLat, lng: parsedLng };
}

function isMapReady(map, container) {
  if (!map || !container || !container.isConnected) return false;
  try {
    return map.getContainer?.() === container && Boolean(map._loaded);
  } catch {
    return false;
  }
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return (
    text !== "" && text !== "#ERROR!" && text !== "undefined" && text !== "null"
  );
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
    } catch {
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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 🗺️ Cache สำหรับเก็บ GeoJSON ขอบเขตอำเภอจริงจาก OpenStreetMap
const districtGeoJsonCache = new Map();

async function fetchDistrictPolygon(districtName) {
  if (!districtName) return null;
  const cleanName = String(districtName)
    .replace(/^อำเภอ\s*/i, "")
    .replace(/^อ\.\s*/i, "")
    .trim();

  if (!cleanName) return null;

  if (districtGeoJsonCache.has(cleanName)) {
    return districtGeoJsonCache.get(cleanName);
  }

  const queries = [
    `อำเภอ ${cleanName} จังหวัดเชียงใหม่`,
    `อำเภอ ${cleanName} เชียงใหม่`,
    `อำเภอ${cleanName}`,
    `Amphoe ${cleanName} Chiang Mai`,
    `${cleanName} Chiang Mai`,
  ];

  for (const queryStr of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        queryStr,
      )}&format=geojson&polygon_geojson=1&limit=8`;

      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      if (data && Array.isArray(data.features) && data.features.length > 0) {
        // ค้นหา feature ที่มี geometry เป็น Polygon หรือ MultiPolygon
        const polygonFeature = data.features.find(
          (f) =>
            f.geometry &&
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"),
        );

        if (polygonFeature) {
          districtGeoJsonCache.set(cleanName, polygonFeature);
          return polygonFeature;
        }
      }
    } catch (err) {
      console.warn("Error fetching query:", queryStr, err);
    }
  }

  return null;
}

export default function RouteDetail() {
  const { routeId } = useParams();
  const navigate = useNavigate();

  const normalizedRouteId = Number(routeId);
  const routeCacheKey = String(routeId);

  const [routeData, setRouteData] = useState(() => {
    return routeDetailCache.get(routeCacheKey) ?? null;
  });

  const [loading, setLoading] = useState(() => {
    return !routeDetailCache.has(routeCacheKey);
  });

  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [isEditingDistricts, setIsEditingDistricts] = useState(false);
  const [visibleDistrictIds, setVisibleDistrictIds] = useState([]);
  const [isControlCollapsed, setIsControlCollapsed] = useState(false);

  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.invalidateSize();
        } catch {}
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isControlCollapsed]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const hubsLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const routingControlRef = useRef(null);
  const routeBoundsRef = useRef(null);
  const hubMarkersRef = useRef(new Map());
  const hubHighlightRef = useRef(null);

  const getCategoryInfo = useCallback((hub) => {
    if (!hub) {
      return {
        id: "OTHER",
        name: "อื่นๆ",
        color: "#64748B",
        icon: "fa-location-dot",
      };
    }

    const catKey = (
      hub.categoryKey ||
      hub.categoryName ||
      hub.categoryId ||
      hub.id ||
      hub.category?.categoryId ||
      hub.category?.categoryName ||
      ""
    )
      .toString()
      .toUpperCase();

    if (
      catKey.includes("EM02") ||
      catKey.includes("HOSPITAL") ||
      catKey.includes("โรงพยาบาล") ||
      catKey.includes("ALS") ||
      catKey.includes("ADVANCED")
    ) {
      return MASTER_CATEGORIES.find((c) => c.id === "HOSPITAL");
    }
    if (
      catKey.includes("EM01") ||
      catKey.includes("RESCUE") ||
      catKey.includes("กู้ภัย") ||
      catKey.includes("BLS") ||
      catKey.includes("BASIC")
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
      catKey.includes("TOURIS") ||
      catKey.includes("TOURISM") ||
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

  const availableCategories = useMemo(() => {
    const foundCategoryIds = new Set();

    // 1. ดึงหมวดหมู่ที่ถูกบันทึกไว้กับเส้นทางในฐานข้อมูล (routeData.categories)
    if (Array.isArray(routeData?.categories)) {
      routeData.categories.forEach((cat) => {
        const info = getCategoryInfo(cat);
        if (info?.id && info.id !== "OTHER") {
          foundCategoryIds.add(info.id);
        }
      });
    }

    // 2. รวมหมวดหมู่ที่มีสถานประกอบการอยู่จริงใน wellnessHubs
    wellnessHubs.forEach((hub) => {
      const info = getCategoryInfo(hub);
      if (info?.id && info.id !== "OTHER") {
        foundCategoryIds.add(info.id);
      }
    });

    return MASTER_CATEGORIES.filter((cat) => foundCategoryIds.has(cat.id));
  }, [routeData, wellnessHubs, getCategoryInfo]);

  const loadRouteDetail = useCallback(
    async (forceRefresh = false) => {
      const normalizedRouteId = Number(routeId);
      const cacheKey = String(routeId);

      if (
        !Number.isInteger(normalizedRouteId) ||
        normalizedRouteId <= 0
      ) {
        setRouteData(null);
        setError("รหัสเส้นทางไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      // มี Cache แล้ว → ใช้ทันที ไม่ยิง API ซ้ำ
      if (
        routeDetailCache.has(cacheKey) &&
        !forceRefresh
      ) {
        setRouteData(
          routeDetailCache.get(cacheKey)
        );

        setError("");
        setLoading(false);

        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          `${API_BASE_URL}/home/routes/${normalizedRouteId}`,
          {
            // เพิ่มจาก 15 วินาที → 30 วินาที
            timeout: 30000,
          }
        );

        if (!response.data) {
          setRouteData(null);
          setError(
            "ไม่พบข้อมูลเส้นทางที่ต้องการ"
          );

          return;
        }

        const data = response.data;

        // เก็บข้อมูล Route นี้ไว้ใน Cache
        routeDetailCache.set(
          cacheKey,
          data
        );

        setRouteData(data);

      } catch (requestError) {

        setRouteData(null);

        setError(
          requestError.code === "ECONNABORTED"
            ? "โหลดข้อมูลเส้นทางใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
            : requestError.response?.data?.message ||
              "ไม่สามารถโหลดรายละเอียดเส้นทางได้"
        );

      } finally {

        setLoading(false);

      }
    },
    [routeId]
  );

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (isMounted) {
        await loadRouteDetail();
      }
    };
    fetch();

    return () => {
      isMounted = false;
    };
  }, [loadRouteDetail]);

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
    if (!Array.isArray(routeData?.districts)) return [];
    return [...routeData.districts].sort(
      (a, b) => Number(a.orderNumber || 0) - Number(b.orderNumber || 0),
    );
  }, [routeData]);

  useEffect(() => {
    if (!districts.length) {
      setVisibleDistrictIds([]);
      return;
    }
    setVisibleDistrictIds(
      districts.map((d, i) => String(d.districtId ?? `district-${i}`)),
    );
  }, [districts]);

  const visibleDistricts = useMemo(() => {
    const visibleDistrictSet = new Set(visibleDistrictIds);
    return districts.filter((d, i) =>
      visibleDistrictSet.has(String(d.districtId ?? `district-${i}`)),
    );
  }, [districts, visibleDistrictIds]);

  const visibleWellnessHubs = useMemo(() => {
    if (!wellnessHubs.length || !visibleDistricts.length) return [];

    const visibleDistrictIdSet = new Set(
      visibleDistricts
        .map((d) => d.districtId ?? d.district?.districtId)
        .filter((id) => id != null && String(id).trim() !== "")
        .map(String),
    );

    const cleanDistrictName = (name) => {
      if (!name) return "";
      return String(name)
        .replace(/^อำเภอ\s*/i, "")
        .replace(/^อ\.\s*/i, "")
        .trim()
        .toLowerCase();
    };

    const visibleDistrictCleanNames = new Set(
      visibleDistricts
        .map((d) => d.districtName || d.district?.districtName || "")
        .map(cleanDistrictName)
        .filter(Boolean),
    );

    return wellnessHubs.filter((hub) => {
      const hubDistrictId = hub.districtId ?? hub.district?.districtId ?? null;
      const hubDistrictName =
        hub.districtName || hub.district?.districtName || "";
      const cleanedHubDistrictName = cleanDistrictName(hubDistrictName);

      // 1. ตรวจสอบตาม District ID (ถ้ามี)
      if (hubDistrictId != null && String(hubDistrictId).trim() !== "") {
        if (visibleDistrictIdSet.has(String(hubDistrictId))) {
          return true;
        }
      }

      // 2. ตรวจสอบตาม District Name (เปรียบเทียบหลังตัดคำว่า อำเภอ/อ.)
      if (
        cleanedHubDistrictName &&
        visibleDistrictCleanNames.has(cleanedHubDistrictName)
      ) {
        return true;
      }

      // 3. Fallback: ถ้าไม่มี ID/Name ชัดเจน ให้ตรวจสอบว่าที่อยู่ (address) มีชื่ออำเภอที่เปิดอยู่อยู่หรือไม่
      if (!hubDistrictId && !cleanedHubDistrictName && hub.address) {
        const addressText = String(hub.address).toLowerCase();
        for (const cleanName of visibleDistrictCleanNames) {
          if (cleanName && addressText.includes(cleanName)) {
            return true;
          }
        }
      }

      return false;
    });
  }, [wellnessHubs, visibleDistricts]);

  const handleToggleDistrictVisibility = (district, index) => {
    const districtKey = String(district.districtId ?? `district-${index}`);
    setVisibleDistrictIds((curr) =>
      curr.includes(districtKey)
        ? curr.filter((id) => id !== districtKey)
        : [...curr, districtKey],
    );
  };

  // 🗺️ 1. สร้าง Map Instance ครั้งเดียว
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (loading || error || !routeData || !mapContainer) return;

    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
    }

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch {}
      mapRef.current = null;
    }

    const map = L.map(mapContainer, {
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: true,
      keyboard: true,
    });

    mapRef.current = map;
    map.setView(DEFAULT_CENTER, 11);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        opacity: 0.78,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map);

    hubsLayerRef.current = L.layerGroup().addTo(map);
    districtLayerRef.current = L.layerGroup().addTo(map);

    const timer = setTimeout(() => {
      if (mapRef.current === map && isMapReady(map, mapContainer)) {
        map.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      hubMarkersRef.current.clear();
      hubHighlightRef.current = null;
      if (routingControlRef.current) {
        try {
          const ctrl = routingControlRef.current;
          ctrl.off();
          if (ctrl._map) {
            ctrl._map.removeControl(ctrl);
          }
        } catch {}
        routingControlRef.current = null;
      }
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, [loading, error, routeData]);

  // 🚗 2. คำนวณเส้นทาง OSRM ตามถนนจริง และปักหมุดอำเภอ
  useEffect(() => {
    const map = mapRef.current;
    const districtLayer = districtLayerRef.current;
    const mapContainer = mapContainerRef.current;

    if (
      !map ||
      !districtLayer ||
      !mapContainer ||
      !isMapReady(map, mapContainer)
    )
      return;

    districtLayer.clearLayers();

    visibleDistricts.forEach((district, index) => {
      const coords = extractLatLng(district);
      if (!coords) return;

      // 🌟 ปักหมุดลำดับตัวเลขอำเภอ
      L.circleMarker([coords.lat, coords.lng], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1a2332",
        fillOpacity: 1,
      }).addTo(districtLayer).bindPopup(`
        <div style="font-family:'Sarabun',sans-serif;text-align:center;padding:2px;">
          <span style="font-size:11px;color:#64748b;font-weight:bold;display:block;">
            จุดที่ ${district.orderNumber || index + 1}
          </span>
          <strong style="font-size:14px;color:#0f172a;">
            อำเภอ${district.districtName || district.district?.districtName || ""}
          </strong>
        </div>
      `);
    });

    const activeRouting = routingControlRef.current;
    if (activeRouting) {
      try {
        activeRouting.off();
        if (activeRouting._map === map) {
          map.removeControl(activeRouting);
        }
      } catch {}
      routingControlRef.current = null;
    }

    const waypoints = visibleDistricts
      .map((d) => extractLatLng(d))
      .filter(Boolean)
      .map((c) => L.latLng(c.lat, c.lng));

    if (waypoints.length === 0) {
      routeBoundsRef.current = null;
      return;
    }

    try {
      const bounds = L.latLngBounds(waypoints);
      routeBoundsRef.current = bounds.isValid() ? bounds : null;
    } catch {
      routeBoundsRef.current = null;
    }

    let routingControlInstance = null;

    if (waypoints.length >= 2) {
      try {
        routingControlInstance = L.Routing.control({
          waypoints,
          router: L.Routing.osrmv1({
            serviceUrl: "https://router.project-osrm.org/route/v1",
            timeout: 15000,
          }),
          lineOptions: {
            styles: [{ color: "#28a745", weight: 5, opacity: 0.85 }],
          },
          createMarker: () => null,
          show: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: false,
        });

        routingControlInstance.addTo(map);
        routingControlRef.current = routingControlInstance;
      } catch (err) {
        console.warn("Routing creation error:", err);
      }
    }

    return () => {
      if (routingControlInstance) {
        try {
          routingControlInstance.off();
          if (routingControlInstance._map === map) {
            map.removeControl(routingControlInstance);
          }
        } catch {}
        if (routingControlRef.current === routingControlInstance) {
          routingControlRef.current = null;
        }
      }
    };
  }, [visibleDistricts]);

  // 📍 3. วาดหมุดสถานประกอบการ + Popup
  useEffect(() => {
    const map = mapRef.current;
    const hubsLayer = hubsLayerRef.current;
    const mapContainer = mapContainerRef.current;

    if (!map || !hubsLayer || !mapContainer || !isMapReady(map, mapContainer))
      return;

    hubsLayer.clearLayers();
    hubMarkersRef.current.clear();

    if (hubHighlightRef.current) {
      try {
        map.removeLayer(hubHighlightRef.current);
      } catch {}
      hubHighlightRef.current = null;
    }

    visibleWellnessHubs.forEach((hub) => {
      const coords = extractLatLng(hub);
      if (!coords) return;

      const catInfo = getCategoryInfo(hub);
      if (!catInfo || !activeFilters[catInfo.id]) return;

      const customIcon = getCategoryMarkerIcon(catInfo?.id || hub, [32, 44]);
      const imageSource = normalizeImageSource(hub.wellnessHubImg);
      const licenseId = hub.licenseId || hub.wellnessHubId || "";
      const districtName = hub.districtName || hub.district?.districtName || "";

      const safeName = escapeHtml(hub.wellnessHubName || "");
      const safeCategory = escapeHtml(catInfo.name || "");
      const safeDistrict = escapeHtml(districtName);
      const safeAddress = escapeHtml(hub.address || "");
      const safeTel = escapeHtml(hub.telInformation || "");
      const safeDescription = escapeHtml(hub.wellnessHubDescription || "");
      const safeImage = escapeHtml(imageSource);
      const safeLicenseId = escapeHtml(licenseId);

      const popupHtml = `
        <div class="route-hub-popup">
          <div class="route-hub-popup__image">
            ${
              imageSource
                ? `
                  <img
                    src="${safeImage}"
                    alt="${safeName}"
                    loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                  />
                  <div class="route-hub-popup__image-fallback" style="display:none;--popup-category-color:${catInfo.color};--popup-category-background:${catInfo.color}18;">
                    <span class="route-hub-popup__image-fallback-icon"><i class="fa-solid ${catInfo.icon}"></i></span>
                    <span class="route-hub-popup__image-fallback-text">${safeCategory}</span>
                  </div>
                `
                : `
                  <div class="route-hub-popup__image-fallback" style="display:flex;--popup-category-color:${catInfo.color};--popup-category-background:${catInfo.color}18;">
                    <span class="route-hub-popup__image-fallback-icon"><i class="fa-solid ${catInfo.icon}"></i></span>
                    <span class="route-hub-popup__image-fallback-text">${safeCategory}</span>
                  </div>
                `
            }
          </div>
          <div class="route-hub-popup__content">
            ${
              hasValue(catInfo.name)
                ? `
              <div class="route-hub-popup__category">
                <span class="route-hub-popup__category-dot" style="background:${catInfo.color};"></span>
                <span>${safeCategory}</span>
              </div>
            `
                : ""
            }
            ${hasValue(hub.wellnessHubName) ? `<h3 class="route-hub-popup__title">${safeName}</h3>` : ""}
            ${
              hasValue(districtName) ||
              hasValue(hub.address) ||
              hasValue(hub.telInformation)
                ? `
              <div class="route-hub-popup__meta">
                ${
                  hasValue(districtName)
                    ? `
                  <div class="route-hub-popup__meta-row">
                    <span class="route-hub-popup__meta-icon"><i class="fa-solid fa-location-dot"></i></span>
                    <span>อ. ${safeDistrict}</span>
                  </div>
                `
                    : ""
                }
                ${
                  hasValue(hub.address)
                    ? `
                  <div class="route-hub-popup__meta-row route-hub-popup__meta-row--address">
                    <span class="route-hub-popup__meta-icon"><i class="fa-solid fa-map"></i></span>
                    <span>${safeAddress}</span>
                  </div>
                `
                    : ""
                }
                ${
                  hasValue(hub.telInformation)
                    ? `
                  <div class="route-hub-popup__meta-row">
                    <span class="route-hub-popup__meta-icon"><i class="fa-solid fa-phone"></i></span>
                    <span>${safeTel}</span>
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
            ${hasValue(hub.wellnessHubDescription) ? `<p class="route-hub-popup__description">${safeDescription}</p>` : ""}
            ${
              hasValue(licenseId)
                ? `
              <button type="button" class="route-hub-popup__button" data-license-id="${safeLicenseId}">
                <span>ดูรายละเอียดเพิ่มเติม</span>
                <span class="route-hub-popup__button-arrow" aria-hidden="true">→</span>
              </button>
            `
                : ""
            }
          </div>
        </div>
      `;

      try {
        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });
        marker.bindPopup(popupHtml, {
          closeButton: true,
          autoPan: false,
          maxWidth: 286,
          minWidth: 286,
          className: "route-hub-leaflet-popup",
        });

        marker.on("popupopen", (event) => {
          const popupElement = event.popup?.getElement();
          const detailButton = popupElement?.querySelector(
            ".route-hub-popup__button",
          );
          if (detailButton) {
            detailButton.onclick = () => {
              const selectedLicenseId =
                detailButton.getAttribute("data-license-id");
              if (selectedLicenseId)
                navigate(`/wellness-hubs/${selectedLicenseId}`);
            };
          }
        });

        marker.addTo(hubsLayer);
        const markerKey = String(hub.licenseId || hub.wellnessHubId || "");
        if (markerKey) hubMarkersRef.current.set(markerKey, marker);
      } catch (err) {
        console.warn("Marker bind error:", err);
      }
    });
  }, [visibleWellnessHubs, activeFilters, getCategoryInfo, navigate]);

  const handleToggleFilter = (catId) => {
    setActiveFilters((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleShowAllCategories = () => {
    const nextFilters = availableCategories.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: true }),
      {},
    );
    setActiveFilters(nextFilters);
  };

  const handleHideAllCategories = () => {
    const nextFilters = availableCategories.reduce(
      (acc, cat) => ({ ...acc, [cat.id]: false }),
      {},
    );
    setActiveFilters(nextFilters);
  };

  const handleResetRouteView = () => {
    const map = mapRef.current;
    const bounds = routeBoundsRef.current;
    if (!map || !bounds || !bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [50, 50], animate: false });
  };

  const handleFocusDistrict = (district) => {
    const map = mapRef.current;
    const coords = extractLatLng(district);
    const mapContainer = mapContainerRef.current;
    if (!map || !coords || !mapContainer) return;

    map.flyTo([coords.lat, coords.lng], 12, { animate: true, duration: 0.5 });
    mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleFocusWellnessHub = (hub) => {
    const map = mapRef.current;
    const mapContainer = mapContainerRef.current;
    if (!map || !mapContainer) return;

    const coords = extractLatLng(hub);
    if (!coords) return;

    const catInfo = getCategoryInfo(hub);
    const markerKey = String(hub.licenseId || hub.wellnessHubId || "");
    const marker = hubMarkersRef.current.get(markerKey);

    if (catInfo?.id && !activeFilters[catInfo.id]) {
      setActiveFilters((cur) => ({ ...cur, [catInfo.id]: true }));
      map.setView([coords.lat, coords.lng], 13, { animate: false });
      mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    map.setView([coords.lat, coords.lng], 13, { animate: false });

    if (hubHighlightRef.current) {
      try {
        map.removeLayer(hubHighlightRef.current);
      } catch {}
      hubHighlightRef.current = null;
    }

    const highlight = L.circleMarker([coords.lat, coords.lng], {
      radius: 25,
      color: catInfo?.color || "#795548",
      weight: 4,
      opacity: 0.95,
      fillColor: catInfo?.color || "#795548",
      fillOpacity: 0.1,
      interactive: false,
      className: "route-detail-hub-highlight",
    }).addTo(map);

    hubHighlightRef.current = highlight;
    mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });

    if (!marker) return;

    setTimeout(() => {
      marker.openPopup();
      setTimeout(() => {
        if (!mapRef.current) return;
        const mapSize = map.getSize();
        const markerPoint = map.latLngToContainerPoint([
          coords.lat,
          coords.lng,
        ]);

        const targetPoint = L.point(
          mapSize.x * 0.5,
          Math.max(120, mapSize.y - 42),
        );

        const offset = markerPoint.subtract(targetPoint);
        map.panBy(offset, { animate: true, duration: 0.35 });
      }, 100);
    }, 250);
  };

  if (loading) {
    return (
      <LoadingState
        fullPage
        title="กำลังโหลดรายละเอียดเส้นทาง"
        message="ระบบกำลังเตรียมข้อมูลแผนที่ อำเภอ และสถานประกอบการ"
      />
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
              <button
                type="button"
                onClick={() => loadRouteDetail(true)}
              >
                <RefreshCw />
                ลองใหม่
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

          {/* รายการ Categories ของ Route (กรอง EM ออก และใช้ชื่อจาก getCategoryStyle ให้เหมือนหน้า Home 100%) */}
          {Array.isArray(routeData.categories) &&
            routeData.categories.length > 0 && (
              <div
                className="route-detail-categories"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "16px",
                  marginBottom: "8px",
                }}
              >
                {routeData.categories
                  .filter((category) => {
                    const categoryId = String(category?.categoryId || "")
                      .trim()
                      .toUpperCase();
                    return !categoryId.startsWith("EM");
                  })
                  .map((category, index) => {
                    const categoryStyle = getCategoryStyle(category.categoryId);
                    const displayName =
                      categoryStyle?.name || category.categoryName || "อื่นๆ";
                    const displayColor = categoryStyle?.color || "#64748B";

                    return (
                      <span
                        key={category.categoryId || index}
                        className="route-detail-category-badge"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 12px",
                          borderRadius: "9999px",
                          fontSize: "13px",
                          fontWeight: "500",
                          backgroundColor: `${displayColor}15`,
                          color: displayColor,
                          border: `1px solid ${displayColor}30`,
                        }}
                      >
                        {displayName}
                      </span>
                    );
                  })}
              </div>
            )}
        </div>
      </header>

      <div className="route-detail-container route-detail-content">
        <section className="route-detail-section route-detail-section--explorer">
          <div className="route-detail-heading">
            <div>
              <p>ROUTE MAP</p>
              <h2>แผนที่เส้นทาง</h2>
            </div>
          </div>

          <div className="route-detail-explorer">
            <div className="route-detail-explorer__map">
              <div className="route-detail-map-workspace">
                {availableCategories.length > 0 && (
                  <div
                    className={`route-detail-map-toolbar ${
                      isControlCollapsed ? "route-detail-map-toolbar--collapsed" : ""
                    }`}
                  >
                    {/* 🌟 1. UNIFIED TOOLBAR HEADER */}
                    <div className="route-detail-map-toolbar__header">
                      <div className="route-detail-map-toolbar__title-area">
                        <div className="route-detail-map-toolbar__icon">
                          <SlidersHorizontal size={17} />
                        </div>
                        <div>
                          <h3 className="route-detail-map-toolbar__title">
                            ตัวกรอง & แผนที่เส้นทาง
                          </h3>
                          <span className="route-detail-map-toolbar__subtitle">
                            แสดง{" "}
                            {
                              Object.values(activeFilters).filter(Boolean)
                                .length
                            }
                            /{availableCategories.length} หมวดหมู่
                          </span>
                        </div>
                      </div>

                      <div className="route-detail-map-actions">
                        <button
                          type="button"
                          className="route-detail-map-action route-detail-map-action--primary"
                          onClick={handleResetRouteView}
                          title="รีเซ็ตและซูมแสดงเส้นทางทั้งหมด"
                        >
                          <Maximize2 size={15} />
                          <span>ดูเส้นทางทั้งหมด</span>
                        </button>

                        <button
                          type="button"
                          className={`route-detail-map-action route-detail-map-action--toggle ${
                            isControlCollapsed ? "active" : ""
                          }`}
                          onClick={() => setIsControlCollapsed((c) => !c)}
                          title={
                            isControlCollapsed
                              ? "ขยายแถบตัวกรอง"
                              : "ยุบแถบตัวกรอง"
                          }
                        >
                          {isControlCollapsed ? (
                            <>
                              <ChevronDown size={16} />
                              <span>แสดงตัวกรอง</span>
                            </>
                          ) : (
                            <>
                              <ChevronUp size={16} />
                              <span>ยุบตัวกรอง</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 🌟 2. COLLAPSIBLE TOOLBAR BODY */}
                    {!isControlCollapsed && (
                      <div className="route-detail-map-toolbar__body">
                        {/* Section A: หมวดหมู่สถานประกอบการ */}
                        <div className="route-detail-filter-section">
                          <div className="route-detail-filter-header">
                            <span className="route-detail-filter-label">
                              <Filter size={13} /> หมวดหมู่สถานประกอบการ
                            </span>
                            <div className="route-detail-filter-quick-btns">
                              <button
                                type="button"
                                className="route-detail-btn-subtle"
                                onClick={handleShowAllCategories}
                              >
                                <Eye size={13} /> แสดงทั้งหมด
                              </button>
                              <button
                                type="button"
                                className="route-detail-btn-subtle"
                                onClick={handleHideAllCategories}
                              >
                                <EyeOff size={13} /> ซ่อนทั้งหมด
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
                                    style={{ accentColor: cat.color }}
                                  />
                                  <span>{cat.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section B: ลำดับอำเภอในเส้นทาง */}
                        {districts.length > 0 && (
                          <div className="route-detail-districts-row">
                            <div className="route-detail-districts-header">
                              <div className="route-detail-districts-heading">
                                <Layers size={13} />
                                <span className="route-detail-districts-title">
                                  ลำดับอำเภอในเส้นทาง
                                </span>
                              </div>

                              <button
                                type="button"
                                className={`route-detail-district-edit ${
                                  isEditingDistricts ? "active" : ""
                                }`}
                                onClick={() => setIsEditingDistricts((c) => !c)}
                              >
                                <Pencil size={13} aria-hidden="true" />
                                <span>
                                  {isEditingDistricts
                                    ? "เสร็จสิ้น"
                                    : "แก้ไขเส้นทาง"}
                                </span>
                              </button>
                            </div>

                            {isEditingDistricts && (
                              <p className="route-detail-districts-help">
                                เลือกอำเภอที่ต้องการแสดงบนแผนที่
                                หมุดและเส้นทางจะปรับตามรายการที่เลือก
                              </p>
                            )}

                            <div
                              className="route-detail-districts-scroll"
                              role="list"
                            >
                              {districts.map((district, idx) => {
                                const order = district.orderNumber || idx + 1;
                                const name =
                                  district.districtName ||
                                  district.district?.districtName ||
                                  "";
                                const districtKey = String(
                                  district.districtId ?? `district-${idx}`,
                                );
                                const isDistrictVisible =
                                  visibleDistrictIds.includes(districtKey);

                                return (
                                  <div
                                    className={`route-detail-district-item ${
                                      !isDistrictVisible
                                        ? "route-detail-district-item--hidden"
                                        : ""
                                    }`}
                                    key={`${
                                      district.districtId || idx
                                    }-${order}`}
                                    role="listitem"
                                  >
                                    <div
                                      className={`route-detail-district-chip-wrapper ${
                                        isEditingDistricts
                                          ? "route-detail-district-chip-wrapper--editing"
                                          : ""
                                      }`}
                                    >
                                      {isEditingDistricts && (
                                        <label
                                          className="route-detail-district-toggle"
                                          title={`${
                                            isDistrictVisible ? "ซ่อน" : "แสดง"
                                          } อ. ${name}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isDistrictVisible}
                                            onChange={() =>
                                              handleToggleDistrictVisibility(
                                                district,
                                                idx,
                                              )
                                            }
                                          />
                                          <span
                                            className="route-detail-district-checkbox"
                                            aria-hidden="true"
                                          />
                                        </label>
                                      )}

                                      <button
                                        type="button"
                                        className="route-detail-district-chip"
                                        onClick={() =>
                                          handleFocusDistrict(district)
                                        }
                                      >
                                        <span className="route-detail-district-number">
                                          {order}
                                        </span>
                                        <span className="route-detail-district-name">
                                          อ. {name}
                                        </span>
                                      </button>
                                    </div>

                                    {idx < districts.length - 1 && (
                                      <span
                                        className="route-detail-district-arrow"
                                        aria-hidden="true"
                                      >
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
                  </div>
                )}

                <div className="route-detail-map-card">
                  <div ref={mapContainerRef} className="route-detail-map" />
                </div>

                <aside className="route-detail-legend">
                  <div className="route-detail-legend__header">
                    <h3>คำอธิบายสัญลักษณ์</h3>
                  </div>
                  <div className="route-detail-legend__list">
                    <div className="route-detail-legend__item">
                      <span className="route-detail-legend__marker-district" />
                      <p>อำเภอตามลำดับเส้นทาง</p>
                    </div>

                    {availableCategories.map((cat) => (
                      <div key={cat.id} className="route-detail-legend__item">
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: cat.color,
                            display: "inline-block",
                          }}
                        />
                        <p>{cat.name}</p>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>

            <div className="route-detail-explorer__places">
              <div className="route-detail-explorer__places-header">
                <div>
                  <p>WELLNESS PLACES</p>
                  <h2>สถานประกอบการในเส้นทาง</h2>
                  <span>เลือกสถานประกอบการเพื่อดูรายละเอียดเพิ่มเติม</span>
                </div>
                <span className="route-detail-explorer__places-count">
                  {visibleWellnessHubs.length} แห่ง
                </span>
              </div>



              <div className="route-detail-explorer__places-scroll">
                {visibleWellnessHubs.length > 0 ? (
                  <div className="route-detail-hub-grid">
                    {visibleWellnessHubs.map((hub) => {
                      const catInfo = getCategoryInfo(hub);
                      return (
                        <article
                          key={hub.licenseId || hub.wellnessHubId}
                          className="route-detail-hub-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleFocusWellnessHub(hub)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleFocusWellnessHub(hub);
                            }
                          }}
                        >
                          <div className="route-detail-hub-card__category">
                            <img
                              src={getCategoryMarkerImage(hub)}
                              alt={hub.categoryName || catInfo.name}
                              className="route-detail-hub-card__category-pin"
                              loading="lazy"
                            />
                            <p>{hub.categoryName || catInfo.name}</p>
                          </div>

                          <h3>{hub.wellnessHubName}</h3>

                          {(hub.districtName || hub.district?.districtName) && (
                            <p className="route-detail-hub-card__location">
                              <MapPin /> อ.{" "}
                              {hub.districtName || hub.district?.districtName}
                            </p>
                          )}

                          {hub.wellnessHubDescription && (
                            <p className="route-detail-hub-card__description">
                              {hub.wellnessHubDescription}
                            </p>
                          )}

                          <div className="route-detail-hub-card__focus">
                            <span className="route-detail-hub-card__focus-icon">
                              <MapPin aria-hidden="true" />
                            </span>
                            <span>ดูตำแหน่งบนแผนที่</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="route-detail-empty">
                    <Store />
                    <h3>ยังไม่มีสถานประกอบการ</h3>
                    <p>
                      ไม่พบสถานประกอบการที่ตรงกับอำเภอและหมวดหมู่ของเส้นทางนี้
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
