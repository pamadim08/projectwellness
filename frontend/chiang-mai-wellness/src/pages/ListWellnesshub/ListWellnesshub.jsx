import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./ListWellnesshub.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faMagnifyingGlass,
  faRotate,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";

// 1. ตัวแปรเก็บ Cache และฟังก์ชัน Clear Cache สำหรับ export ไปใช้หน้าอื่น (Add/Edit)
let wellnessHubCache = null;
export const clearWellnessHubCache = () => {
  wellnessHubCache = null;
};

const ListWellnessHub = () => {
  const [listwellnesshub, setListWellnessHub] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const navigate = useNavigate();
  const location = useLocation();

  // State สำหรับจัดการ Popup ยืนยันการลบ
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedHub, setSelectedHub] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State ตัวเลือกและค่าการกรอง
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  // State สำหรับควบคุม Toast แจ้งเตือน
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  // 2. ฟังก์ชันโหลดข้อมูลพร้อมระบบตรวจสอบ Cache
  const loadData = async (
    search = searchQuery,
    cat = selectedCategory,
    dist = selectedDistrict,
    forceRefresh = false,
  ) => {
    const isDefaultFilter = !search && !cat && !dist;

    if (wellnessHubCache && isDefaultFilter && !forceRefresh) {
      setListWellnessHub(wellnessHubCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/wellness-hubs/search",
        {
          search: search || null,
          categoryId: cat || null,
          districtId: dist || null,
        },
      );

      const data = Array.isArray(response.data) ? response.data : [];

      if (isDefaultFilter) {
        wellnessHubCache = data;
      }

      setListWellnessHub(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setListWellnessHub([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [catResponse, distResponse] = await Promise.all([
        axios.get("http://localhost:8080/api/categories"),
        axios.get("http://localhost:8080/api/districts"),
      ]);
      setCategories(Array.isArray(catResponse.data) ? catResponse.data : []);
      setDistricts(Array.isArray(distResponse.data) ? distResponse.data : []);
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  // 3. แยก useEffect สำหรับโหลดข้อมูลครั้งแรกเมื่อ mount
  useEffect(() => {
    loadData();
    loadFilterOptions();
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
  }, []);

  // แยก useEffect สำหรับตรวจจับ Toast แจ้งเตือนจากการ redirect
  useEffect(() => {
    if (location.state?.showToast) {
      setToast({
        show: true,
        type: location.state.toastType,
        message: location.state.toastMessage,
      });

      window.history.replaceState({}, document.title);

      const timer = setTimeout(() => {
        setToast({ show: false, type: "", message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const isStatusActive = (status) => {
    if (!status || String(status).trim() === "") return true;
    return String(status).trim().toLowerCase() === "active";
  };

  const filteredData = useMemo(() => {
    if (!listwellnesshub || listwellnesshub.length === 0) return [];
    return [...listwellnesshub].sort((a, b) => {
      const getTime = (item) => {
        const dateVal = item.updatedAt || item.createdAt;
        if (!dateVal) return 0;
        const time = new Date(dateVal).getTime();
        return Number.isNaN(time) ? 0 : time;
      };

      const timeA = getTime(a);
      const timeB = getTime(b);

      if (timeB !== timeA) {
        return timeB - timeA;
      }

      const idA = a.licenseId ? parseInt(a.licenseId, 10) : 0;
      const idB = b.licenseId ? parseInt(b.licenseId, 10) : 0;
      return idB - idA;
    });
  }, [listwellnesshub]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // 4. ฟังก์ชันยืนยันการลบสถานประกอบการ พร้อมล้าง Cache และ Force Refresh
  const confirmDeleteHub = async () => {
    if (!selectedHub || isDeleting) return;

    try {
      setIsDeleting(true);

      await axios.delete(
        `http://localhost:8080/api/wellness-hubs/${selectedHub.licenseId}`,
      );

      setShowDeletePopup(false);
      setSelectedHub(null);

      // ล้าง Cache และโหลดใหม่แบบ forceRefresh
      wellnessHubCache = null;
      await loadData("", "", "", true);

      setToast({
        show: true,
        type: "success",
        message: "ลบข้อมูลสถานประกอบการเสร็จสิ้น",
      });

      setTimeout(() => {
        setToast({
          show: false,
          type: "",
          message: "",
        });
      }, 4000);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการลบสถานประกอบการ", error);

      setShowDeletePopup(false);
      setSelectedHub(null);

      setToast({
        show: true,
        type: "error",
        message: "ไม่สามารถลบข้อมูลออกจากระบบได้",
      });

      setTimeout(() => {
        setToast({
          show: false,
          type: "",
          message: "",
        });
      }, 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-layout">
      {toast.show && (
        <div className={`gov-toast-alert alert-${toast.type}`}>
          <div className="toast-content-wrapper">
            <i
              className={`fa-solid ${
                toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark"
              }`}
            ></i>
            <span>{toast.message}</span>
          </div>
          <button
            className="btn-close-toast"
            onClick={() => setToast({ show: false, type: "", message: "" })}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <AdminSidebar activeMenu="wellness-hubs" />

      <div className="main-content">
        <div className="gov-container">
          <header className="gov-header">
            <h2>บัญชีรายชื่อสถานประกอบการ (List Wellness Hub)</h2>
            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <div className="action-bar-top">
            <button
              className="btn-gov-add"
              onClick={() => navigate("/add-wellness")}
            >
              <i className="fa-solid fa-plus"></i> เพิ่มสถานประกอบการใหม่
            </button>
          </div>

          <div className="gov-filter-bar">
            <input
              type="text"
              className="gov-input"
              placeholder="ค้นหาชื่อสถานประกอบการ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                  loadData(searchQuery, selectedCategory, selectedDistrict);
                }
              }}
            />

            <select
              className="gov-select"
              value={selectedCategory}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCategory(value);
                setCurrentPage(1);
                loadData(searchQuery, value, selectedDistrict);
              }}
            >
              <option value="">-- หมวดหมู่ทั้งหมด --</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>

            <select
              className="gov-select"
              value={selectedDistrict}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDistrict(value);
                setCurrentPage(1);
                loadData(searchQuery, selectedCategory, value);
              }}
            >
              <option value="">-- อำเภอทั้งหมด --</option>
              {districts.map((dist) => (
                <option key={dist.districtId} value={dist.districtId}>
                  {dist.districtName}
                </option>
              ))}
            </select>

            <button
              className="btn-gov-search"
              onClick={() => {
                setCurrentPage(1);
                loadData(searchQuery, selectedCategory, selectedDistrict);
              }}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} /> ค้นหา
            </button>

            <button
              className="btn-gov-search"
              style={{ backgroundColor: "#6c757d" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedDistrict("");
                setCurrentPage(1);
                loadData("", "", "");
              }}
            >
              <FontAwesomeIcon icon={faRotate} /> ล้างค่า
            </button>
          </div>

          <div className="gov-table-container">
            <table className="list-table">
              <thead>
                <tr>
                  <th width="10%" className="text-center">
                    รหัสสถานประกอบการ
                  </th>
                  <th width="35%">ชื่อสถานประกอบการ</th>
                  <th width="20%">หมวดหมู่</th>
                  <th width="15%">อำเภอ</th>
                  <th width="12%">สถานะ</th>
                  <th width="8%">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="gov-loading-row"
                      style={{
                        textAlign: "center",
                        padding: "30px 0",
                        color: "#666",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faSpinner}
                        spin
                        style={{ marginRight: "8px" }}
                      />{" "}
                      กำลังโหลดข้อมูลระบบ...
                    </td>
                  </tr>
                ) : currentRows.length > 0 ? (
                  currentRows.map((hub, index) => (
                    <tr key={hub.licenseId ?? index}>
                      <td
                        className="text-center"
                        style={{ fontWeight: "600", color: "#495057" }}
                      >
                        {hub.licenseId ?? "-"}
                      </td>
                      <td>
                        <strong>{hub.wellnessHubName ?? "ไม่ระบุชื่อ"}</strong>
                      </td>
                      <td>{hub.category?.categoryName ?? "-"}</td>
                      <td className="text-center">
                        {hub.district?.districtName ?? "-"}
                      </td>
                      <td className="text-center">
                        <span
                          className="status-text"
                          style={{
                            color: isStatusActive(hub.status)
                              ? "#1c7430"
                              : "#c82333",
                          }}
                        >
                          {isStatusActive(hub.status)
                            ? "[ เปิดใช้งาน ]"
                            : "[ ระงับการใช้งาน ]"}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          <button
                            className="btn-edit"
                            onClick={() =>
                              navigate(`/listWellnesshub/edit/${hub.licenseId}`)
                            }
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => {
                              setSelectedHub(hub);
                              setShowDeletePopup(true);
                            }}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center"
                      style={{
                        padding: "30px",
                        color: "#dc3545",
                        fontWeight: "bold",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faCircleExclamation}
                        style={{ marginRight: "8px" }}
                      />{" "}
                      ไม่พบข้อมูลสถานประกอบการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="gov-pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ก่อนหน้า
              </button>
              <span>
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeletePopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>

            <h3>ยืนยันการลบข้อมูล</h3>

            <p>
              คุณต้องการลบสถานประกอบการ
              <span className="popup-route-name">
                {selectedHub?.wellnessHubName}
              </span>
              ใช่หรือไม่?
              <span className="popup-warning-text">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </span>
            </p>

            <div className="popup-buttons">
              <button
                type="button"
                className="cancel-btn"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedHub(null);
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="delete-btn"
                disabled={isDeleting}
                onClick={confirmDeleteHub}
              >
                {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListWellnessHub;
