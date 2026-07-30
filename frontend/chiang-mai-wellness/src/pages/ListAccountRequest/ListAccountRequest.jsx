import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHeart,
  faCircleUser,
  faChartPie,
  faClipboardCheck,
  faRoute,
  faShop,
  faNewspaper,
  faRightFromBracket,
  faMagnifyingGlass,
  faRotate,
  faSpinner,
  faCircleExclamation,
  faEye,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";

import "./ListAccountRequest.css";

const API_URL = "http://localhost:8080/api/account-requests";
const ROWS_PER_PAGE = 10;

function ListAccountRequest() {
  const navigate = useNavigate();

  const [accountRequests, setAccountRequests] = useState([]);
  const [adminName, setAdminName] = useState("Admin");

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedAdminName = localStorage.getItem("adminName");

    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    fetchAccountRequests();
  }, []);

  const fetchAccountRequests = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`ไม่สามารถโหลดข้อมูลคำร้องได้ (${response.status})`);
      }

      const data = await response.json();

      setAccountRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดคำร้อง:", error);

      setAccountRequests([]);
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
    return request.licenseId ?? request.wellnessHub?.licenseId ?? "-";
  };

  const getWellnessHubName = (request) => {
    return (
      request.wellnessHubName ?? request.wellnessHub?.wellnessHubName ?? "-"
    );
  };

  const getTelephone = (request) => {
    return request.telInformation ?? request.tellInformation ?? "-";
  };

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

  const handleViewRequest = (requestId) => {
    navigate(`/account-requests/${requestId}`);
  };

  const handleApproveRequest = (requestId) => {
    navigate(`/account-requests/${requestId}/approve`);
  };

  const handleLogout = () => {
    const confirmed = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");

    if (!confirmed) {
      return;
    }

    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="account-request-page">
      <nav className="account-request-sidebar">
        <div className="account-request-sidebar-top">
          <div className="account-request-sidebar-logo">
            <FontAwesomeIcon icon={faShieldHeart} />
            <span>Admin Panel</span>
          </div>

          <div className="account-request-user-profile">
            <FontAwesomeIcon icon={faCircleUser} />

            <div className="account-request-user-info">
              <span className="account-request-user-label">
                ผู้ใช้งานปัจจุบัน:
              </span>

              <span className="account-request-user-name">{adminName}</span>
            </div>
          </div>

          <p className="account-request-menu-label">เมนูหลัก</p>

          <Link to="/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/listAccountRequest" className="menu-item active">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnessHub" className="menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </Link>
          <Link to="/listOfficialArticle" className="menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button
          type="button"
          className="account-request-logout-button"
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          ออกจากระบบ
        </button>
      </nav>

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

                  <th className="request-column-action">การจัดการ</th>
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
                            <button
                              type="button"
                              className="account-request-view-button"
                              onClick={() =>
                                handleViewRequest(request.requestId)
                              }
                            >
                              <FontAwesomeIcon icon={faEye} />
                              ดู
                            </button>

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
