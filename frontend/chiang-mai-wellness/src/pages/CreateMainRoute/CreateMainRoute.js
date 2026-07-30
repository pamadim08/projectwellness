import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet-routing-machine";
import axiosInstance from "axios";
import "./CreateMainRoute.css";

// 🌟 1. เพิ่มค่าคงที่และ helper function ด้านนอก Component
const REQUIRED_EMERGENCY_CATEGORY_IDS = ["EM01", "EM02"];

const mergeRequiredCategories = (categoryIds = []) => {
  return [
    ...new Set([
      ...categoryIds.map(String),
      ...REQUIRED_EMERGENCY_CATEGORY_IDS,
    ]),
  ];
};

const CreateMainRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  // States แบบฟอร์ม
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [selectDistrictValue, setSelectDistrictValue] = useState("");

  const [adminName, setAdminName] = useState("admin02");

  // States ทะเบียนข้อมูลหลักจาก DB
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wellnessHubs, setWellnessHubs] = useState([]);

  // States จัดลำดับและรายการควบคุมหน้าบ้าน
  // 🌟 2. กำหนดค่าเริ่มต้นให้มี EM01 และ EM02
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    REQUIRED_EMERGENCY_CATEGORY_IDS,
  );
  const [orderedRouteDetails, setOrderedRouteDetails] = useState([]);
  const [errors, setErrors] = useState({});

  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs จัดการเลเยอร์ Leaflet
  const districtMarkersRef = useRef({});
  const placeMarkersRef = useRef({});

  // 🌟 ฟังก์ชันแยกประเภทหมวดหมู่ ดึงสี ไอคอน และเช็คหมวดฉุกเฉิน
  const getCategoryStyle = (categoryId, categoryName = "") => {
    const key = (categoryId || "").toString().toUpperCase();
    const name = (categoryName || "").toString().toUpperCase();

    if (
      key.includes("EM02") ||
      key.includes("ALS") ||
      name.includes("ADVANCED") ||
      name.includes("HOSPITAL")
    ) {
      return {
        color: "#E63946",
        icon: "fa-hospital",
        isEmergency: true,
        label: "ALS (โรงพยาบาล)",
      };
    }
    if (
      key.includes("EM01") ||
      key.includes("BLS") ||
      name.includes("BASIC") ||
      name.includes("RESCUE")
    ) {
      return {
        color: "#D97706",
        icon: "fa-truck-medical",
        isEmergency: true,
        label: "BLS (หน่วยกู้ภัย)",
      };
    }
    if (
      key.includes("C01") ||
      name.includes("SPA") ||
      name.includes("MASSAGE")
    ) {
      return {
        color: "#28a745",
        icon: "fa-spa",
        isEmergency: false,
        label: "นวด/สปาเพื่อสุขภาพ",
      };
    }
    if (key.includes("C03") || name.includes("REST") || name.includes("FOOD")) {
      return {
        color: "#F4A261",
        icon: "fa-utensils",
        isEmergency: false,
        label: "อาหารและเครื่องดื่ม",
      };
    }
    if (
      key.includes("C04") ||
      name.includes("HOTEL") ||
      name.includes("ACCOM")
    ) {
      return {
        color: "#A29BFE",
        icon: "fa-bed",
        isEmergency: false,
        label: "ที่พักฟื้นฟูสุขภาพ",
      };
    }
    if (key.includes("C02") || name.includes("CLINIC")) {
      return {
        color: "#457B9D",
        icon: "fa-notes-medical",
        isEmergency: false,
        label: "คลินิก/สถานพยาบาล",
      };
    }

    return {
      color: "#64748B",
      icon: "fa-location-dot",
      isEmergency: false,
      label: categoryName || "อื่นๆ",
    };
  };

  // โหลดข้อมูลเส้นทางเดิมจาก DB
  const loadRouteData = async (routeId, currentDistricts) => {
    try {
      const routeRes = await axiosInstance.get(
        `http://localhost:8080/api/main-routes/${routeId}`,
      );
      if (routeRes.data) {
        const data = routeRes.data;
        setRouteName(data.routeName || "");
        setRouteDescription(data.routeDescription || "");

        // 🌟 3. ตอนโหลดเส้นทางเดิม ต้องเติม EM01 และ EM02
        if (data.categoryId) {
          try {
            const parsedCategoryIds = JSON.parse(data.categoryId);

            setSelectedCategoryIds(
              mergeRequiredCategories(
                Array.isArray(parsedCategoryIds)
                  ? parsedCategoryIds
                  : [parsedCategoryIds],
              ),
            );
          } catch (error) {
            setSelectedCategoryIds(
              mergeRequiredCategories([String(data.categoryId)]),
            );
          }
        } else {
          setSelectedCategoryIds(REQUIRED_EMERGENCY_CATEGORY_IDS);
        }

        if (data.details && data.details.length > 0) {
          const sortedDetails = [...data.details].sort(
            (a, b) => a.orderNumber - b.orderNumber,
          );
          const mappedDistricts = sortedDetails
            .map((detail) => {
              const districtId =
                detail.district?.districtId ?? detail.districtId;
              return currentDistricts.find(
                (d) => String(d.districtId) === String(districtId),
              );
            })
            .filter(Boolean);

          setOrderedRouteDetails(mappedDistricts);
        }
      }
    } catch (err) {
      console.error("❌ ไม่สามารถดึงข้อมูลเส้นทางเดิมได้", err);
      throw err;
    }
  };

  // โหลด Master Data
  useEffect(() => {
    const storedAdmin = localStorage.getItem("adminName");
    if (storedAdmin) setAdminName(storedAdmin);

    const fetchSystemDBData = async () => {
      if (id) setLoadingRoute(true);

      try {
        const [catRes, distRes, hubRes] = await Promise.all([
          axiosInstance.get("http://localhost:8080/api/categories"),
          axiosInstance.get("http://localhost:8080/api/districts"),
          axiosInstance.get("http://localhost:8080/api/wellness-hubs"),
        ]);

        setCategories(catRes.data || []);
        setDistricts(distRes.data || []);
        setWellnessHubs(hubRes.data || []);

        if (!id) setLoadingRoute(false);
      } catch (err) {
        console.error("❌ ดึงข้อมูลล้มเหลว", err);
        setLoadingRoute(false);
      }
    };

    fetchSystemDBData();
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const fetchExistingRoute = async () => {
      if (id && districts.length > 0 && wellnessHubs.length > 0) {
        try {
          await loadRouteData(id, districts);
        } catch (err) {
          console.error("❌ เกิดข้อผิดพลาดขณะโหลดเส้นทางเก่า:", err);
        } finally {
          if (isMounted) setLoadingRoute(false);
        }
      }
    };

    fetchExistingRoute();
    return () => {
      isMounted = false;
    };
  }, [id, districts, wellnessHubs]);

  // Initial แผนที่ Leaflet
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([18.7883, 98.9853], 10);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
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
  }, []);

  // วาดเส้น วางหมุดอำเภอ และพ่นหมุดสถานที่บนแผนที่
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 🔵 1. จัดการหมุดจุดตรวจระดับอำเภอ (วงกลมสีเข้ม + เลขลำดับ)
    Object.values(districtMarkersRef.current).forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    districtMarkersRef.current = {};

    orderedRouteDetails.forEach((dist, idx) => {
      const lat = dist.district?.latitude ?? dist.latitude;
      const lng = dist.district?.longitude ?? dist.longitude;
      const name = dist.district?.districtName ?? dist.districtName;

      if (lat && lng) {
        const marker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
          radius: 11,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a2332",
          fillOpacity: 1,
        }).addTo(map).bindPopup(`
            <div style="font-family:'Sarabun',sans-serif; text-align:center; padding:2px;">
              <span style="font-size:11px; color:#64748b; font-weight:bold; display:block;">จุดที่ ${idx + 1}</span>
              <strong style="font-size:14px; color:#0f172a;">อำเภอ${name}</strong>
            </div>
          `);

        districtMarkersRef.current[name] = marker;
      }
    });

    // 🟢 2. วาดเส้นทาง Leaflet Routing Machine ตามถนนจริง
    if (routingControlRef.current) {
      try {
        routingControlRef.current.setWaypoints([]);
        if (map && map.removeControl) {
          map.removeControl(routingControlRef.current);
        }
      } catch (e) {}
      routingControlRef.current = null;
    }

    const waypoints = orderedRouteDetails
      .map((d) => {
        const lat = d.district?.latitude ?? d.latitude;
        const lng = d.district?.longitude ?? d.longitude;
        return lat && lng ? L.latLng(parseFloat(lat), parseFloat(lng)) : null;
      })
      .filter(Boolean);

    if (waypoints.length >= 2 && map) {
      try {
        routingControlRef.current = L.Routing.control({
          waypoints: waypoints,
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
        console.error("ขัดข้องในการวาดเส้นถนน", err);
      }
    }

    if (waypoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(waypoints), { padding: [40, 40] });
      } catch (e) {}
    }

    // 🟣 3. วางหมุดสถานประกอบการ (คัดกรอง + แสดง EM01 / EM02 อัตโนมัติ)
    Object.values(placeMarkersRef.current).forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    placeMarkersRef.current = {};

    if (orderedRouteDetails.length > 0) {
      const activeDistrictIds = orderedRouteDetails.map((d) =>
        String(d.district?.districtId ?? d.districtId),
      );

      const matchedHubs = wellnessHubs.filter((h) => {
        const hubDistId = h.district?.districtId
          ? String(h.district.districtId)
          : null;
        const hubCatId = h.category?.categoryId
          ? String(h.category.categoryId)
          : null;
        const catName = h.category?.categoryName || "";

        const style = getCategoryStyle(hubCatId, catName);

        return (
          activeDistrictIds.includes(hubDistId) &&
          (style.isEmergency || selectedCategoryIds.includes(String(hubCatId)))
        );
      });

      matchedHubs.forEach((hub) => {
        const hLat = hub.wellnessHubLatitude;
        const hLng = hub.wellnessHubLongitude;

        if (hLat && hLng) {
          const catId = hub.category?.categoryId || "";
          const catName = hub.category?.categoryName || "";
          const styleInfo = getCategoryStyle(catId, catName);

          const customIcon = L.divIcon({
            html: `<div style="background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:2px solid white;"><div style="background:${styleInfo.color}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;"><i class="fa-solid ${styleInfo.icon}" style="font-size:11px;"></i></div></div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const popupHtml = `
            <div style="font-family:'Sarabun',sans-serif; padding:2px; min-width:140px;">
              <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">🏢 ${hub.wellnessHubName}</strong>
              <span style="font-size:11px; color:#666; display:block;">อ.${hub.district?.districtName || hub.districtName || ""}</span>
              <span style="font-size:12px; color:${styleInfo.color}; font-weight:bold; display:block; margin-top:4px;">✨ ${catName || styleInfo.label}</span>
            </div>
          `;

          placeMarkersRef.current[hub.licenseId] = L.marker(
            [parseFloat(hLat), parseFloat(hLng)],
            { icon: customIcon },
          )
            .addTo(map)
            .bindPopup(popupHtml);
        }
      });
    }
  }, [orderedRouteDetails, selectedCategoryIds, wellnessHubs]);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("adminName");
      navigate("/admin/login");
    }
  };

  // คำนวณจำนวนหมุดตามหมวดหมู่
  const getCountForCategory = (catId) => {
    const activeDistrictIds = orderedRouteDetails.map((d) =>
      String(d.district?.districtId ?? d.districtId),
    );
    return wellnessHubs.filter((h) => {
      const hubDistId = h.district?.districtId
        ? String(h.district.districtId)
        : null;
      const hubCatId = h.category?.categoryId
        ? String(h.category.categoryId)
        : null;
      return (
        activeDistrictIds.includes(hubDistId) &&
        String(hubCatId) === String(catId)
      );
    }).length;
  };

  const getCountForDistrict = (districtId) => {
    return wellnessHubs.filter((h) => {
      const hubDistId = h.district?.districtId
        ? String(h.district.districtId)
        : null;
      const hubCatId = h.category?.categoryId
        ? String(h.category.categoryId)
        : null;
      const catName = h.category?.categoryName || "";
      const style = getCategoryStyle(hubCatId, catName);

      return (
        String(hubDistId) === String(districtId) &&
        (style.isEmergency || selectedCategoryIds.includes(String(hubCatId)))
      );
    }).length;
  };

  const getTotalPinsCount = () => {
    const activeDistrictIds = orderedRouteDetails.map((d) =>
      String(d.district?.districtId ?? d.districtId),
    );
    return wellnessHubs.filter((h) => {
      const hubDistId = h.district?.districtId
        ? String(h.district.districtId)
        : null;
      const hubCatId = h.category?.categoryId
        ? String(h.category.categoryId)
        : null;
      const catName = h.category?.categoryName || "";
      const style = getCategoryStyle(hubCatId, catName);

      return (
        activeDistrictIds.includes(hubDistId) &&
        (style.isEmergency || selectedCategoryIds.includes(String(hubCatId)))
      );
    }).length;
  };

  // 🌟 4. ป้องกันการเอาหมวดฉุกเฉินออก
  const handleCategoryToggle = (catId) => {
    const normalizedCategoryId = String(catId);

    if (REQUIRED_EMERGENCY_CATEGORY_IDS.includes(normalizedCategoryId)) {
      return;
    }

    setSelectedCategoryIds((previousCategoryIds) => {
      if (previousCategoryIds.includes(normalizedCategoryId)) {
        return previousCategoryIds.filter(
          (categoryId) => categoryId !== normalizedCategoryId,
        );
      }

      return [...previousCategoryIds, normalizedCategoryId];
    });

    if (errors.categories) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        categories: "",
      }));
    }
  };

  const handleAddDistrictToOrderList = () => {
    if (!selectDistrictValue) return;

    const isDuplicate = orderedRouteDetails.some(
      (d) =>
        String(d.district?.districtId ?? d.districtId) ===
        String(selectDistrictValue),
    );

    if (isDuplicate) {
      setErrors({
        ...errors,
        orderedDistricts: "❌ อำเภอนี้ถูกจัดอยู่ในลำดับเส้นทางเรียบร้อยแล้ว",
      });
      return;
    }

    const targetDistrict = districts.find(
      (d) => String(d.districtId) === String(selectDistrictValue),
    );
    if (targetDistrict) {
      setOrderedRouteDetails([...orderedRouteDetails, targetDistrict]);
      setSelectDistrictValue("");
      setErrors({ ...errors, orderedDistricts: "" });
    }
  };

  const handleMoveOrderStep = (index, direction) => {
    const updated = [...orderedRouteDetails];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setOrderedRouteDetails(updated);
  };

  const handleRemoveDistrictFromList = (districtId) => {
    setOrderedRouteDetails(
      orderedRouteDetails.filter(
        (d) =>
          String(d.district?.districtId ?? d.districtId) !== String(districtId),
      ),
    );
  };

  const handleSubmitFinalForm = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!routeName.trim()) {
      newErrors.routeName = "❌ จำเป็นต้องระบุชื่อเส้นทางสุขภาพหลัก";
    } else if (routeName.trim().length < 10 || routeName.trim().length > 50) {
      newErrors.routeName =
        "❌ ชื่อเส้นทางสุขภาพต้องมีความยาวอย่างน้อย 10 ตัวอักษร และไม่เกิน 50 ตัวอักษร";
    }

    if (orderedRouteDetails.length < 2) {
      newErrors.orderedDistricts =
        "❌ ต้องดำเนินการเลือกจัดลำดับอำเภอวิ่งผ่านอย่างน้อย 2 อำเภอขึ้นไป";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 🌟 5. ก่อนส่ง Payload ต้องบังคับรวม EM01 และ EM02
    const categoryIdsForSave = mergeRequiredCategories(selectedCategoryIds);

    const payload = {
      routeName: routeName.trim(),
      routeDescription: routeDescription.trim(),
      categoryIds: categoryIdsForSave,
      details: orderedRouteDetails.map((dist, idx) => ({
        orderNumber: idx + 1,
        districtId: dist.district?.districtId ?? dist.districtId,
      })),
    };

    setIsSubmitting(true);

    try {
      if (id) {
        await axiosInstance.put(
          `http://localhost:8080/api/main-routes/${id}`,
          payload,
        );
        navigate("/listMainRoute", {
          state: {
            showToast: true,
            toastType: "success",
            toastMessage: "แก้ไขและลงรับข้อมูลเส้นทางสุขภาพสำเร็จสิ้น",
          },
        });
      } else {
        await axiosInstance.post(
          "http://localhost:8080/api/main-routes",
          payload,
        );
        navigate("/listMainRoute", {
          state: {
            showToast: true,
            toastType: "success",
            toastMessage: "เพิ่มเส้นทางสุขภาพใหม่สำเร็จสิ้น",
          },
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      navigate("/listMainRoute", {
        state: {
          showToast: true,
          toastType: "error",
          toastMessage: id
            ? "ไม่สามารถแก้ไขข้อมูลเส้นทางได้ กรุณาลองใหม่อีกครั้ง"
            : "ไม่สามารถเพิ่มข้อมูลเส้นทางได้ กรุณาลองใหม่อีกครั้ง",
        },
      });
    }
  };

  if (isSubmitting) {
    return (
      <div className="gov-loading-container">
        <div className="loading-box">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <h3>กำลังบันทึกข้อมูล</h3>
          <p>กำลังส่งและปรับปรุงข้อมูลเส้นทางในฐานข้อมูลกลาง...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gov-admin-layout">
      {popupAlert.show && (
        <div
          className="popup-toast-alert"
          style={{
            backgroundColor: popupAlert.isSuccess ? "#28a745" : "#dc3545",
          }}
        >
          <span>{popupAlert.isSuccess ? "✅" : "⚠️"}</span>
          <span>{popupAlert.message}</span>
        </div>
      )}

      {loadingRoute && (
        <div className="loading-overlay">
          <div className="loading-box">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <h3>กำลังโหลดข้อมูลเส้นทาง</h3>
            <p>กรุณารอสักครู่ ระบบกำลังดึงแผนที่ หมวดหมู่ และอำเภอเดิม</p>
          </div>
        </div>
      )}

      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <i className="fa-solid fa-shield-heart"></i>
            <span>Admin Panel</span>
          </div>

          <div className="user-profile-box">
            <i className="fa-solid fa-circle-user"></i>
            <div className="user-info">
              <span className="user-label">ผู้ใช้งานปัจจุบัน:</span>
              <span className="user-name">{adminName}</span>
            </div>
          </div>

          <p className="menu-label">เมนูหลัก</p>
          <Link to="/admin/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/admin/requests" className="menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item active">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnessHub" className="menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </Link>
          <Link to="/listOfficialArticle" className="menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button className="btn-sidebar-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
        </button>
      </nav>

      <main className="gov-main-content">
        <div className="gov-header-panel">
          <h2>
            {id
              ? "แก้ไขเส้นทางสุขภาพ (Edit Route)"
              : "เพิ่มเส้นทางสุขภาพใหม่ (Create Route)"}
          </h2>
          <span style={{ fontSize: "13px", color: "#666" }}>
            ระบบบริการจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่
          </span>
        </div>

        <div className="gov-gis-container">
          <div className="gov-map-panel">
            <div id="map" ref={mapContainerRef} className="gov-map-frame"></div>

            {/* LEGEND สัญลักษณ์หมุด */}
            <div className="gov-map-legend">
              <div className="gov-legend-title">
                ความหมายของพิกัดหมุดสัญลักษณ์
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#28a745" }}
                ></div>
                นวด/สปาเพื่อสุขภาพ (C01)
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#F4A261" }}
                ></div>
                อาหารและเครื่องดื่ม (C03)
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#A29BFE" }}
                ></div>
                ที่พักฟื้นฟูสุขภาพ (C04)
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#457B9D" }}
                ></div>
                คลินิก/สถานพยาบาล (C02)
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#E63946" }}
                ></div>
                ALS (Advanced Hospital)
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#D97706" }}
                ></div>
                BLS (Basic Life Support)
              </div>
              <div
                className="gov-legend-item"
                style={{
                  borderTop: "1px dashed #cbd5e1",
                  marginTop: "5px",
                  paddingTop: "5px",
                }}
              >
                <div
                  className="gov-legend-color"
                  style={{ background: "#1a2332" }}
                ></div>
                จุดตรวจสอบระดับอำเภอ
              </div>
            </div>

            {/* สรุปจำนวนหมุด */}
            <div
              className="gov-route-summary-box"
              style={{
                marginTop: "15px",
                padding: "15px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                  color: "#1e293b",
                }}
              >
                📊 สรุปจำนวนหมุดในเส้นทาง
              </h3>
              <table
                style={{
                  width: "100%",
                  fontSize: "13px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid #cbd5e1",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ paddingBottom: "5px" }}>หมวดหมู่</th>
                    <th style={{ paddingBottom: "5px", textAlign: "right" }}>
                      จำนวนที่พบ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.categoryId}
                      style={{ borderBottom: "1px solid #e2e8f0" }}
                    >
                      <td style={{ padding: "6px 0" }}>{cat.categoryName}</td>
                      <td
                        style={{
                          padding: "6px 0",
                          textAlign: "right",
                          fontWeight: "600",
                        }}
                      >
                        {getCountForCategory(cat.categoryId)} แห่ง
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      fontWeight: "bold",
                      color: "#1e293b",
                      borderTop: "2px solid #cbd5e1",
                    }}
                  >
                    <td style={{ paddingTop: "8px" }}>รวมทั้งหมด</td>
                    <td
                      style={{
                        paddingTop: "8px",
                        textAlign: "right",
                        color: "#2563eb",
                      }}
                    >
                      {getTotalPinsCount()} แห่ง
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="gov-form-panel">
            <form onSubmit={handleSubmitFinalForm}>
              <div className="gov-form-group">
                <label className="gov-label-bold">ชื่อเส้นทางสุขภาพ*</label>
                <input
                  type="text"
                  className={`gov-input-text ${errors.routeName ? "gov-input-border-error" : ""}`}
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="ระบุชื่อเส้นทาง เช่น กินนวดสบาย พร้าว - แม่ริม - เมือง"
                />
                <span className="gov-char-counter">
                  {routeName.length}/50 ตัวอักษร
                </span>
                {errors.routeName && (
                  <span className="gov-error-label">{errors.routeName}</span>
                )}
              </div>

              <div className="gov-form-group">
                <label className="gov-label-bold">รายละเอียดเส้นทาง</label>
                <textarea
                  className="gov-input-text"
                  style={{
                    minHeight: "80px",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                  value={routeDescription}
                  onChange={(e) => setRouteDescription(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม หรือคำแนะนำของเส้นทางสุขภาพหลักนี้..."
                />
              </div>

              {/* SECTION 1: ประเภทสถานที่ */}
              <div className="gov-form-group">
                <label className="gov-label-bold">
                  1. ประเภทสถานที่ที่จะแสดง (หมุดบนแผนที่)*
                </label>
                <div
                  className={`gov-category-grid ${errors.categories ? "gov-input-border-error" : ""}`}
                >
                  {categories.map((cat) => {
                    const catIdStr = String(cat.categoryId);
                    const styleInfo = getCategoryStyle(
                      cat.categoryId,
                      cat.categoryName,
                    );
                    const isEmergency = styleInfo.isEmergency;

                    const isChecked =
                      isEmergency || selectedCategoryIds.includes(catIdStr);
                    const currentCount = getCountForCategory(cat.categoryId);

                    return (
                      <div
                        key={cat.categoryId}
                        className={`gov-category-card ${isChecked ? "gov-selected" : ""} ${isEmergency ? "gov-disabled-card" : ""}`}
                        onClick={() => {
                          if (!isEmergency) {
                            handleCategoryToggle(catIdStr);
                          }
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          padding: "10px",
                          cursor: isEmergency ? "not-allowed" : "pointer",
                          opacity: isEmergency ? 0.85 : 1,
                          backgroundColor: isEmergency ? "#f8fafc" : undefined,
                          borderLeft: `4px solid ${styleInfo.color}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            width: "100%",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="gov-custom-checkbox"
                            checked={isChecked}
                            disabled={isEmergency}
                            readOnly
                          />
                          <span
                            className="gov-category-text"
                            style={{
                              fontWeight: "600",
                              color: isEmergency ? styleInfo.color : "#0f172a",
                            }}
                          >
                            {cat.categoryName}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                            marginTop: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: isChecked ? "#1e3a8a" : "#64748b",
                              marginLeft: "22px",
                            }}
                          >
                            ({currentCount} แห่ง)
                          </span>

                          {isEmergency && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              📌 แสดงเสมอ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errors.categories && (
                  <span className="gov-error-label">{errors.categories}</span>
                )}
              </div>

              {/* SECTION 2: ลำดับอำเภอที่ผ่าน */}
              <div className="gov-form-group">
                <label className="gov-label-bold">
                  2. ลำดับอำเภอที่ผ่าน (Route Track)*
                </label>
                <div className="gov-district-selector-block">
                  <select
                    className="gov-dropdown-select"
                    value={selectDistrictValue}
                    onChange={(e) => setSelectDistrictValue(e.target.value)}
                  >
                    <option value="">-- เลือกรายการอำเภอหลัก --</option>
                    {districts.map((d) => (
                      <option key={d.districtId} value={String(d.districtId)}>
                        อ.{d.districtName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="gov-btn-add-item"
                    onClick={handleAddDistrictToOrderList}
                  >
                    เพิ่ม
                  </button>
                </div>

                <div
                  className={`gov-order-list-container ${errors.orderedDistricts ? "gov-input-border-error" : ""}`}
                >
                  {orderedRouteDetails.map((dist, index) => {
                    const currentDistId =
                      dist.district?.districtId ?? dist.districtId;
                    const currentDistName =
                      dist.district?.districtName ?? dist.districtName;
                    const districtHubsCount =
                      getCountForDistrict(currentDistId);

                    return (
                      <div
                        key={currentDistId}
                        className="gov-order-row"
                        style={{ padding: "10px 12px" }}
                      >
                        <div className="gov-order-left">
                          <div className="gov-badge-number">{index + 1}</div>
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <span
                              className="gov-order-name"
                              style={{ fontWeight: "600" }}
                            >
                              อำเภอ{currentDistName}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#475569",
                                marginTop: "1px",
                              }}
                            >
                              🏢 {districtHubsCount} จุดตรวจพบ
                            </span>
                          </div>
                        </div>
                        <div className="gov-order-actions">
                          <button
                            type="button"
                            className="gov-btn-arrow"
                            onClick={() => handleMoveOrderStep(index, -1)}
                            disabled={index === 0}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="gov-btn-arrow"
                            onClick={() => handleMoveOrderStep(index, 1)}
                            disabled={index === orderedRouteDetails.length - 1}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="gov-btn-delete-item-red"
                            onClick={() =>
                              handleRemoveDistrictFromList(currentDistId)
                            }
                          >
                            <i className="fa-solid fa-circle-xmark"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {orderedRouteDetails.length === 0 && (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#888",
                        fontSize: "13px",
                        margin: "15px 0",
                      }}
                    >
                      ยังไม่มีอำเภอถูกจัดอยู่ในโครงสร้างเส้นทาง
                    </p>
                  )}
                </div>
                {errors.orderedDistricts && (
                  <span className="gov-error-label">
                    {errors.orderedDistricts}
                  </span>
                )}
              </div>

              <div className="gov-submit-bar">
                <button type="submit" className="gov-btn-save">
                  บันทึกข้อมูลและอัปเดต
                </button>
                <Link to="/listMainRoute" className="gov-btn-cancel">
                  ยกเลิก
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateMainRoute;
