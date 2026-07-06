import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet-routing-machine";
import axiosInstance from "axios";
import "./CreateMainRoute.css";

const CreateMainRoute = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  // States แบบฟอร์ม
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [selectDistrictValue, setSelectDistrictValue] = useState("");

  // States ทะเบียนข้อมูลหลักจาก DB
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wellnessHubs, setWellnessHubs] = useState([]);

  // States จัดลำดับและรายการควบคุมหน้าบ้าน
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [orderedRouteDetails, setOrderedRouteDetails] = useState([]);
  const [errors, setErrors] = useState({});

  // State ควบคุมกล่องป๊อปอัปแจ้งเตือนผลลัพธ์ลอยตัว
  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  // State เช็คสถานะการดาวน์โหลดข้อมูลเส้นทางใน Edit Mode
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Refs จัดการเลเยอร์ Leaflet
  const districtMarkersRef = useRef({});
  const placeMarkersRef = useRef({});

  // ฟังก์ชันโหลดข้อมูลเส้นทางเดิมจาก DB
  const loadRouteData = async (routeId, currentDistricts) => {
    try {
      const routeRes = await axiosInstance.get(
        `http://localhost:8080/api/main-routes/${routeId}`,
      );
      if (routeRes.data) {
        const data = routeRes.data;
        setRouteName(data.routeName || "");
        setRouteDescription(data.routeDescription || "");

        if (data.categoryId) {
          try {
            const parsedCategoryIds = JSON.parse(data.categoryId);
            setSelectedCategoryIds(parsedCategoryIds.map(String));
          } catch (e) {
            console.error("⚠️ ขัดข้องในการถอดรหัสฟอร์แมต JSON", e);
            setSelectedCategoryIds([String(data.categoryId)]);
          }
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
      console.error("❌ ไม่สามารถดึงข้อมูลเส้นทางสุขภาพรายการเดิมได้", err);
      throw err;
    }
  };

  // ก้อนที่ 1: โหลดข้อมูล Master Data ของระบบหลักจากฐานข้อมูล
  useEffect(() => {
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
        console.error("❌ ไม่สามารถดึงสารสนเทศภูมิศาสตร์ได้", err);
        setLoadingRoute(false);
      }
    };

    fetchSystemDBData();
  }, []);

  // ก้อนที่ 2: โหลดข้อมูลเส้นทางเดิมเมื่อเปิดโหมดแก้ไข
  useEffect(() => {
    let isMounted = true;

    const fetchExistingRoute = async () => {
      if (id && districts.length > 0 && wellnessHubs.length > 0) {
        try {
          await loadRouteData(id, districts);
        } catch (err) {
          console.error("❌ เกิดข้อผิดพลาดขณะโหลดข้อมูลเส้นทางเก่า:", err);
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // วาดเส้น พ่นหมุด และจัดการ fitBounds แผนที่อัตโนมัติ
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // --- 🔵 1. จัดการหมุดจุดตรวจระดับอำเภอ ---
    Object.values(districtMarkersRef.current).forEach((m) =>
      map.removeLayer(m),
    );
    districtMarkersRef.current = {};

    orderedRouteDetails.forEach((dist) => {
      // รองรับข้อมูลทั้งสองรูปแบบในการดึงพิกัดอำเภอ
      const lat = dist.district?.latitude ?? dist.latitude;
      const lng = dist.district?.longitude ?? dist.longitude;
      const name = dist.district?.districtName ?? dist.districtName;

      if (lat && lng) {
        const marker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a2332",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(`จุดแวะ: อำเภอ${name}`);

        districtMarkersRef.current[name] = marker;
      }
    });

    // --- 🟢 2. เคลียร์และคำนวณวาดสายเส้นประสีเขียวหลัก ---
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        console.warn("ข้ามการถอน Control", e);
      }
      routingControlRef.current = null;
    }

    // แก้ไขจุดดึง Waypoints ให้รองรับโครงสร้างซ้อน
    const waypoints = orderedRouteDetails
      .map((d) => {
        const lat = d.district?.latitude ?? d.latitude;
        const lng = d.district?.longitude ?? d.longitude;
        return lat && lng ? L.latLng(parseFloat(lat), parseFloat(lng)) : null;
      })
      .filter(Boolean);

    if (waypoints.length >= 2) {
      try {
        routingControlRef.current = L.Routing.control({
          waypoints: waypoints,
          lineOptions: {
            styles: [{ color: "#28a745", weight: 5, opacity: 0.8 }],
          },
          createMarker: () => null,
          show: false,
          addWaypoints: false,
        }).addTo(map);
      } catch (err) {
        console.error("ระบบเส้นประขัดข้อง", err);
      }
    }

    if (waypoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(waypoints), {
          padding: [40, 40],
        });
      } catch (e) {
        console.warn("ไม่สามารถซูมเข้าสู่ขอบเขตพิกัดเส้นทางได้", e);
      }
    }

    // --- 🟣 3. จัดการหมุดสถานประกอบการคัดกรองแยกสีตามไอดี ---
    Object.values(placeMarkersRef.current).forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = {};

    if (orderedRouteDetails.length > 0 && selectedCategoryIds.length > 0) {
      // แก้ไขจุดที่ 1.1: ปรับใช้ d.district?.districtId ?? d.districtId ใน useEffect วาดหมุด
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
        return (
          activeDistrictIds.includes(hubDistId) &&
          selectedCategoryIds.includes(String(hubCatId))
        );
      });

      matchedHubs.forEach((hub) => {
        const hLat = hub.wellnessHubLatitude;
        const hLng = hub.wellnessHubLongitude;

        if (hLat && hLng) {
          const catKey = String(hub.category?.categoryId).toUpperCase();
          let pinColor = "#64748B";
          let pinIcon = "fa-location-dot";

          if (
            catKey.includes("C01") ||
            catKey.includes("SPA") ||
            catKey.includes("MASSAGE")
          ) {
            pinColor = "#28a745";
            pinIcon = "fa-spa";
          } else if (
            catKey.includes("C03") ||
            catKey.includes("REST") ||
            catKey.includes("FOOD") ||
            catKey.includes("RESTAURANT")
          ) {
            pinColor = "#F4A261";
            pinIcon = "fa-utensils";
          } else if (
            catKey.includes("C04") ||
            catKey.includes("HOTEL") ||
            catKey.includes("ACCOM") ||
            catKey.includes("ACCOMMODATION")
          ) {
            pinColor = "#A29BFE";
            pinIcon = "fa-bed";
          } else if (
            catKey.includes("C02") ||
            catKey.includes("CLINIC") ||
            catKey.includes("HOSP") ||
            catKey.includes("HOSPITAL")
          ) {
            pinColor = "#457B9D";
            pinIcon = "fa-notes-medical";
          }

          const customIcon = L.divIcon({
            html: `<div style="background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.2); border:2px solid white;"><div style="background:${pinColor}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;"><i class="fa-solid ${pinIcon}" style="font-size:11px;"></i></div></div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const popupHtml = `
            <div style="font-family:'Sarabun',sans-serif; padding:2px; min-width:140px;">
              <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">🏢 ${hub.wellnessHubName}</strong>
              <span style="font-size:11px; color:#666; display:block;">อ.${hub.district?.districtName}</span>
              <span style="font-size:12px; color:${pinColor}; font-weight:bold; display:block; margin-top:4px;">✨ ${hub.category?.categoryName || ""}</span>
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

  // ฟังก์ชันคำนวณจำนวนสถานประกอบการเฉพาะในอำเภอและหมวดหมู่ที่เลือก (Real-time)
  const getCountForCategory = (catId) => {
    // แก้ไขจุดที่ 1.2: ปรับใช้ d.district?.districtId ?? d.districtId ใน getCountForCategory()
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

  // ฟังก์ชันคำนวณจำนวนสถานประกอบการรายอำเภอ เฉพาะหมวดหมู่ที่เลือก
  const getCountForDistrict = (districtId) => {
    return wellnessHubs.filter((h) => {
      const hubDistId = h.district?.districtId
        ? String(h.district.districtId)
        : null;
      const hubCatId = h.category?.categoryId
        ? String(h.category.categoryId)
        : null;
      return (
        String(hubDistId) === String(districtId) &&
        selectedCategoryIds.includes(String(hubCatId))
      );
    }).length;
  };

  // รวมผลรวมหมุดทั้งหมดที่เปิดแสดงผลอยู่ ณ ปัจจุบัน
  const getTotalPinsCount = () => {
    // แก้ไขจุดที่ 1.3: ปรับใช้ d.district?.districtId ?? d.districtId ใน getTotalPinsCount()
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
        selectedCategoryIds.includes(String(hubCatId))
      );
    }).length;
  };

  const handleCategoryToggle = (catId) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
    if (errors.categories) setErrors({ ...errors, categories: "" });
  };

  const handleAddDistrictToOrderList = () => {
    if (!selectDistrictValue) return;

    // แก้ไขจุดที่ 3: ปรับเงื่อนไขการตรวจสอบอำเภอซ้ำใน handleAddDistrictToOrderList
    const isDuplicate = orderedRouteDetails.some((d) =>
      String(d.district?.districtId ?? d.districtId) === String(selectDistrictValue)
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

  // แก้ไขจุดที่ 2: ปรับฟังก์ชันการลบอำเภอออกจากรายการให้รองรับ Object ซ้อนใน handleRemoveDistrictFromList
  const handleRemoveDistrictFromList = (districtId) => {
    setOrderedRouteDetails(
      orderedRouteDetails.filter(
        (d) => String(d.district?.districtId ?? d.districtId) !== String(districtId)
      )
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

    const payload = {
      routeName: routeName.trim(),
      routeDescription: routeDescription.trim(),
      categoryIds: selectedCategoryIds,
      details: orderedRouteDetails.map((dist, idx) => ({
        orderNumber: idx + 1,
        districtId: dist.district?.districtId ?? dist.districtId, // ปรับตอนส่ง Payload ด้วยเพื่อความปลอดภัย
      })),
    };

    try {
      if (id) {
        await axiosInstance.put(
          `http://localhost:8080/api/main-routes/${id}`,
          payload,
        );
        setPopupAlert({
          show: true,
          message:
            "💾 ระบบดำเนินการอัปเดตบันทึกทับข้อมูลเส้นทางเก่าสำเร็จแล้ว!",
          isSuccess: true,
        });
      } else {
        await axiosInstance.post(
          "http://localhost:8080/api/main-routes",
          payload,
        );
        setPopupAlert({
          show: true,
          message:
            "✅ ระบบทำการเพิ่มเส้นทางสุขภาพรายการใหม่เข้าดาต้าเบสเรียบร้อย!",
          isSuccess: true,
        });
      }

      setTimeout(() => {
        setPopupAlert({ show: false, message: "", isSuccess: true });
        navigate("/listMainRoute");
      }, 2200);
    } catch (err) {
      console.error("ข้อผิดพลาดการจัด Write ทะเบียน", err);
      setPopupAlert({
        show: true,
        message:
          "❌ ไม่สำเร็จ: เกิดข้อผิดพลาดของโครงสร้างระบบในการเขียนตารางข้อมูล",
        isSuccess: false,
      });
      setTimeout(
        () => setPopupAlert({ show: false, message: "", isSuccess: false }),
        4000,
      );
    }
  };

  return (
    <div className="gov-admin-layout">
      {popupAlert.show && (
        <div
          style={{
            position: "fixed",
            top: "25px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: popupAlert.isSuccess ? "#28a745" : "#dc3545",
            color: "white",
            padding: "15px 35px",
            borderRadius: "0px",
            fontWeight: "bold",
            fontSize: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            display: "flex",
            gap: "10px",
            alignItems: "center",
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

      <p>
        กรุณารอสักครู่ ระบบกำลังดึงแผนที่ หมวดหมู่ และอำเภอเดิม
      </p>
    </div>
  </div>
)}

      <aside className="gov-sidebar">
        <div className="gov-sidebar-top">
          <div className="gov-sidebar-logo">Admin Panel</div>
          <div className="gov-admin-info">
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              ผู้ใช้ปัจจุบัน:
            </span>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>admin02</div>
          </div>
          <p className="gov-menu-label">เมนูหลัก</p>
          <a href="#" className="gov-menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </a>
          <a href="#" className="gov-menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span
              className="gov-badge-danger"
              style={{
                background: "#EF4444",
                fontSize: "9px",
                padding: "2px 8px",
                borderRadius: "10px",
                marginLeft: "auto",
                color: "white",
                fontWeight: "800",
              }}
            >
              5
            </span>
          </a>
          <p className="gov-menu-label" style={{ marginTop: "30px" }}>
            การจัดการข้อมูล
          </p>
          <a href="/listMainRoute" className="gov-menu-item active">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </a>
          <a href="/listWellnessHub" className="gov-menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </a>
          <a href="#" className="gov-menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </a>
          <a
            href="#"
            className="gov-menu-item"
            style={{ marginTop: "100px", color: "#FDA4AF" }}
          >
            <i className="fa-solid fa-power-off"></i> ออกจากระบบ
          </a>
        </div>
      </aside>

      <main className="gov-main-content">
        <div className="gov-header-panel">
          <h2>{id ? "แก้ไขเส้นทางสุขภาพ" : "เพิ่มเส้นทางสุขภาพ"}</h2>
        </div>

        <div className="gov-gis-container">
          <div className="gov-map-panel">
            <div id="map" ref={mapContainerRef} className="gov-map-frame"></div>
            <div className="gov-map-legend">
              <div className="gov-legend-title">
                ความหมายของพิกัดหมุดสัญลักษณ์
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#28a745" }}
                ></div>{" "}
                นวด/สปาเพื่อสุขภาพ
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#F4A261" }}
                ></div>{" "}
                อาหารและเครื่องดื่ม
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#A29BFE" }}
                ></div>{" "}
                ที่พักฟื้นฟูสุขภาพ
              </div>
              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#457B9D" }}
                ></div>{" "}
                คลินิก/สถานพยาบาล
              </div>
              <div
                className="gov-legend-item"
                style={{
                  borderTop: "1px dashed #000",
                  marginTop: "5px",
                  paddingTop: "5px",
                }}
              >
                <div
                  className="gov-legend-color"
                  style={{ background: "#1a2332" }}
                ></div>{" "}
                จุดตรวจสอบระดับอำเภอ
              </div>
            </div>

            <div
              className="gov-route-summary-box"
              style={{
                marginTop: "15px",
                padding: "15px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
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
                  {routeName.length}/100 ตัวอักษร
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

              <div className="gov-form-group">
                <label className="gov-label-bold">
                  1. ประเภทสถานที่ที่จะแสดง (หมุดบนแผนที่)*
                </label>
                <div
                  className={`gov-category-grid ${errors.categories ? "gov-input-border-error" : ""}`}
                >
                  {categories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(
                      String(cat.categoryId),
                    );
                    const currentCount = getCountForCategory(cat.categoryId);
                    return (
                      <div
                        key={cat.categoryId}
                        className={`gov-category-card ${isChecked ? "gov-selected" : ""}`}
                        onClick={() =>
                          handleCategoryToggle(String(cat.categoryId))
                        }
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          padding: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="gov-custom-checkbox"
                            checked={isChecked}
                            readOnly
                          />
                          <span
                            className="gov-category-text"
                            style={{ fontWeight: "600" }}
                          >
                            {cat.categoryName}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: isChecked ? "#1e3a8a" : "#64748b",
                            marginLeft: "22px",
                            marginTop: "2px",
                          }}
                        >
                          ({currentCount} แห่ง)
                        </span>
                      </div>
                    );
                  })}
                </div>
                {errors.categories && (
                  <span className="gov-error-label">{errors.categories}</span>
                )}
              </div>

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
                    // ดึงไอดีและชื่ออำเภอโดยรองรับโครงสร้างแบบซ้อนในการเรนเดอร์ UI
                    const currentDistId = dist.district?.districtId ?? dist.districtId;
                    const currentDistName = dist.district?.districtName ?? dist.districtName;
                    const districtHubsCount = getCountForDistrict(currentDistId);
                    
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
                  บันทึกข้อมูลแก้ไข
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