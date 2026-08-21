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

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  const text = String(value).trim();

  return (
    text !== "" && text !== "#ERROR!" && text !== "undefined" && text !== "null"
  );
}

function normalizeImageSource(imageValue) {
  if (!hasValue(imageValue)) {
    return "";
  }

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

  if (!hasValue(normalizedValue)) {
    return "";
  }

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

export default function RouteDetail() {
  const { routeId } = useParams();
  const navigate = useNavigate();

  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [isEditingDistricts, setIsEditingDistricts] = useState(false);
  const [visibleDistrictIds, setVisibleDistrictIds] = useState([]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const hubsLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const routingControlRef = useRef(null);
  const routeBoundsRef = useRef(null);

  /* ใช้สำหรับเชื่อม Card ด้านขวากับ Marker บนแผนที่ */
  const hubMarkersRef = useRef(new Map());
  const hubHighlightRef = useRef(null);

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

  const availableCategories = useMemo(() => {
    if (!wellnessHubs.length) {
      return [];
    }

    const foundCategoryIds = new Set(
      wellnessHubs.map((hub) => getCategoryInfo(hub)?.id).filter(Boolean),
    );

    return MASTER_CATEGORIES.filter((cat) => foundCategoryIds.has(cat.id));
  }, [wellnessHubs, getCategoryInfo]);

  const loadRouteDetail = useCallback(async () => {
    const normalizedRouteId = Number(routeId);

    console.log("RouteDetail URL param:", routeId);
    console.log("RouteDetail normalized ID:", normalizedRouteId);

    if (!Number.isInteger(normalizedRouteId) || normalizedRouteId <= 0) {
      setRouteData(null);
      setError("รหัสเส้นทางไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const apiUrl = `${API_BASE_URL}/home/routes/${normalizedRouteId}`;

    try {
      console.log("กำลังเรียก API:", apiUrl);

      const response = await axios.get(apiUrl, {
        timeout: 60000,
      });

      console.log("Route Detail status:", response.status);
      console.log("Route Detail routeId:", response.data?.routeId);

      if (!response.data) {
        setRouteData(null);
        setError("ไม่พบข้อมูลเส้นทางที่ต้องการ");
        return;
      }

      const responseRouteId = Number(response.data.routeId);

      if (
        !Number.isInteger(responseRouteId) ||
        responseRouteId !== normalizedRouteId
      ) {
        console.error("Route ID ไม่ตรงกัน", {
          requested: normalizedRouteId,
          received: response.data.routeId,
        });

        setRouteData(null);
        setError("ข้อมูลเส้นทางที่ได้รับไม่ตรงกับเส้นทางที่เลือก");
        return;
      }

      setRouteData(response.data);
    } catch (requestError) {
      console.error("Route Detail API ERROR", {
        requestedRouteId: normalizedRouteId,
        url: requestError.config?.url,
        method: requestError.config?.method,
        status: requestError.response?.status,
        statusText: requestError.response?.statusText,
        code: requestError.code,
        message: requestError.message,
        responseData: requestError.response?.data,
      });

      setRouteData(null);

      if (requestError.code === "ECONNABORTED") {
        setError("โหลดข้อมูลเส้นทางใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
        return;
      }

      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "ไม่สามารถโหลดรายละเอียดเส้นทางได้ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadRouteDetail();
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
    if (!Array.isArray(routeData?.districts)) {
      return [];
    }

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
      districts.map((district, index) =>
        String(district.districtId ?? `district-${index}`),
      ),
    );
  }, [districts]);

  const visibleDistricts = useMemo(() => {
    const visibleDistrictSet = new Set(visibleDistrictIds);

    return districts.filter((district, index) => {
      const districtKey = String(district.districtId ?? `district-${index}`);

      return visibleDistrictSet.has(districtKey);
    });
  }, [districts, visibleDistrictIds]);

  const visibleWellnessHubs = useMemo(() => {
    if (!wellnessHubs.length) {
      return [];
    }

    if (!visibleDistricts.length) {
      return [];
    }

    const visibleDistrictIdSet = new Set(
      visibleDistricts
        .map((district) => district.districtId)
        .filter(
          (districtId) =>
            districtId !== null &&
            districtId !== undefined &&
            String(districtId).trim() !== "",
        )
        .map((districtId) => String(districtId)),
    );

    const visibleDistrictNames = new Set(
      visibleDistricts
        .map(
          (district) =>
            district.districtName || district.district?.districtName || "",
        )
        .map((name) => String(name).trim())
        .filter(Boolean),
    );

    return wellnessHubs.filter((hub) => {
      const hubDistrictId = hub.districtId ?? hub.district?.districtId ?? null;

      const hubDistrictName = String(
        hub.districtName || hub.district?.districtName || "",
      ).trim();

      if (
        hubDistrictId !== null &&
        hubDistrictId !== undefined &&
        String(hubDistrictId).trim() !== ""
      ) {
        return visibleDistrictIdSet.has(String(hubDistrictId));
      }

      return visibleDistrictNames.has(hubDistrictName);
    });
  }, [wellnessHubs, visibleDistricts]);

  const handleToggleDistrictVisibility = (district, index) => {
    const districtKey = String(district.districtId ?? `district-${index}`);

    setVisibleDistrictIds((currentIds) => {
      if (currentIds.includes(districtKey)) {
        return currentIds.filter((id) => id !== districtKey);
      }

      return [...currentIds, districtKey];
    });
  };

  useEffect(() => {
    const mapContainer = mapContainerRef.current;

    if (loading || error || !routeData || !mapContainer || mapRef.current) {
      return;
    }

    let isDisposed = false;
    let hubsLayer = null;
    let invalidateTimer = null;

    const map = L.map(mapContainer, {
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      dragging: true,
      keyboard: true,
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

    hubsLayer = L.layerGroup().addTo(map);

    hubsLayerRef.current = hubsLayer;

    const districtLayer = L.layerGroup().addTo(map);

    districtLayerRef.current = districtLayer;

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

    return () => {
      isDisposed = true;

      if (invalidateTimer) {
        window.clearTimeout(invalidateTimer);
      }

      hubMarkersRef.current.clear();
      hubHighlightRef.current = null;

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      routeBoundsRef.current = null;

      try {
        map.stop();
      } catch (err) {
        console.warn("ไม่สามารถหยุด Map animation ได้:", err);
      }

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

      const activeRoutingControl = routingControlRef.current;

      if (activeRoutingControl) {
        try {
          activeRoutingControl.off();

          if (activeRoutingControl._map === map) {
            map.removeControl(activeRoutingControl);
          }
        } catch (err) {
          console.warn("ไม่สามารถลบ Routing Control ได้:", err);
        }

        if (routingControlRef.current === activeRoutingControl) {
          routingControlRef.current = null;
        }
      }

      const currentDistrictLayer = districtLayerRef.current;

      if (currentDistrictLayer) {
        try {
          currentDistrictLayer.clearLayers();

          if (map.hasLayer(currentDistrictLayer)) {
            map.removeLayer(currentDistrictLayer);
          }
        } catch (err) {
          console.warn("ไม่สามารถล้าง Layer อำเภอได้:", err);
        }

        if (districtLayerRef.current === currentDistrictLayer) {
          districtLayerRef.current = null;
        }
      }

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

      try {
        map.off();
      } catch (err) {
        console.warn("ไม่สามารถปิด Map events ได้:", err);
      }

      try {
        map.remove();
      } catch (err) {
        console.warn("ไม่สามารถทำลาย Map ได้:", err);
      }
    };
  }, [loading, error, routeData]);

  useEffect(() => {
    const map = mapRef.current;
    const districtLayer = districtLayerRef.current;
    const mapContainer = mapContainerRef.current;

    if (
      !map ||
      !districtLayer ||
      !mapContainer ||
      !isMapReady(map, mapContainer)
    ) {
      return;
    }

    try {
      districtLayer.clearLayers();
    } catch (err) {
      console.warn("ไม่สามารถล้างหมุดอำเภอได้:", err);
      return;
    }

    visibleDistricts.forEach((district, index) => {
      const coords = extractLatLng(district);

      if (!coords) {
        return;
      }

      L.circleMarker([coords.lat, coords.lng], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1a2332",
        fillOpacity: 1,
      }).addTo(districtLayer).bindPopup(`
            <div
              style="
                font-family:'Sarabun',sans-serif;
                text-align:center;
                padding:2px;
              "
            >
              <span
                style="
                  font-size:11px;
                  color:#64748b;
                  font-weight:bold;
                  display:block;
                "
              >
                จุดที่ ${district.orderNumber || index + 1}
              </span>

              <strong
                style="
                  font-size:14px;
                  color:#0f172a;
                "
              >
                อำเภอ${
                  district.districtName || district.district?.districtName || ""
                }
              </strong>
            </div>
          `);
    });

    const currentRoutingControl = routingControlRef.current;

    if (currentRoutingControl) {
      try {
        currentRoutingControl.off();

        if (currentRoutingControl._map === map) {
          map.removeControl(currentRoutingControl);
        }
      } catch (err) {
        console.warn("ไม่สามารถลบ Routing Control เดิมได้:", err);
      }

      if (routingControlRef.current === currentRoutingControl) {
        routingControlRef.current = null;
      }
    }

    const waypoints = visibleDistricts
      .map((district) => extractLatLng(district))
      .filter(Boolean)
      .map((coords) => L.latLng(coords.lat, coords.lng));

    if (waypoints.length === 0) {
      routeBoundsRef.current = null;
      return;
    }

    try {
      const bounds = L.latLngBounds(waypoints);

      routeBoundsRef.current = bounds.isValid() ? bounds : null;
    } catch (err) {
      routeBoundsRef.current = null;

      console.warn("ไม่สามารถสร้างขอบเขตเส้นทางที่แสดงได้:", err);
    }

    if (waypoints.length < 2) {
      return;
    }

    let routingControl = null;

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

      routingControl.on("routingerror", (routingError) => {
        if (mapRef.current !== map || !isMapReady(map, mapContainer)) {
          return;
        }

        console.warn(
          "ไม่สามารถคำนวณเส้นทางจาก Routing Service ได้:",
          routingError,
        );
      });

      routingControl.addTo(map);
      routingControlRef.current = routingControl;
    } catch (err) {
      console.error("ขัดข้องในการสร้าง Routing Control:", err);

      if (routingControlRef.current === routingControl) {
        routingControlRef.current = null;
      }
    }

    return () => {
      if (!routingControl) {
        return;
      }

      try {
        routingControl.off();

        if (mapRef.current === map && routingControl._map === map) {
          map.removeControl(routingControl);
        }
      } catch (err) {
        console.warn("ไม่สามารถ cleanup Routing Control ได้:", err);
      }

      if (routingControlRef.current === routingControl) {
        routingControlRef.current = null;
      }
    };
  }, [visibleDistricts]);

  useEffect(() => {
    const map = mapRef.current;
    const hubsLayer = hubsLayerRef.current;
    const mapContainer = mapContainerRef.current;

    if (!map || !hubsLayer || !mapContainer || !isMapReady(map, mapContainer)) {
      return;
    }

    try {
      hubsLayer.clearLayers();
      hubMarkersRef.current.clear();

      if (hubHighlightRef.current) {
        try {
          map.removeLayer(hubHighlightRef.current);
        } catch (highlightError) {
          console.warn(
            "ไม่สามารถล้าง Highlight ของสถานประกอบการได้:",
            highlightError,
          );
        }

        hubHighlightRef.current = null;
      }
    } catch (err) {
      console.warn("ไม่สามารถล้างหมุดสถานประกอบการได้:", err);
      return;
    }

    visibleWellnessHubs.forEach((hub) => {
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
                    onerror="
                      this.style.display='none';
                      this.nextElementSibling.style.display='flex';
                    "
                  />

                  <div
                    class="route-hub-popup__image-fallback"
                    style="
                      display:none;
                      --popup-category-color:${catInfo.color};
                      --popup-category-background:${catInfo.color}18;
                    "
                  >
                    <span class="route-hub-popup__image-fallback-icon">
                      <i class="fa-solid ${catInfo.icon}"></i>
                    </span>

                    <span class="route-hub-popup__image-fallback-text">
                      ${safeCategory}
                    </span>
                  </div>
                `
                : `
                  <div
                    class="route-hub-popup__image-fallback"
                    style="
                      display:flex;
                      --popup-category-color:${catInfo.color};
                      --popup-category-background:${catInfo.color}18;
                    "
                  >
                    <span class="route-hub-popup__image-fallback-icon">
                      <i class="fa-solid ${catInfo.icon}"></i>
                    </span>

                    <span class="route-hub-popup__image-fallback-text">
                      ${safeCategory}
                    </span>
                  </div>
                `
            }
          </div>

          <div class="route-hub-popup__content">

            ${
              hasValue(catInfo.name)
                ? `
                  <div class="route-hub-popup__category">
                    <span
                      class="route-hub-popup__category-dot"
                      style="background:${catInfo.color};"
                    ></span>

                    <span>
                      ${safeCategory}
                    </span>
                  </div>
                `
                : ""
            }

            ${
              hasValue(hub.wellnessHubName)
                ? `
                  <h3 class="route-hub-popup__title">
                    ${safeName}
                  </h3>
                `
                : ""
            }

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
                            <span class="route-hub-popup__meta-icon">
                              <i class="fa-solid fa-location-dot"></i>
                            </span>

                            <span>
                              อ. ${safeDistrict}
                            </span>
                          </div>
                        `
                        : ""
                    }

                    ${
                      hasValue(hub.address)
                        ? `
                          <div
                            class="
                              route-hub-popup__meta-row
                              route-hub-popup__meta-row--address
                            "
                          >
                            <span class="route-hub-popup__meta-icon">
                              <i class="fa-solid fa-map"></i>
                            </span>

                            <span>
                              ${safeAddress}
                            </span>
                          </div>
                        `
                        : ""
                    }

                    ${
                      hasValue(hub.telInformation)
                        ? `
                          <div class="route-hub-popup__meta-row">
                            <span class="route-hub-popup__meta-icon">
                              <i class="fa-solid fa-phone"></i>
                            </span>

                            <span>
                              ${safeTel}
                            </span>
                          </div>
                        `
                        : ""
                    }

                  </div>
                `
                : ""
            }

            ${
              hasValue(hub.wellnessHubDescription)
                ? `
                  <p class="route-hub-popup__description">
                    ${safeDescription}
                  </p>
                `
                : ""
            }

            ${
              hasValue(licenseId)
                ? `
                  <button
                    type="button"
                    class="route-hub-popup__button"
                    data-license-id="${safeLicenseId}"
                  >
                    <span>
                      ดูรายละเอียดเพิ่มเติม
                    </span>

                    <span
                      class="route-hub-popup__button-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </button>
                `
                : ""
            }

          </div>
        </div>
      `;

      try {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
        });

        marker.bindPopup(popupHtml, {
          closeButton: true,

          /*
           * ไม่ให้ Leaflet ขยับแผนที่เองแรงเกินไป
           * เราจะจัดมุมกล้องเองใน handleFocusWellnessHub
           */
          autoPan: false,

          maxWidth: 286,
          minWidth: 286,

          className: "route-hub-leaflet-popup",
        });

        marker.on("popupopen", (event) => {
          if (mapRef.current !== map || !isMapReady(map, mapContainer)) {
            return;
          }

          const popupElement = event.popup?.getElement();

          if (!popupElement) {
            return;
          }

          const detailButton = popupElement.querySelector(
            ".route-hub-popup__button",
          );

          if (!detailButton) {
            return;
          }

          detailButton.onclick = () => {
            const selectedLicenseId =
              detailButton.getAttribute("data-license-id");

            if (!selectedLicenseId || String(selectedLicenseId).trim() === "") {
              return;
            }

            navigate(`/wellness-hubs/${selectedLicenseId}`);
          };
        });

        marker.addTo(hubsLayer);

        const markerKey = String(hub.licenseId || hub.wellnessHubId || "");

        if (markerKey) {
          hubMarkersRef.current.set(markerKey, marker);
        }
      } catch (err) {
        console.warn(`ไม่สามารถปักหมุด ${hub.wellnessHubName || ""}:`, err);
      }
    });
  }, [visibleWellnessHubs, activeFilters, getCategoryInfo, navigate]);

  const handleToggleFilter = (catId) => {
    setActiveFilters((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleShowAllCategories = () => {
    const nextFilters = availableCategories.reduce((acc, cat) => {
      acc[cat.id] = true;
      return acc;
    }, {});

    setActiveFilters(nextFilters);
  };

  const handleHideAllCategories = () => {
    const nextFilters = availableCategories.reduce((acc, cat) => {
      acc[cat.id] = false;
      return acc;
    }, {});

    setActiveFilters(nextFilters);
  };

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

  const handleFocusDistrict = (district) => {
    const map = mapRef.current;
    const coords = extractLatLng(district);
    const mapContainer = mapContainerRef.current;

    if (!map || !coords || !mapContainer || !isMapReady(map, mapContainer)) {
      return;
    }

    try {
      map.stop();

      map.flyTo([coords.lat, coords.lng], 12, {
        animate: true,
        duration: 0.6,
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

  /*
   * การ์ดด้านขวา:
   * - ไม่ Navigate
   * - เลื่อนไป Map
   * - Zoom ไป Marker
   * - สร้างวง Highlight
   * - เปิด Popup
   */
  const handleFocusWellnessHub = (hub) => {
    const map = mapRef.current;
    const mapContainer = mapContainerRef.current;

    if (!map || !mapContainer || !isMapReady(map, mapContainer)) {
      return;
    }

    const coords = extractLatLng(hub);

    if (!coords) {
      return;
    }

    const catInfo = getCategoryInfo(hub);

    const markerKey = String(hub.licenseId || hub.wellnessHubId || "");

    const marker = hubMarkersRef.current.get(markerKey);

    try {
      map.stop();

      /*
       * ถ้าหมวดนี้ถูกซ่อน
       * เปิดหมวดกลับมาก่อน
       */
      if (catInfo?.id && !activeFilters[catInfo.id]) {
        setActiveFilters((current) => ({
          ...current,
          [catInfo.id]: true,
        }));

        /*
         * แค่พา Map มาแถวนี้
         * ไม่ซูมเข้า 16
         */
        map.setView([coords.lat, coords.lng], 13, {
          animate: false,
        });

        mapContainer.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        return;
      }

      /*
       * Zoom 13
       * เพื่อให้เห็นพื้นที่รอบ ๆ + Marker + Popup
       */
      map.setView([coords.lat, coords.lng], 13, {
        animate: false,
      });

      /*
       * ลบ Highlight เดิม
       */
      if (hubHighlightRef.current) {
        try {
          map.removeLayer(hubHighlightRef.current);
        } catch (highlightError) {
          console.warn("ไม่สามารถลบ Highlight เดิมได้:", highlightError);
        }

        hubHighlightRef.current = null;
      }

      /*
       * วงเน้นรอบหมุด
       */
      const highlight = L.circleMarker([coords.lat, coords.lng], {
        radius: 25,
        color: catInfo?.color || "#F28C28",
        weight: 4,
        opacity: 0.95,
        fillColor: catInfo?.color || "#F28C28",
        fillOpacity: 0.1,
        interactive: false,
        className: "route-detail-hub-highlight",
      }).addTo(map);

      hubHighlightRef.current = highlight;

      /*
       * เลื่อนหน้าให้ Map มาอยู่กลาง viewport
       */
      mapContainer.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      if (!marker) {
        return;
      }

      /*
       * รอ scrollIntoView ก่อน
       */
      window.setTimeout(() => {
        try {
          /*
           * เปิด Popup โดยไม่ให้ Leaflet auto-pan
           */
          marker.openPopup();

          /*
           * หลัง Popup render แล้ว
           * เราจะจัดตำแหน่ง Marker ให้อยู่ช่วงล่างของ Map
           *
           * Popup อยู่เหนือ Marker
           * จึงเหลือพื้นที่ด้านบนสำหรับ Popup
           */
          window.setTimeout(() => {
            if (mapRef.current !== map || !isMapReady(map, mapContainer)) {
              return;
            }

            const mapSize = map.getSize();

            const markerPoint = map.latLngToContainerPoint([
              coords.lat,
              coords.lng,
            ]);

            /*
             * ต้องการ Marker อยู่ประมาณ 72%
             * ของความสูง Map
             *
             * เช่น Map สูง 500px
             * Marker จะอยู่ราว y = 360
             *
             * ทำให้มีพื้นที่ด้านบนประมาณ 360px
             * สำหรับ Popup
             */
            const targetPoint = L.point(mapSize.x * 0.52, mapSize.y * 0.72);

            const offset = markerPoint.subtract(targetPoint);

            map.panBy(offset, {
              animate: true,
              duration: 0.35,
            });
          }, 80);
        } catch (popupError) {
          console.warn("ไม่สามารถเปิด Popup ของสถานประกอบการได้:", popupError);
        }
      }, 320);
    } catch (focusError) {
      console.warn("ไม่สามารถไปยังสถานประกอบการที่เลือกได้:", focusError);
    }
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
        <section className="route-detail-section route-detail-section--explorer">
          <div className="route-detail-heading">
            <div>
              <p>ROUTE MAP</p>

              <h2>แผนที่เส้นทาง</h2>

              <span>
                หมุดหมายเลขแสดงลำดับอำเภอ และหมุดสีแสดงสถานประกอบการตามหมวดหมู่
              </span>
            </div>
          </div>

          <div className="route-detail-explorer">
            <div className="route-detail-explorer__map">
              <div className="route-detail-map-workspace">
                {availableCategories.length > 0 && (
                  <div className="route-detail-map-toolbar">
                    <div className="route-detail-map-toolbar__top">
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

                    {districts.length > 0 && (
                      <div className="route-detail-districts-row">
                        <div className="route-detail-districts-header">
                          <div className="route-detail-districts-heading">
                            <span className="route-detail-districts-title">
                              ลำดับอำเภอ
                            </span>

                            <span className="route-detail-districts-count">
                              {visibleDistricts.length}/{districts.length} อำเภอ
                            </span>
                          </div>

                          <button
                            type="button"
                            className={`route-detail-district-edit ${
                              isEditingDistricts ? "active" : ""
                            }`}
                            onClick={() =>
                              setIsEditingDistricts((current) => !current)
                            }
                          >
                            <Pencil aria-hidden="true" />

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
                          aria-label="ลำดับอำเภอในเส้นทาง"
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
                                key={`${district.districtId || idx}-${order}`}
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

                <div className="route-detail-map-card">
                  <div ref={mapContainerRef} className="route-detail-map" />
                </div>

                <aside className="route-detail-legend">
                  <h3>คำอธิบายสัญลักษณ์</h3>

                  <div className="route-detail-legend__list">
                    <div className="route-detail-legend__item">
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
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

              {visibleWellnessHubs.length > 0 && (
                <div
                  className="route-detail-explorer__scroll-hint"
                  aria-hidden="true"
                >
                  <span>เลื่อนดูรายการ</span>

                  <strong>↓</strong>
                </div>
              )}

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
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();

                              handleFocusWellnessHub(hub);
                            }
                          }}
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
                              อ.{" "}
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
