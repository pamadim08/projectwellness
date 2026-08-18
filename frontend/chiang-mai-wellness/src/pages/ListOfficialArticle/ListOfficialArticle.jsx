import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  faPlus,
  faMagnifyingGlass,
  faRotate,
  faSpinner,
  faCircleExclamation,
  faPenToSquare,
  faTrashCan,
  faCircleCheck,
  faCircleXmark,
  faXmark,
  faImage,
} from "@fortawesome/free-solid-svg-icons";

import "./ListOfficialArticle.css";

const API_URL = "http://localhost:8080/api/articles";
const ROWS_PER_PAGE = 10;

function ListOfficialArticle() {
  const navigate = useNavigate();
  const location = useLocation();

  const [articles, setArticles] = useState([]);
  const [adminName, setAdminName] = useState("Admin");
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับ Popup ยืนยันลบ
  const [deletingId, setDeletingId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  useEffect(() => {
    const storedAdminName = localStorage.getItem("adminName");

    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    loadArticles();
  }, []);

  useEffect(() => {
    if (!location.state?.showToast) {
      return;
    }

    setToast({
      show: true,
      type: location.state.toastType || "success",
      message: location.state.toastMessage || "ดำเนินการเกี่ยวกับบทความสำเร็จ",
    });

    navigate(location.pathname, {
      replace: true,
      state: {},
    });

    const timer = window.setTimeout(() => {
      setToast({
        show: false,
        type: "",
        message: "",
      });
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [location.state, location.pathname, navigate]);

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message,
    });

    window.setTimeout(() => {
      setToast({
        show: false,
        type: "",
        message: "",
      });
    }, 4000);
  };

  const loadArticles = async () => {
    setIsLoading(true);

    try {
      const response = await axios.get(API_URL);

      setArticles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("ไม่สามารถโหลดรายการบทความได้", error);
      setArticles([]);

      showToast("error", "ไม่สามารถโหลดข้อมูลบทความจากระบบได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setCurrentPage(1);
  };

  const handleLogout = () => {
    const confirmed = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");

    if (!confirmed) {
      return;
    }

    localStorage.clear();
    navigate("/login");
  };

  const handleDeleteArticle = async () => {
    if (!selectedArticle || deletingId !== null) {
      return;
    }

    setDeletingId(selectedArticle.articleId);

    try {
      await axios.delete(`${API_URL}/${selectedArticle.articleId}`);

      setArticles((previousArticles) =>
        previousArticles.filter(
          (item) => item.articleId !== selectedArticle.articleId,
        ),
      );

      setShowDeletePopup(false);
      setSelectedArticle(null);

      showToast("success", "ลบบทความออกจากระบบเรียบร้อยแล้ว");
    } catch (error) {
      console.error("ไม่สามารถลบบทความได้", error);

      setShowDeletePopup(false);
      setSelectedArticle(null);

      showToast("error", "ไม่สามารถลบบทความได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  };

  const categories = useMemo(() => {
    return [
      ...new Set(
        articles.map((article) => article.articleCategory).filter(Boolean),
      ),
    ];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return articles
      .filter((article) => {
        const title = article.articleTitle?.toLowerCase() || "";

        const author = article.author?.toLowerCase() || "";

        const matchesSearch =
          !normalizedSearch ||
          title.includes(normalizedSearch) ||
          author.includes(normalizedSearch);

        const matchesCategory =
          !selectedCategory || article.articleCategory === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((first, second) => {
        const firstId = first.articleId || 0;
        const secondId = second.articleId || 0;

        return secondId - firstId;
      });
  }, [articles, searchQuery, selectedCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / ROWS_PER_PAGE),
  );

  const firstRowIndex = (currentPage - 1) * ROWS_PER_PAGE;

  const currentRows = filteredArticles.slice(
    firstRowIndex,
    firstRowIndex + ROWS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const formatPublishDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const renderCoverImage = (article) => {
    if (!article.img) {
      return (
        <div className="article-image-placeholder">
          <FontAwesomeIcon icon={faImage} />
        </div>
      );
    }

    const imageSource =
      article.img.startsWith("http://") ||
      article.img.startsWith("https://") ||
      article.img.startsWith("data:")
        ? article.img
        : `http://localhost:8080/uploads/articles/${article.img}`;

    return (
      <img
        className="article-cover-thumbnail"
        src={imageSource}
        alt={article.articleTitle || "รูปหน้าปกบทความ"}
        onError={(event) => {
          event.currentTarget.style.display = "none";
          event.currentTarget
            .closest(".article-cover-cell")
            ?.classList.add("image-load-failed");
        }}
      />
    );
  };

  return (
    <div className="official-article-page">
      {toast.show && (
        <div className={`article-toast article-toast-${toast.type}`}>
          <div className="article-toast-content">
            <FontAwesomeIcon
              icon={toast.type === "success" ? faCircleCheck : faCircleXmark}
            />

            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="article-toast-close"
            aria-label="ปิดข้อความแจ้งเตือน"
            onClick={() =>
              setToast({
                show: false,
                type: "",
                message: "",
              })
            }
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* Popup ยืนยันลบ */}
      {showDeletePopup && selectedArticle && (
        <div
          className="article-delete-popup-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingId === null) {
              setShowDeletePopup(false);
              setSelectedArticle(null);
            }
          }}
        >
          <div
            className="article-delete-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-article-title"
          >
            <div className="article-delete-popup-icon">
              <FontAwesomeIcon icon={faTrashCan} />
            </div>

            <h3 id="delete-article-title">ยืนยันการลบบทความ</h3>

            <p>คุณต้องการลบบทความ</p>

            <strong className="article-delete-name">
              {selectedArticle.articleTitle}
            </strong>

            <p className="article-delete-warning">
              ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้
            </p>

            <div className="article-delete-popup-actions">
              <button
                type="button"
                className="btn-cancel-delete-article"
                disabled={deletingId !== null}
                onClick={() => {
                  setShowDeletePopup(false);
                  setSelectedArticle(null);
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                className="btn-confirm-delete-article"
                disabled={deletingId !== null}
                onClick={handleDeleteArticle}
              >
                <FontAwesomeIcon
                  icon={deletingId !== null ? faSpinner : faTrashCan}
                  spin={deletingId !== null}
                />

                {deletingId !== null ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <FontAwesomeIcon icon={faShieldHeart} />
            <span>Admin Panel</span>
          </div>

          <div className="user-profile-box">
            <FontAwesomeIcon icon={faCircleUser} />

            <div className="user-info">
              <span className="user-label">ผู้ใช้งานปัจจุบัน:</span>

              <span className="user-name">{adminName}</span>
            </div>
          </div>

          <p className="menu-label">เมนูหลัก</p>

          <Link to="/dashboard" className="menu-item">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/listAccountRequest" className="menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item ">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnessHub" className="menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </Link>
          <Link to="/listOfficialArticle" className="menu-item active">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button
          type="button"
          className="btn-sidebar-logout"
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          ออกจากระบบ
        </button>
      </nav>

      <main className="official-article-main">
        <div className="official-article-container">
          <header className="official-article-header">
            <h2>บัญชีรายชื่อบทความประชาสัมพันธ์ (List Official Article)</h2>

            <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
          </header>

          <div className="official-article-action-bar">
            <Link to="/createOfficialArticle" className="btn-add-article">
              <FontAwesomeIcon icon={faPlus} />
              เพิ่มบทความใหม่
            </Link>
          </div>

          <section className="article-filter-bar">
            <input
              type="text"
              className="article-filter-input"
              placeholder="ค้นหาชื่อบทความหรือผู้เขียน..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            <select
              className="article-filter-select"
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">-- หมวดหมู่ทั้งหมด --</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-article-search"
              onClick={handleSearch}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              ค้นหา
            </button>

            <button
              type="button"
              className="btn-article-reset"
              onClick={handleResetFilter}
            >
              <FontAwesomeIcon icon={faRotate} />
              ล้างค่า
            </button>
          </section>

          <section className="official-article-table-card">
            <table className="official-article-table">
              <thead>
                <tr>
                  {/* เปลี่ยนหัวตารางให้สอดคล้องกับ ลำดับบทความ */}
                  <th className="article-column-id">ลำดับบทความ</th>

                  <th className="article-column-cover">รูปหน้าปก</th>

                  <th className="article-column-title">ชื่อบทความ</th>

                  <th className="article-column-category">หมวดหมู่</th>

                  <th className="article-column-author">ผู้เขียน</th>

                  <th className="article-column-date">วันที่เผยแพร่</th>

                  <th className="article-column-status">สถานะ</th>

                  <th className="article-column-action">การจัดการ</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="official-article-loading">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      กำลังโหลดข้อมูลบทความ...
                    </td>
                  </tr>
                ) : currentRows.length > 0 ? (
                  currentRows.map((article, index) => {
                    // คำนวณอันดับรายการโดยไม่อิง articleId
                    const displayRank = firstRowIndex + index + 1;

                    return (
                      <tr key={article.articleId || index}>
                        <td className="text-center article-id-cell">
                          {displayRank}
                        </td>

                        <td className="article-cover-cell">
                          {renderCoverImage(article)}
                        </td>

                        <td>
                          <strong>
                            {article.articleTitle || "ไม่ระบุชื่อบทความ"}
                          </strong>
                        </td>

                        <td className="text-center">
                          {article.articleCategory || "-"}
                        </td>

                        <td className="text-center">{article.author || "-"}</td>

                        <td className="text-center">
                          {formatPublishDate(article.publishDate)}
                        </td>

                        <td className="text-center">
                          <span className="article-status-active">
                            [ เผยแพร่แล้ว ]
                          </span>
                        </td>

                        <td>
                          <div className="article-action-group">
                            <button
                              type="button"
                              className="btn-edit-article"
                              onClick={() =>
                                navigate(
                                  `/editOfficialArticle/${article.articleId}`,
                                )
                              }
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                              แก้ไข
                            </button>

                            <button
                              type="button"
                              className="btn-delete-article"
                              disabled={deletingId === article.articleId}
                              onClick={() => {
                                setSelectedArticle(article);
                                setShowDeletePopup(true);
                              }}
                            >
                              <FontAwesomeIcon icon={faTrashCan} />
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="official-article-empty">
                      <FontAwesomeIcon icon={faCircleExclamation} />
                      ไม่พบข้อมูลบทความประชาสัมพันธ์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {!isLoading && totalPages > 1 && (
            <div className="official-article-pagination">
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

export default ListOfficialArticle;
