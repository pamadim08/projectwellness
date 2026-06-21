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
  const [selectDistrictValue, setSelectDistrictValue] = useState("");

  // States ทะเบียนข้อมูลหลักจาก DB
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wellnessHubs, setWellnessHubs] = useState([]);

  // States จัดลำดับและรายการควบคุมหน้าบ้าน
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [orderedRouteDetails, setOrderedRouteDetails] = useState([]);
  const [errors, setErrors] = useState({});

  // Refs จัดการเลเยอร์ Leaflet
  const districtMarkersRef = useRef({});
  const placeMarkersRef = useRef({});

  // 1. ดึงฐานข้อมูลสารสนเทศและประมวลผลข้อมูลเก่ากรณี Edit Mode
  useEffect(() => {
    const fetchSystemDBData = async () => {
      try {
        const [catRes, distRes, hubRes] = await Promise.all([
          axiosInstance.get("http://localhost:8080/api/categories"),
          axiosInstance.get("http://localhost:8080/api/districts"),
          axiosInstance.get("http://localhost:8080/api/wellness-hubs"),
        ]);
        
        const currentCategories = catRes.data || [];
        const currentDistricts = distRes.data || [];
        
        setCategories(currentCategories);
        setDistricts(currentDistricts);
        setWellnessHubs(hubRes.data || []);

        if (id) {
          const routeRes = await axiosInstance.get(`http://localhost:8080/api/main-routes/${id}`);
          if (routeRes.data) {
            const data = routeRes.data;
            setRouteName(data.routeName || "");
            setSelectedCategoryIds((data.categoryIds || []).map(String));
            
            if (data.details && data.details.length > 0) {
              const sortedDetails = [...data.details].sort((a, b) => a.orderNumber - b.orderNumber);
              const mappedDistricts = sortedDetails.map((detail) => {
                return currentDistricts.find((d) => String(d.districtId) === String(detail.districtId));
              }).filter(Boolean);
              
              setOrderedRouteDetails(mappedDistricts);
            }
          }
        }
      } catch (err) {
        console.error("❌ ไม่สามารถดึงสารสนเทศภูมิศาสตร์ได้", err);
      }
    };
    fetchSystemDBData();
  }, [id]);

  // 2. Initial แผนที่ Leaflet พร้อมระบบแก้วงกลมเทาโหลดไม่ครบ
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: true }).setView([18.7883, 98.9853], 10);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(mapRef.current);
      
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

  // 3. 🗺️ ประมวลผลคัดกรอง วาดเส้น และพ่นหมุดแยกสีตามเงื่อนไขหมวดหมู่จริง
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // --- 🔵 1. จัดการหมุดจุดตรวจระดับอำเภอ ---
    Object.values(districtMarkersRef.current).forEach((m) => map.removeLayer(m));
    districtMarkersRef.current = {};

    orderedRouteDetails.forEach((dist) => {
      const lat = dist.latitude;
      const lng = dist.longitude;

      if (lat && lng) {
        const marker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a2332",
          fillOpacity: 1,
        }).addTo(map).bindPopup(`จุดแวะ: อำเภอ${dist.districtName}`);

        districtMarkersRef.current[dist.districtName] = marker;
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

    const waypoints = orderedRouteDetails
      .filter((d) => d.latitude && d.longitude)
      .map((d) => L.latLng(parseFloat(d.latitude), parseFloat(d.longitude)));

    if (waypoints.length >= 2) {
      try {
        routingControlRef.current = L.Routing.control({
          waypoints: waypoints,
          lineOptions: { styles: [{ color: "#28a745", weight: 5, opacity: 0.8 }] },
          createMarker: () => null,
          show: false,
          addWaypoints: false,
        }).addTo(map);
      } catch (err) {
        console.error("ระบบเส้นประขัดข้อง", err);
      }
    }

    // --- 🟣 3. 🎨 [แก้ไขจุดสีสำเร็จ] จัดการหมุดสถานประกอบการคัดกรองแยกสีตามไอดี C01-C04 จริงในดาต้าเบส ---
    Object.values(placeMarkersRef.current).forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = {};

    if (orderedRouteDetails.length > 0 && selectedCategoryIds.length > 0) {
      const activeDistrictIds = orderedRouteDetails.map((d) => String(d.districtId));
      
      const matchedHubs = wellnessHubs.filter((h) => {
        const hubDistId = h.district?.districtId ? String(h.district.districtId) : null;
        const hubCatId = h.category?.categoryId ? String(h.category.categoryId) : null;
        
        return activeDistrictIds.includes(hubDistId) && selectedCategoryIds.includes(hubCatId);
      });

      matchedHubs.forEach((hub) => {
        const hLat = hub.wellnessHubLatitude;
        const hLng = hub.wellnessHubLongitude;

        if (hLat && hLng) {
          // สกัดรหัสไอดีหมวดหมู่จาก Supabase (แมปคีย์ C01-C04 แทนรูปแบบ C1 ตัวย่อตัวเดิม)
          const catKey = String(hub.category?.categoryId).toUpperCase();
          let pinColor = "#64748B"; // สีเริ่มต้นกรณีฉุกเฉิน
          let pinIcon = "fa-location-dot";

          if (catKey.includes("C01") || catKey.includes("SPA") || catKey.includes("MASSAGE")) {
            pinColor = "#28a745"; // นวด สปา -> สีเขียวสด
            pinIcon = "fa-spa";
          } else if (catKey.includes("C03") || catKey.includes("REST") || catKey.includes("FOOD") || catKey.includes("RESTAURANT")) {
            pinColor = "#F4A261"; // อาหาร เครื่องดื่ม -> สีส้ม
            pinIcon = "fa-utensils";
          } else if (catKey.includes("C04") || catKey.includes("HOTEL") || catKey.includes("ACCOM") || catKey.includes("ACCOMMODATION")) {
            pinColor = "#A29BFE"; // ที่พักฟื้นฟูสุขภาพ -> สีม่วงอ่อน
            pinIcon = "fa-bed";
          } else if (catKey.includes("C02") || catKey.includes("CLINIC") || catKey.includes("HOSP") || catKey.includes("HOSPITAL")) {
            pinColor = "#457B9D"; // คลินิก/สถานพยาบาล -> สีน้ำเนวอมเทา
            pinIcon = "fa-notes-medical";
          }

          const customIcon = L.divIcon({
            html: `<div style="background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.2); border:2px solid white;"><div style="background:${pinColor}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;"><i class="fa-solid ${pinIcon}" style="font-size:11px;"></i></div></div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          // ปรับข้อความของคำระบุชื่อหมวดหมู่บริการ (Category Name) ท้าย Popup ให้พ่นสีตรงกันกับตัวหมุดสัญลักษณ์ภูมิศาสตร์
          const popupHtml = `
            <div style="font-family:'Sarabun',sans-serif; padding:2px; min-width:140px;">
              <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">🏢 ${hub.wellnessHubName}</strong>
              <span style="font-size:11px; color:#666; display:block;">อ.${hub.district?.districtName}</span>
              <span style="font-size:12px; color:${pinColor}; font-weight:bold; display:block; margin-top:4px;">✨ ${hub.category?.categoryName || ""}</span>
            </div>
          `;

          placeMarkersRef.current[hub.licenseId] = L.marker([parseFloat(hLat), parseFloat(hLng)], { icon: customIcon })
            .addTo(map)
            .bindPopup(popupHtml);
        }
      });
    }
  }, [orderedRouteDetails, selectedCategoryIds, wellnessHubs]);

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

    if (orderedRouteDetails.some((d) => String(d.districtId) === String(selectDistrictValue))) {
      setErrors({ ...errors, orderedDistricts: "❌ อำเภอนี้ถูกจัดอยู่ในลำดับเส้นทางเรียบร้อยแล้ว" });
      return;
    }

    const targetDistrict = districts.find((d) => String(d.districtId) === String(selectDistrictValue));
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
    setOrderedRouteDetails(orderedRouteDetails.filter((d) => d.districtId !== districtId));
  };

  const handleSubmitFinalForm = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!routeName.trim()) {
      newErrors.routeName = "❌ จำเป็นต้องระบุชื่อเส้นทางสุขภาพหลัก";
    } else if (routeName.trim().length < 10 || routeName.trim().length > 50) {
      newErrors.routeName = "❌ ชื่อเส้นทางสุขภาพต้องมีความยาวอย่างน้อย 10 ตัวอักษร และไม่เกิน 50 ตัวอักษร";
    }

    if (orderedRouteDetails.length < 2) {
      newErrors.orderedDistricts = "❌ ต้องดำเนินการเลือกจัดลำดับอำเภอวิ่งผ่านอย่างน้อย 2 อำเภอขึ้นไป";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      routeName: routeName.trim(),
      categoryIds: selectedCategoryIds,
      details: orderedRouteDetails.map((dist, idx) => ({
        orderNumber: idx + 1,
        districtId: dist.districtId
      }))
    };

    try {
      if (id) {
        await axiosInstance.put(`http://localhost:8080/api/main-routes/${id}`, payload);
      } else {
        await axiosInstance.post("http://localhost:8080/api/main-routes", payload);
      }
      navigate("/listMainRoute");
    } catch (err) {
      console.error("ข้อผิดพลาดการจัด Write ทะเบียน", err);
    }
  };

  return (
    <div className="gov-admin-layout">
      <aside className="gov-sidebar">
        <div className="gov-sidebar-top">
          <div className="gov-sidebar-logo">Admin Panel</div>
          <div className="gov-admin-info">
            <span style={{ fontSize: "11px", color: "#64748b" }}>ผู้ใช้ปัจจุบัน:</span>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>admin02</div>
          </div>
          <p className="gov-menu-label">เมนูหลัก</p>
          <a href="#" className="gov-menu-item"><i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก</a>
          <a href="#" className="gov-menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์ 
            <span className="gov-badge-danger" style={{ background:"#EF4444", fontSize:"9px", padding:"2px 8px", borderRadius:"10px", marginLeft:"auto", color:"white", fontWeight:"800" }}>5</span>
          </a>
          <p className="gov-menu-label" style={{ marginTop: "30px" }}>การจัดการข้อมูล</p>
          <a href="#" className="gov-menu-item active"><i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ</a>
          <a href="#" className="gov-menu-item"><i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ</a>
          <a href="#" className="gov-menu-item"><i className="fa-solid fa-newspaper"></i> จัดการบทความ</a>
          <a href="#" className="gov-menu-item" style={{ marginTop: "100px", color: "#FDA4AF" }}><i className="fa-solid fa-power-off"></i> ออกจากระบบ</a>
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
              <div className="gov-legend-title">ความหมายของพิกัดหมุดสัญลักษณ์</div>
              <div className="gov-legend-item"><div className="gov-legend-color" style={{ background: "#28a745" }}></div> นวด/สปาเพื่อสุขภาพ</div>
              <div className="gov-legend-item"><div className="gov-legend-color" style={{ background: "#F4A261" }}></div> อาหารและเครื่องดื่ม</div>
              <div className="gov-legend-item"><div className="gov-legend-color" style={{ background: "#A29BFE" }}></div> ที่พักฟื้นฟูสุขภาพ</div>
              <div className="gov-legend-item"><div className="gov-legend-color" style={{ background: "#457B9D" }}></div> คลินิก/สถานพยาบาล</div>
              <div className="gov-legend-item" style={{ borderTop: "1px dashed #000", marginTop: "5px", paddingTop: "5px" }}>
                <div className="gov-legend-color" style={{ background: "#1a2332" }}></div> จุดตรวจสอบระดับอำเภอ
              </div>
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
                <span className="gov-char-counter">{routeName.length}/100 ตัวอักษร</span>
                {errors.routeName && <span className="gov-error-label">{errors.routeName}</span>}
              </div>

              <div className="gov-form-group">
                <label className="gov-label-bold">1. ประเภทสถานที่ที่จะแสดง (หมุดบนแผนที่)*</label>
                <div className={`gov-category-grid ${errors.categories ? "gov-input-border-error" : ""}`}>
                  {categories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(String(cat.categoryId));
                    return (
                      <div
                        key={cat.categoryId}
                        className={`gov-category-card ${isChecked ? "gov-selected" : ""}`}
                        onClick={() => handleCategoryToggle(String(cat.categoryId))}
                      >
                        <input type="checkbox" className="gov-custom-checkbox" checked={isChecked} readOnly />
                        <span className="gov-category-text">{cat.categoryName}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.categories && <span className="gov-error-label">{errors.categories}</span>}
              </div>

              <div className="gov-form-group">
                <label className="gov-label-bold">2. ลำดับอำเภอที่ผ่าน (Route Track)*</label>
                <div className="gov-district-selector-block">
                  <select
                    className="gov-dropdown-select"
                    value={selectDistrictValue}
                    onChange={(e) => setSelectDistrictValue(e.target.value)}
                  >
                    <option value="">-- เลือกรายการอำเภอหลัก --</option>
                    {districts.map((d) => (
                      <option key={d.districtId} value={String(d.districtId)}>อ.{d.districtName}</option>
                    ))}
                  </select>
                  <button type="button" className="gov-btn-add-item" onClick={handleAddDistrictToOrderList}>เพิ่ม</button>
                </div>

                <div className={`gov-order-list-container ${errors.orderedDistricts ? "gov-input-border-error" : ""}`}>
                  {orderedRouteDetails.map((dist, index) => (
                    <div key={dist.districtId} className="gov-order-row">
                      <div className="gov-order-left">
                        <div className="gov-badge-number">{index + 1}</div>
                        <span className="gov-order-name">อำเภอ{dist.districtName}</span>
                      </div>
                      <div className="gov-order-actions">
                        <button type="button" className="gov-btn-arrow" onClick={() => handleMoveOrderStep(index, -1)} disabled={index === 0}>▲</button>
                        <button type="button" className="gov-btn-arrow" onClick={() => handleMoveOrderStep(index, 1)} disabled={index === orderedRouteDetails.length - 1}>▼</button>
                        {/* 🌟 ปุ่มลบกากบาทสีแดงถูกต่อท้ายไว้ตรงนี้ตามสเปก เรียบร้อยแล้วครับ */}
                        <button type="button" className="gov-btn-delete-item-red" onClick={() => handleRemoveDistrictFromList(dist.districtId)}>
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  {orderedRouteDetails.length === 0 && (
                    <p style={{ textAlign: "center", color: "#888", fontSize: "13px", margin: "15px 0" }}>ยังไม่มีอำเภอถูกจัดอยู่ในโครงสร้างเส้นทาง</p>
                  )}
                </div>
                {errors.orderedDistricts && <span className="gov-error-label">{errors.orderedDistricts}</span>}
              </div>

              <div className="gov-submit-bar">
                <button type="submit" className="gov-btn-save">บันทึกข้อมูลแก้ไข</button>
                <Link to="/listMainRoute" className="gov-btn-cancel">ยกเลิก</Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateMainRoute;