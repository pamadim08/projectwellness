import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axiosInstance from "axios";
import L from "leaflet";
import "leaflet-routing-machine";
import "./CreateMainRoute.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

// 🌟 1. ค่าคงที่และ Helper function ด้านนอก Component
const REQUIRED_EMERGENCY_CATEGORY_IDS = ["EM01", "EM02"];

const mergeRequiredCategories = (categoryIds = []) => {
  return [
    ...new Set([
      ...categoryIds.map(String),
      ...REQUIRED_EMERGENCY_CATEGORY_IDS,
    ]),
  ];
};

// ตรวจสอบความถูกต้องของพิกัดก่อนนำไปนับและปักหมุด
const hasValidCoordinates = (hub) => {
  const rawLatitude = hub?.wellnessHubLatitude;
  const rawLongitude = hub?.wellnessHubLongitude;

  if (
    rawLatitude === null ||
    rawLatitude === undefined ||
    rawLongitude === null ||
    rawLongitude === undefined ||
    String(rawLatitude).trim() === "" ||
    String(rawLongitude).trim() === ""
  ) {
    return false;
  }

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

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
  const [adminName, setAdminName] = useState("admin02");

  // States ทะเบียนข้อมูลหลักจาก DB
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wellnessHubs, setWellnessHubs] = useState([]);

  // States จัดลำดับและรายการควบคุมหน้าบ้าน
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    REQUIRED_EMERGENCY_CATEGORY_IDS,
  );

  const [orderedRouteDetails, setOrderedRouteDetails] = useState([]);
  const [errors, setErrors] = useState({});

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageExistingName, setImageExistingName] = useState("");
  const [imageError, setImageError] = useState("");

  // Refs จัดการเลเยอร์ Leaflet
  const districtMarkersRef = useRef({});
  const placeMarkersRef = useRef({});

  // ฟังก์ชันแยกประเภทหมวดหมู่ ดึงสี ไอคอน และเช็คหมวดฉุกเฉิน
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
        color: "#D9434E",
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
        color: "#E0A000",
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
        color: "#2E9D62",
        icon: "fa-spa",
        isEmergency: false,
        label: "นวด/สปาเพื่อสุขภาพ",
      };
    }

    if (key.includes("C03") || name.includes("REST") || name.includes("FOOD")) {
      return {
        color: "#F28C28",
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
        color: "#7C63D9",
        icon: "fa-bed",
        isEmergency: false,
        label: "ที่พักฟื้นฟูสุขภาพ",
      };
    }

    if (key.includes("C02") || name.includes("CLINIC")) {
      return {
        color: "#2563A6",
        icon: "fa-notes-medical",
        isEmergency: false,
        label: "คลินิก/สถานพยาบาล",
      };
    }

    if (
      key.includes("C05") ||
      name.includes("ATTRACTION") ||
      name.includes("TOURIST") ||
      name.includes("TRAVEL") ||
      name.includes("ท่องเที่ยว")
    ) {
      return {
        color: "#28A9D8",
        icon: "fa-map-location-dot",
        isEmergency: false,
        label: "สถานที่ท่องเที่ยว",
      };
    }

    return {
      color: "#28A9D8",
      icon: "fa-location-dot",
      isEmergency: false,
      label: categoryName || "อื่นๆ",
    };
  };

  function normalizeRouteImage(value) {
    if (!value) return "";
    const normalizedValue = String(value).trim();
    if (
      normalizedValue.startsWith("http://") ||
      normalizedValue.startsWith("https://") ||
      normalizedValue.startsWith("blob:")
    ) {
      return normalizedValue;
    }
    if (normalizedValue.startsWith("/uploads/")) {
      return `http://localhost:8080${normalizedValue}`;
    }
    return `http://localhost:8080/uploads/routes/${normalizedValue}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
      reader.readAsDataURL(file);
    });
  }

  const handleImageChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("ชนิดไฟล์ไม่รองรับ (รองรับ JPG/PNG/WEBP)");
      event.target.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setImageError("ขนาดไฟล์ต้องไม่เกิน 5 MB");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageFile(file);
      setImagePreview(dataUrl);
      setImageFileName(file.name);
      setImageError("");
    } catch (err) {
      console.error("❌ ไม่สามารถอ่านไฟล์รูปภาพได้", err);
      setImageError("ไม่สามารถอ่านไฟล์ได้ กรุณาลองอีกครั้ง");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageFileName("");
    setImageExistingName("");
    setImageError("");
  };

  const loadRouteData = async (routeId, currentDistricts) => {
    try {
      const routeRes = await axiosInstance.get(
        `http://localhost:8080/api/main-routes/${routeId}`,
      );

      if (routeRes.data) {
        const data = routeRes.data;
        setRouteName(data.routeName || "");
        setRouteDescription(data.routeDescription || "");

        if (data.routeImage) {
          setImageExistingName(data.routeImage);
          setImagePreview(normalizeRouteImage(data.routeImage));
          setImageFileName(data.routeImage);
        }

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
                (district) =>
                  String(district.districtId) === String(districtId),
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
    if (storedAdmin) {
      setAdminName(storedAdmin);
    }

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

  // โหลด Route เดิมเมื่อมีข้อมูลอำเภอพร้อม
  useEffect(() => {
    let isMounted = true;

    const fetchExistingRoute = async () => {
      if (id && districts.length > 0) {
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
  }, [id, districts]);

  // Initial Leaflet Map
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
        } catch (error) { }
        routingControlRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // วาดเส้น วางหมุดอำเภอ และปักหมุดสถานที่บนแผนที่
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 1. หมุดจุดตรวจระดับอำเภอ
    Object.values(districtMarkersRef.current).forEach((marker) => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    districtMarkersRef.current = {};

    orderedRouteDetails.forEach((dist, idx) => {
      const rawLatitude = dist.district?.latitude ?? dist.latitude;
      const rawLongitude = dist.district?.longitude ?? dist.longitude;
      const name = dist.district?.districtName ?? dist.districtName;

      if (
        rawLatitude === null ||
        rawLatitude === undefined ||
        rawLongitude === null ||
        rawLongitude === undefined ||
        String(rawLatitude).trim() === "" ||
        String(rawLongitude).trim() === ""
      ) {
        return;
      }

      const latitude = Number(rawLatitude);
      const longitude = Number(rawLongitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      const marker = L.circleMarker([latitude, longitude], {
        radius: 11,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1a2332",
        fillOpacity: 1,
      }).addTo(map).bindPopup(`
            <div style="font-family:'Sarabun',sans-serif; text-align:center; padding:2px;">
              <span style="font-size:11px; color:#64748b; font-weight:bold; display:block;">
                จุดที่ ${idx + 1}
              </span>
              <strong style="font-size:14px; color:#0f172a;">
                อำเภอ${name}
              </strong>
            </div>
          `);

      districtMarkersRef.current[name] = marker;
    });

    // 2. Leaflet Routing Machine
    if (routingControlRef.current) {
      try {
        routingControlRef.current.setWaypoints([]);
        if (map && map.removeControl) {
          map.removeControl(routingControlRef.current);
        }
      } catch (error) { }
      routingControlRef.current = null;
    }

    const waypoints = orderedRouteDetails
      .map((district) => {
        const rawLatitude = district.district?.latitude ?? district.latitude;
        const rawLongitude = district.district?.longitude ?? district.longitude;

        if (
          rawLatitude === null ||
          rawLatitude === undefined ||
          rawLongitude === null ||
          rawLongitude === undefined ||
          String(rawLatitude).trim() === "" ||
          String(rawLongitude).trim() === ""
        ) {
          return null;
        }

        const latitude = Number(rawLatitude);
        const longitude = Number(rawLongitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return null;
        }

        return L.latLng(latitude, longitude);
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
        }).addTo(map);
      } catch (err) {
        console.error("ขัดข้องในการวาดเส้นถนน", err);
      }
    }

    if (waypoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(waypoints), {
          padding: [40, 40],
        });
      } catch (error) { }
    }

    // 3. หมุดสถานประกอบการ
    Object.values(placeMarkersRef.current).forEach((marker) => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    placeMarkersRef.current = {};

    if (orderedRouteDetails.length > 0) {
      const activeDistrictIds = orderedRouteDetails.map((district) =>
        String(district.district?.districtId ?? district.districtId),
      );

      const matchedHubs = wellnessHubs.filter((hub) => {
        const hubDistId =
          hub.district?.districtId !== null &&
            hub.district?.districtId !== undefined
            ? String(hub.district.districtId)
            : null;

        const hubCatId =
          hub.category?.categoryId !== null &&
            hub.category?.categoryId !== undefined
            ? String(hub.category.categoryId)
            : null;

        const catName = hub.category?.categoryName || "";
        const style = getCategoryStyle(hubCatId, catName);

        return (
          activeDistrictIds.includes(hubDistId) &&
          (style.isEmergency ||
            selectedCategoryIds.includes(String(hubCatId))) &&
          hasValidCoordinates(hub)
        );
      });

      matchedHubs.forEach((hub) => {
        const latitude = Number(hub.wellnessHubLatitude);
        const longitude = Number(hub.wellnessHubLongitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return;
        }

        const catId = hub.category?.categoryId || "";
        const catName = hub.category?.categoryName || "";
        const styleInfo = getCategoryStyle(catId, catName);

        const customIcon = L.divIcon({
          html: `
                <div style="background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:2px solid white;">
                  <div style="background:${styleInfo.color}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">
                    <i class="fa-solid ${styleInfo.icon}" style="font-size:11px;"></i>
                  </div>
                </div>
              `,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const popupHtml = `
            <div style="font-family:'Sarabun',sans-serif; padding:2px; min-width:140px;">
              <strong style="font-size:13px; color:#111; display:block; margin-bottom:4px;">
                🏢 ${hub.wellnessHubName}
              </strong>

              <span style="font-size:11px; color:#666; display:block;">
                อ.${hub.district?.districtName || hub.districtName || ""}
              </span>

              <span style="font-size:12px; color:${styleInfo.color}; font-weight:bold; display:block; margin-top:4px;">
                ✨ ${catName || styleInfo.label}
              </span>
            </div>
          `;

        placeMarkersRef.current[hub.licenseId] = L.marker(
          [latitude, longitude],
          { icon: customIcon },
        )
          .addTo(map)
          .bindPopup(popupHtml);
      });
    }
  }, [orderedRouteDetails, selectedCategoryIds, wellnessHubs]);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("adminName");
      navigate("/admin/login");
    }
  };

  const getCountForCategory = (catId) => {
    const activeDistrictIds = orderedRouteDetails.map((district) =>
      String(district.district?.districtId ?? district.districtId),
    );

    return wellnessHubs.filter((hub) => {
      const hubDistId =
        hub.district?.districtId !== null &&
          hub.district?.districtId !== undefined
          ? String(hub.district.districtId)
          : null;

      const hubCatId =
        hub.category?.categoryId !== null &&
          hub.category?.categoryId !== undefined
          ? String(hub.category.categoryId)
          : null;

      return (
        activeDistrictIds.includes(hubDistId) &&
        String(hubCatId) === String(catId) &&
        hasValidCoordinates(hub)
      );
    }).length;
  };

  const getCountForDistrict = (districtId) => {
    return wellnessHubs.filter((hub) => {
      const hubDistId =
        hub.district?.districtId !== null &&
          hub.district?.districtId !== undefined
          ? String(hub.district.districtId)
          : null;

      const hubCatId =
        hub.category?.categoryId !== null &&
          hub.category?.categoryId !== undefined
          ? String(hub.category.categoryId)
          : null;

      const catName = hub.category?.categoryName || "";
      const style = getCategoryStyle(hubCatId, catName);

      return (
        String(hubDistId) === String(districtId) &&
        (style.isEmergency || selectedCategoryIds.includes(String(hubCatId))) &&
        hasValidCoordinates(hub)
      );
    }).length;
  };

  const getTotalPinsCount = () => {
    const activeDistrictIds = orderedRouteDetails.map((district) =>
      String(district.district?.districtId ?? district.districtId),
    );

    return wellnessHubs.filter((hub) => {
      const hubDistId =
        hub.district?.districtId !== null &&
          hub.district?.districtId !== undefined
          ? String(hub.district.districtId)
          : null;

      const hubCatId =
        hub.category?.categoryId !== null &&
          hub.category?.categoryId !== undefined
          ? String(hub.category.categoryId)
          : null;

      const catName = hub.category?.categoryName || "";
      const style = getCategoryStyle(hubCatId, catName);

      return (
        activeDistrictIds.includes(hubDistId) &&
        (style.isEmergency || selectedCategoryIds.includes(String(hubCatId))) &&
        hasValidCoordinates(hub)
      );
    }).length;
  };

  const selectedCategories = categories.filter((category) => {
    const categoryId = String(category.categoryId);
    return (
      REQUIRED_EMERGENCY_CATEGORY_IDS.includes(categoryId) ||
      selectedCategoryIds.includes(categoryId)
    );
  });

  const handleCategoryToggle = (catId) => {
    const normalizedCategoryId = String(catId);
    if (REQUIRED_EMERGENCY_CATEGORY_IDS.includes(normalizedCategoryId)) return;

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
      (district) =>
        String(district.district?.districtId ?? district.districtId) ===
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
      (district) => String(district.districtId) === String(selectDistrictValue),
    );

    if (targetDistrict) {
      setOrderedRouteDetails([...orderedRouteDetails, targetDistrict]);
      setSelectDistrictValue("");
      setErrors({
        ...errors,
        orderedDistricts: "",
      });
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
        (district) =>
          String(district.district?.districtId ?? district.districtId) !==
          String(districtId),
      ),
    );
  };

  // 🌟 ฟังก์ชันจัดการ Submit Form อัปเดตและบันทึกภาพปก
  const handleSubmitFinalForm = async (event) => {
    event.preventDefault();

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

    setIsSubmitting(true);

    try {
      let finalRouteImage = imageExistingName || "";

      // หากมีการเลือกไฟล์รูปใหม่ ให้ทำการ Upload ก่อนบันทึก
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await axiosInstance.post(
          "http://localhost:8080/api/main-routes/upload-image",
          formData,
        );

        const uploadedFilename = uploadResponse.data?.filename;

        if (!uploadedFilename) {
          setIsSubmitting(false);
          setImageError("ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
          return;
        }

        finalRouteImage = String(uploadedFilename).trim();
      }

      const categoryIdsForSave = mergeRequiredCategories(selectedCategoryIds);

      const finalPayload = {
        routeName: routeName.trim(),
        routeDescription: routeDescription.trim(),
        routeImage: finalRouteImage,
        categoryIds: categoryIdsForSave,
        details: orderedRouteDetails.map((dist, idx) => ({
          orderNumber: idx + 1,
          districtId: dist.district?.districtId ?? dist.districtId,
        })),
      };

      if (id) {
        await axiosInstance.put(
          `http://localhost:8080/api/main-routes/${id}`,
          finalPayload,
        );

        navigate("/listMainRoute", {
          state: {
            showToast: true,
            toastType: "success",
            toastMessage: "แก้ไขและบันทึกรูปภาพเส้นทางสำเร็จ",
          },
        });
        return;
      }

      await axiosInstance.post(
        "http://localhost:8080/api/main-routes",
        finalPayload,
      );

      navigate("/listMainRoute", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: "เพิ่มเส้นทางสุขภาพใหม่สำเร็จสิ้น",
        },
      });
    } catch (err) {
      console.error("❌ ไม่สามารถบันทึกข้อมูลเส้นทางได้", err);
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
      {loadingRoute && (
        <div className="loading-overlay">
          <div className="loading-box">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <h3>กำลังโหลดข้อมูลเส้นทาง</h3>
            <p>กรุณารอสักครู่ ระบบกำลังดึงแผนที่ หมวดหมู่ และอำเภอเดิม</p>
          </div>
        </div>
      )}

      <AdminSidebar activeMenu="routes" />

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
                  style={{ background: "#2E9D62" }}
                ></div>
                นวด/สปาเพื่อสุขภาพ (C01)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#F28C28" }}
                ></div>
                อาหารและเครื่องดื่ม (C03)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#7C63D9" }}
                ></div>
                ที่พักฟื้นฟูสุขภาพ (C04)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#2563A6" }}
                ></div>
                คลินิก/สถานพยาบาล (C02)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#28A9D8" }}
                ></div>
                สถานที่ท่องเที่ยว (C05)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#D9434E" }}
                ></div>
                ALS (Advanced Hospital)
              </div>

              <div className="gov-legend-item">
                <div
                  className="gov-legend-color"
                  style={{ background: "#E0A000" }}
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
                  {selectedCategories.map((category) => (
                    <tr
                      key={category.categoryId}
                      style={{ borderBottom: "1px solid #e2e8f0" }}
                    >
                      <td style={{ padding: "6px 0" }}>
                        {category.categoryName}
                      </td>
                      <td
                        style={{
                          padding: "6px 0",
                          textAlign: "right",
                          fontWeight: "600",
                        }}
                      >
                        {getCountForCategory(category.categoryId)} แห่ง
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
                  className={`gov-input-text ${errors.routeName ? "gov-input-border-error" : ""
                    }`}
                  value={routeName}
                  onChange={(event) => setRouteName(event.target.value)}
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
                  onChange={(event) => setRouteDescription(event.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม หรือคำแนะนำของเส้นทางสุขภาพหลักนี้..."
                />
              </div>

              {/* SECTION 1: ประเภทสถานที่ */}
              <div className="gov-form-group">
                <label className="gov-label-bold">
                  1. ประเภทสถานที่ที่จะแสดง (หมุดบนแผนที่)*
                </label>

                <div
                  className={`gov-category-grid ${errors.categories ? "gov-input-border-error" : ""
                    }`}
                >
                  {categories.map((category) => {
                    const catIdStr = String(category.categoryId);
                    const styleInfo = getCategoryStyle(
                      category.categoryId,
                      category.categoryName,
                    );
                    const isEmergency = styleInfo.isEmergency;
                    const isChecked =
                      isEmergency || selectedCategoryIds.includes(catIdStr);
                    const currentCount = getCountForCategory(
                      category.categoryId,
                    );

                    return (
                      <div
                        key={category.categoryId}
                        className={`gov-category-card ${isChecked ? "gov-selected" : ""
                          } ${isEmergency ? "gov-disabled-card" : ""}`}
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
                            {category.categoryName}
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
                    onChange={(event) =>
                      setSelectDistrictValue(event.target.value)
                    }
                  >
                    <option value="">-- เลือกรายการอำเภอหลัก --</option>
                    {districts.map((district) => (
                      <option
                        key={district.districtId}
                        value={String(district.districtId)}
                      >
                        อ.{district.districtName}
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
                  className={`gov-order-list-container ${errors.orderedDistricts ? "gov-input-border-error" : ""
                    }`}
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
                            style={{
                              display: "flex",
                              flexDirection: "column",
                            }}
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

              {/* SECTION 3: Image upload for route */}
              <div className="gov-route-image-section">
                <div className="gov-route-image-header">
                  <div>
                    <label className="gov-label-bold">รูปภาพปกเส้นทาง</label>
                    <p className="gov-route-image-description">
                      ใช้เป็นภาพหลักสำหรับแสดงเส้นทางในหน้าเว็บไซต์
                    </p>
                  </div>
                  <span className="gov-route-image-badge">
                    <i className="fa-regular fa-image"></i>
                    รูปปก 1 รูป
                  </span>
                </div>

                <div className="gov-route-image-content">
                  <div className="gov-route-image-preview">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="ตัวอย่างรูปภาพปกเส้นทาง"
                        className="gov-route-image-preview-img"
                      />
                    ) : (
                      <div className="gov-route-image-empty">
                        <div className="gov-route-image-empty-icon">
                          <i className="fa-regular fa-image"></i>
                        </div>
                        <strong>ยังไม่มีรูปภาพ</strong>
                        <span>เลือกรูปเพื่อดูตัวอย่างก่อนบันทึก</span>
                      </div>
                    )}
                  </div>

                  <div className="gov-route-image-actions">
                    <div className="gov-route-image-buttons">
                      <label className="gov-route-image-upload-button">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
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
                          className="gov-route-image-remove-button"
                          onClick={removeImage}
                        >
                          <i className="fa-solid fa-trash"></i>
                          ลบรูป
                        </button>
                      )}
                    </div>

                    <p className="gov-route-image-hint">
                      รองรับ JPG, PNG, WEBP • ขนาดสูงสุด 5 MB
                    </p>

                    {imageFileName && (
                      <div className="gov-route-image-file">
                        <i className="fa-solid fa-paperclip"></i>
                        <span title={imageFileName}>{imageFileName}</span>
                      </div>
                    )}

                    {imageError && (
                      <div className="gov-route-image-error">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        {imageError}
                      </div>
                    )}
                  </div>
                </div>
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
