import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faMagnifyingGlass,
  faRotate,
  faSpinner,
  faPenToSquare,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

import "./ListAccountRequest.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

const API_URL = "http://localhost:8080/api/account-requests";
const ROWS_PER_PAGE = 10;

// 🌟 Cache ข้อมูลไว้ระหว่างการเปลี่ยนหน้า
// เมื่อ Refresh Browser ค่า Cache จะถูกล้างและโหลดข้อมูลใหม่จาก Backend
let accountRequestCache = null;

function ListAccountRequest() {
  const navigate = useNavigate();
  const location = useLocation();

  const [accountRequests, setAccountRequests] = useState(
    Array.isArray(accountRequestCache) ? accountRequestCache : [],
  );

  const [adminName, setAdminName] = useState("Admin");

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(
    !Array.isArray(accountRequestCache),
  );

  const [errorMessage, setErrorMessage] = useState("");

  // 🌟 State สำหรับแสดง Toast ที่ส่งมาจากหน้า Approve
  const [popupAlert, setPopupAlert] = useState({
    show: false,
    message: "",
    isSuccess: true,
  });

  // 🌟 State สำหรับ Popup ดูเหตุผลที่ไม่อนุมัติ
  const [showRejectReasonPopup, setShowRejectReasonPopup] = useState(false);

  const [selectedRejectRequest, setSelectedRejectRequest] = useState(null);

  // 🌟 State สำหรับ Popup ยืนยันออกจากระบบ
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  useEffect(() => {
    const storedAdminName = localStorage.getItem("adminName");

    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    // 🌟 โหลดจาก Backend เฉพาะครั้งแรกที่ยังไม่มี Cache
    if (!Array.isArray(accountRequestCache)) {
      fetchAccountRequests();
    }
  }, []);

  // 🌟 รับข้อมูลสถานะที่เปลี่ยนจากหน้าพิจารณา
  // เพื่ออัปเดตเฉพาะรายการนั้นโดยไม่ต้องโหลด List ใหม่ทั้งหมด
  useEffect(() => {
    if (!location.state?.updatedRequestId || !location.state?.requestStatus) {
      return;
    }

    const updatedRequestId = Number(location.state.updatedRequestId);

    const requestStatus = normalizeStatus(location.state.requestStatus);

    setAccountRequests((previousRequests) => {
      const updatedRequests = previousRequests.map((request) => {
        if (Number(request.requestId) !== updatedRequestId) {
          return request;
        }

        return {
          ...request,
          requestStatus,
          rejectionReason:
            requestStatus === "REJECTED"
              ? location.state.rejectionReason || request.rejectionReason
              : null,
        };
      });

      accountRequestCache = updatedRequests;

      return updatedRequests;
    });
  }, [
    location.state?.updatedRequestId,
    location.state?.requestStatus,
    location.state?.rejectionReason,
  ]);

  // 🌟 รับ Toast จากหน้า Approve หรือหน้าอื่นผ่าน location.state
  useEffect(() => {
    if (location.state?.showToast) {
      setPopupAlert({
        show: true,
        message: location.state.toastMessage,
        isSuccess: location.state.toastType === "success",
      });

      // ล้าง state เพื่อป้องกัน Toast แสดงซ้ำเมื่อ Refresh
      navigate(location.pathname, {
        replace: true,
      });

      const timer = setTimeout(() => {
        setPopupAlert({
          show: false,
          message: "",
          isSuccess: true,
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [location.state, location.pathname, navigate]);

  const fetchAccountRequests = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`ไม่สามารถโหลดข้อมูลคำร้องได้ (${response.status})`);
      }

      const data = await response.json();

      const normalizedData = Array.isArray(data) ? data : [];

      setAccountRequests(normalizedData);

      // 🌟 บันทึกข้อมูลไว้ใน Cache
      accountRequestCache = normalizedData;
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดคำร้อง:", error);

      setAccountRequests([]);

      accountRequestCache = null;

      setErrorMessage(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลคำร้อง");
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeStatus = (status) => {
    if (!status) {
      return "PENDING";
    }

    return String(status).trim().toUpperCase();
  };

  const getStatusText = (status) => {
    const normalizedStatus = normalizeStatus(status);

    switch (normalizedStatus) {
      case "APPROVED":
        return "อนุมัติแล้ว";

      case "REJECTED":
        return "ไม่อนุมัติ";

      case "PENDING":
      default:
        return "รอพิจารณา";
    }
  };

  const getStatusClassName = (status) => {
    const normalizedStatus = normalizeStatus(status);

    switch (normalizedStatus) {
      case "APPROVED":
        return "request-status-approved";

      case "REJECTED":
        return "request-status-rejected";

      case "PENDING":
      default:
        return "request-status-pending";
    }
  };

  const getLicenseId = (request) => {
    return (
      request.licenseId ??
      request.wellnessHub?.licenseId ??
      request.emergencyService?.licenseId ??
      "-"
    );
  };

  const getWellnessHubName = (request) => {
    return (
      request.wellnessHubName ??
      request.wellnessHub?.wellnessHubName ??
      request.emergencyService?.wellnessHubName ??
      "-"
    );
  };

  const getTelephone = (request) => {
    return (
      request.telInformation ??
      request.tellInformation ??
      request.emergencyService?.telInformation ??
      "-"
    );
  };

  const pendingCount = useMemo(() => {
    return accountRequests.filter((request) => {
      const status = normalizeStatus(request.requestStatus || request.status);
      return status === "PENDING";
    }).length;
  }, [accountRequests]);

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    return accountRequests
      .filter((request) => {
        const status = normalizeStatus(request.requestStatus);

        const matchesStatus = !statusFilter || status === statusFilter;

        const searchableText = [
          request.requestId,
          getLicenseId(request),
          getWellnessHubName(request),
          request.userEmail,
          request.contactInformation,
          getTelephone(request),
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        const matchesKeyword =
          !normalizedKeyword || searchableText.includes(normalizedKeyword);

        return matchesStatus && matchesKeyword;
      })
      .sort((first, second) => {
        return (second.requestId || 0) - (first.requestId || 0);
      });
  }, [accountRequests, searchKeyword, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ROWS_PER_PAGE),
  );

  const firstRowIndex = (currentPage - 1) * ROWS_PER_PAGE;

  const currentRows = filteredRequests.slice(
    firstRowIndex,
    firstRowIndex + ROWS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchKeyword("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleApproveRequest = (requestId) => {
    navigate(`/account-requests/${requestId}/approve`);
  };

  const handleShowRejectReason = (request) => {
    setSelectedRejectRequest(request);
    setShowRejectReasonPopup(true);
  };

  const handleCloseRejectReason = () => {
    setShowRejectReasonPopup(false);
    setSelectedRejectRequest(null);
  };

  // 🌟 เปิด Popup ยืนยันออกจากระบบ
  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  // 🌟 ยืนยันออกจากระบบ
  const handleConfirmLogout = () => {
    localStorage.clear();

    // 🌟 ล้าง Cache เมื่อออกจากระบบ
    accountRequestCache = null;

    setShowLogoutPopup(false);

    navigate("/login");
  };

  return (
    <div className="account-request-page">
      {/* 🌟 Toast แจ้งผลหลังกลับมาจากหน้า Approve */}
      {popupAlert.show && (
        <div
          className={`gov-toast-alert ${popupAlert.isSuccess ? "alert-success" : "alert-error"
            }`}
        >
          <div className="toast-content-wrapper">
            <i
              className={
                popupAlert.isSuccess
                  ? "fa-solid fa-circle-check"
                  : "fa-solid fa-circle-exclamation"
              }
            ></i>

            <span>{popupAlert.message}</span>
          </div>

          <button
            type="button"
            className="btn-close-toast"
            onClick={() =>
              setPopupAlert({
                show: false,
                message: "",
                isSuccess: true,
              })
            }
            aria-label="ปิดข้อความแจ้งเตือน"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* 🌟 Popup แสดงเหตุผลที่ไม่อนุมัติ */}
      {showRejectReasonPopup && selectedRejectRequest && (
        <div className="popup-bg" onClick={handleCloseRejectReason}>
          <div
            className="popup reject-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="popup-icon error">
              <FontAwesomeIcon icon={faCircleExclamation} />
            </div>

            <h3>เหตุผลที่ไม่อนุมัติคำร้อง</h3>

            <p>
              สถานประกอบการ{" "}
              <strong>{getWellnessHubName(selectedRejectRequest)}</strong>
            </p>

            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                color: "#334155",
                lineHeight: "1.7",
                textAlign: "left",
              }}
            >
              {selectedRejectRequest.rejectionReason || "ไม่ได้ระบุเหตุผล"}
            </div>

            <div className="popup-buttons">
              <button
                type="button"
                className="confirm-btn"
                onClick={handleCloseRejectReason}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar
        activeMenu="account-requests"
        pendingCount={pendingCount}
      />

      <main className="account-request-main">
        <div className="account-request-container">
          <header className="account-request-header">
            <h2>บัญชีรายชื่อคำร้องขอเปิดใช้งานระบบ (List Account Request)</h2>

            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <section className="account-request-filter-bar">
            <input
              type="text"
              className="account-request-filter-input"
              placeholder="ค้นหาชื่อสถานประกอบการ เลขใบอนุญาต หรืออีเมล..."
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            <select
              className="account-request-filter-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">-- สถานะทั้งหมด --</option>
              <option value="PENDING">รอพิจารณา</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
            </select>

            <button
              type="button"
              className="account-request-search-button"
              onClick={handleSearch}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              ค้นหา
            </button>

            <button
              type="button"
              className="account-request-reset-button"
              onClick={handleResetFilter}
            >
              <FontAwesomeIcon icon={faRotate} />
              ล้างค่า
            </button>
          </section>

          {errorMessage && (
            <div className="account-request-error-box">
              <FontAwesomeIcon icon={faCircleExclamation} />

              <span>{errorMessage}</span>

              <button type="button" onClick={fetchAccountRequests}>
                ลองใหม่
              </button>
            </div>
          )}

          <section className="account-request-table-card">
            <table className="account-request-table">
              <thead>
                <tr>
                  <th className="request-column-number">ลำดับ</th>
                  <th className="request-column-license">เลขใบอนุญาต</th>
                  <th className="request-column-name">ชื่อสถานประกอบการ</th>
                  <th className="request-column-contact">ผู้ติดต่อ</th>
                  <th className="request-column-tel">เบอร์โทรศัพท์</th>
                  <th className="request-column-email">อีเมล</th>
                  <th className="request-column-status">สถานะ</th>
                  <th className="request-column-action">การพิจารณา</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="account-request-loading">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      กำลังโหลดข้อมูลคำร้อง...
                    </td>
                  </tr>
                ) : currentRows.length > 0 ? (
                  currentRows.map((request, index) => {
                    const status = normalizeStatus(request.requestStatus);

                    return (
                      <tr key={request.requestId}>
                        <td className="text-center request-number-cell">
                          {firstRowIndex + index + 1}
                        </td>

                        <td className="text-center">{getLicenseId(request)}</td>

                        <td className="request-name-cell">
                          <strong>{getWellnessHubName(request)}</strong>
                        </td>

                        <td className="text-center">
                          {request.contactInformation || "-"}
                        </td>

                        <td className="text-center">{getTelephone(request)}</td>

                        <td className="text-center">
                          {request.userEmail || "-"}
                        </td>

                        <td className="text-center">
                          <span className={getStatusClassName(status)}>
                            [ {getStatusText(status)} ]
                          </span>
                        </td>

                        <td>
                          <div className="account-request-action-group">
                            {status === "PENDING" && (
                              <button
                                type="button"
                                className="account-request-consider-button"
                                onClick={() =>
                                  handleApproveRequest(request.requestId)
                                }
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                พิจารณา
                              </button>
                            )}

                            {status === "APPROVED" && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: "#15803d",
                                  fontWeight: "600",
                                  fontSize: "13px",
                                }}
                              >
                                <FontAwesomeIcon icon={faCircleCheck} />
                                อนุมัติแล้ว
                              </span>
                            )}

                            {status === "REJECTED" && (
                              <button
                                type="button"
                                className="account-request-view-button"
                                onClick={() => handleShowRejectReason(request)}
                              >
                                <FontAwesomeIcon icon={faCircleExclamation} />
                                ดูเหตุผล
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="account-request-empty">
                      <FontAwesomeIcon icon={faCircleExclamation} />
                      ไม่พบข้อมูลคำร้องขอเปิดใช้งานระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {!isLoading && totalPages > 1 && (
            <div className="account-request-pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                ก่อนหน้า
              </button>

              <span>
                หน้า {currentPage} จาก {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ListAccountRequest;