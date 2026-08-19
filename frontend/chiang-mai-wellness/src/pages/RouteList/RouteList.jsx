import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Flag,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Search,
  X,
} from "lucide-react";

import { Link } from "react-router-dom";

import "./RouteList.css";

const API_URL = "http://localhost:8080/api/home/routes";

const ITEMS_PER_PAGE = 9;

const CATEGORY_OPTIONS = [
  {
    id: "C01",
    label: "นวดและสปาเพื่อสุขภาพ",
  },
  {
    id: "C02",
    label: "คลินิกและสถานพยาบาล",
  },
  {
    id: "C03",
    label: "อาหารและเครื่องดื่มเพื่อสุขภาพ",
  },
  {
    id: "C04",
    label: "ที่พักเพื่อสุขภาพ",
  },
  {
    id: "C05",
    label: "แหล่งท่องเที่ยวเชิงสุขภาพ",
  },
];

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parseCategoryIds(value) {
  if (!hasValue(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "object") {
    return [];
  }

  const normalizedValue = String(value).trim();

  try {
    const parsedValue = JSON.parse(normalizedValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue.map(String);
    }
  } catch (error) {
    return [normalizedValue];
  }

  return [normalizedValue];
}

function getSortedDistricts(route) {
  if (!Array.isArray(route?.details)) {
    return [];
  }

  return [...route.details]
    .filter((detail) => detail && detail.district)
    .sort(
      (first, second) =>
        Number(first.orderNumber || 0) - Number(second.orderNumber || 0),
    )
    .map((detail) => ({
      districtId: detail.district?.districtId,
      districtName: detail.district?.districtName,
    }))
    .filter((district) => hasValue(district.districtName));
}

function getDistrictPath(route) {
  const districts = getSortedDistricts(route);

  if (districts.length === 0) {
    return "ยังไม่ได้กำหนดเส้นทางอำเภอ";
  }

  return districts.map((district) => `อ.${district.districtName}`).join(" → ");
}

function getStartDistrict(route) {
  const districts = getSortedDistricts(route);

  return districts[0]?.districtName || "-";
}

function getEndDistrict(route) {
  const districts = getSortedDistricts(route);

  return districts[districts.length - 1]?.districtName || "-";
}

function getCategoryLabels(route) {
  const categoryIds = parseCategoryIds(route?.categoryId || route?.categoryIds);

  return CATEGORY_OPTIONS.filter((category) =>
    categoryIds.includes(category.id),
  );
}

function getErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  return (
    error.response?.data?.message ||
    "ไม่สามารถโหลดรายการเส้นทางได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function RouteList() {
  const [routes, setRoutes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [sortOption, setSortOption] = useState("LATEST");

  const [currentPage, setCurrentPage] = useState(1);

  const [showFilters, setShowFilters] = useState(false);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API_URL, {
        timeout: 30000,
      });

      setRoutes(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setRoutes([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedCategory, sortOption]);

  const filteredRoutes = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const result = routes.filter((route) => {
      const categoryIds = parseCategoryIds(
        route.categoryId || route.categoryIds,
      );

      const districtNames = getSortedDistricts(route)
        .map((district) => district.districtName)
        .join(" ");

      const matchesKeyword =
        !normalizedKeyword ||
        String(route.routeName || "")
          .toLowerCase()
          .includes(normalizedKeyword) ||
        String(route.routeDescription || "")
          .toLowerCase()
          .includes(normalizedKeyword) ||
        districtNames.toLowerCase().includes(normalizedKeyword);

      const matchesCategory =
        selectedCategory === "ALL" || categoryIds.includes(selectedCategory);

      return matchesKeyword && matchesCategory;
    });

    return [...result].sort((first, second) => {
      if (sortOption === "NAME_ASC") {
        return String(first.routeName || "").localeCompare(
          String(second.routeName || ""),
          "th",
        );
      }

      if (sortOption === "HUB_DESC") {
        return Number(second.pinCount || 0) - Number(first.pinCount || 0);
      }

      const firstDate = new Date(
        first.updatedAt || first.createdAt || 0,
      ).getTime();

      const secondDate = new Date(
        second.updatedAt || second.createdAt || 0,
      ).getTime();

      return secondDate - firstDate;
    });
  }, [routes, keyword, selectedCategory, sortOption]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoutes.length / ITEMS_PER_PAGE),
  );

  const paginatedRoutes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredRoutes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRoutes, currentPage]);

  const clearFilters = () => {
    setKeyword("");
    setSelectedCategory("ALL");
    setSortOption("LATEST");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    keyword.trim() !== "" ||
    selectedCategory !== "ALL" ||
    sortOption !== "LATEST";

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);

    window.scrollTo({
      top: 250,
      behavior: "smooth",
    });
  };

  return (
    <main className="route-list-page">
      <header className="route-list-hero">
        <div className="route-list-container">
          <p className="route-list-eyebrow">CHIANG MAI WELLNESS</p>

          <h1>เส้นทางท่องเที่ยวเชิงสุขภาพ</h1>

          <p className="route-list-hero__description">
            ค้นหาเส้นทางสุขภาพในจังหวัดเชียงใหม่ พร้อมดูพื้นที่ที่เดินทางผ่าน
            สถานประกอบการ และจุดบริการที่เกี่ยวข้อง
          </p>
        </div>
      </header>

      <div className="route-list-container route-list-content">
        <section className="route-list-search-section">
          <div className="route-list-search-heading">
            <div>
              <h2>ค้นหาเส้นทาง</h2>

              <p>ค้นหาจากชื่อเส้นทาง อำเภอ หรือรายละเอียดที่คุณสนใจ</p>
            </div>

            <button
              type="button"
              className={`route-list-filter-toggle ${
                showFilters ? "route-list-filter-toggle--active" : ""
              }`}
              onClick={() => setShowFilters((previousValue) => !previousValue)}
            >
              <Filter />
              ตัวกรอง
            </button>
          </div>

          <div className="route-list-search-row">
            <div className="route-list-search-input">
              <Search />

              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาชื่อเส้นทาง ชื่ออำเภอ หรือรายละเอียด..."
                aria-label="ค้นหาเส้นทาง"
              />

              {keyword && (
                <button
                  type="button"
                  aria-label="ล้างคำค้นหา"
                  onClick={() => setKeyword("")}
                >
                  <X />
                </button>
              )}
            </div>
          </div>

          <div
            className={
              showFilters
                ? "route-list-filter-panel route-list-filter-panel--open"
                : "route-list-filter-panel"
            }
          >
            <div className="route-list-filter-group">
              <label htmlFor="route-category-filter">หมวดหมู่</label>

              <select
                id="route-category-filter"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="ALL">ทุกหมวดหมู่</option>

                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="route-list-filter-group">
              <label htmlFor="route-sort-filter">เรียงตาม</label>

              <select
                id="route-sort-filter"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
              >
                <option value="LATEST">อัปเดตล่าสุด</option>

                <option value="NAME_ASC">ชื่อเส้นทาง ก–ฮ</option>

                <option value="HUB_DESC">จำนวนสถานประกอบการมากที่สุด</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="route-list-clear-filter"
                onClick={clearFilters}
              >
                <X />
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </section>

        {loading && (
          <section className="route-list-state">
            <div className="route-list-spinner" />

            <h2>กำลังโหลดเส้นทาง</h2>

            <p>ระบบกำลังเตรียมข้อมูลเส้นทางท่องเที่ยวเชิงสุขภาพ</p>
          </section>
        )}

        {!loading && error && (
          <section className="route-list-state route-list-state--error">
            <CircleAlert />

            <h2>ไม่สามารถโหลดข้อมูลได้</h2>

            <p>{error}</p>

            <button type="button" onClick={loadRoutes}>
              <RefreshCw />
              ลองใหม่
            </button>
          </section>
        )}

        {!loading && !error && (
          <>
            <section className="route-list-summary">
              <div>
                <h2>เส้นทางทั้งหมด</h2>

                <span>
                  เลือกเส้นทางที่เหมาะกับรูปแบบและความสนใจของคุณ
                </span>
              </div>

              <div className="route-list-summary__count">
                <strong>{filteredRoutes.length}</strong>

                <span>เส้นทาง</span>
              </div>
            </section>

            {filteredRoutes.length === 0 ? (
              <section className="route-list-state">
                <Search />

                <h2>ไม่พบเส้นทาง</h2>

                <p>ไม่พบข้อมูลที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก</p>

                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters}>
                    <X />
                    ล้างตัวกรอง
                  </button>
                )}
              </section>
            ) : (
              <>
                <section className="route-list-grid">
                  {paginatedRoutes.map((routeItem) => {
                    const categoryLabels = getCategoryLabels(routeItem);

                    const districts = getSortedDistricts(routeItem);

                    return (
                      <article
                        key={routeItem.routeId}
                        className="route-list-card"
                      >
                        <aside className="route-list-card__rail">
                          <div className="route-list-card__rail-heading">
                            <Navigation />
                            <span>เส้นทาง</span>
                          </div>

                          <div className="route-list-card__rail-route">
                            <div className="route-list-card__rail-stop">
                              <span className="route-list-card__rail-dot route-list-card__rail-dot--start" />

                              <span>เริ่มต้น</span>
                            </div>

                            <span className="route-list-card__rail-line" />

                            <div className="route-list-card__rail-stop">
                              <span className="route-list-card__rail-dot" />

                              <span>ระหว่างทาง</span>
                            </div>

                            <span className="route-list-card__rail-line" />

                            <div className="route-list-card__rail-stop">
                              <span className="route-list-card__rail-finish">
                                <Flag />
                              </span>

                              <span>ปลายทาง</span>
                            </div>
                          </div>

                          <div className="route-list-card__rail-stats">
                            <div>
                              <Building2 />

                              <strong>
                                {Number(routeItem.pinCount || 0)}
                              </strong>

                              <span>จุดแนะนำ</span>
                            </div>

                            <div>
                              <MapPin />

                              <strong>{districts.length}</strong>

                              <span>อำเภอ</span>
                            </div>
                          </div>
                        </aside>

                        <div className="route-list-card__body">
                          <p className="route-list-card__eyebrow">
                            เส้นทางท่องเที่ยวเชิงสุขภาพ
                          </p>

                          <h3>{routeItem.routeName}</h3>

                          {hasValue(routeItem.routeDescription) && (
                            <p className="route-list-card__description">
                              {routeItem.routeDescription}
                            </p>
                          )}

                          <div className="route-list-card__journey">
                            <div className="route-list-card__journey-point">
                              <span>จุดเริ่มต้น</span>

                              <strong>อ.{getStartDistrict(routeItem)}</strong>
                            </div>

                            <div
                              className="route-list-card__journey-line"
                              aria-hidden="true"
                            >
                              <span />
                              <ArrowRight />
                            </div>

                            <div className="route-list-card__journey-point route-list-card__journey-point--end">
                              <span>จุดสิ้นสุด</span>

                              <strong>อ.{getEndDistrict(routeItem)}</strong>
                            </div>
                          </div>

                          <div className="route-list-card__path">
                            <MapPin />

                            <div>
                              <span className="route-list-card__path-label">
                                พื้นที่ที่เดินทางผ่าน
                              </span>

                              <span className="route-list-card__path-value">
                                {getDistrictPath(routeItem)}
                              </span>
                            </div>
                          </div>

                          {categoryLabels.length > 0 && (
                            <div className="route-list-card__categories">
                              {categoryLabels.slice(0, 3).map((category) => (
                                <span key={category.id}>
                                  <span
                                    className={`route-list-card__category-dot route-list-card__category-dot--${category.id.toLowerCase()}`}
                                  />

                                  {category.label}
                                </span>
                              ))}

                              {categoryLabels.length > 3 && (
                                <span className="route-list-card__category-more">
                                  +{categoryLabels.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <Link
                            to={`/wellness-routes/${routeItem.routeId}`}
                            className="route-list-card__link"
                          >
                            <span>ดูรายละเอียดเส้นทาง</span>
                            <ArrowRight />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </section>

                {totalPages > 1 && (
                  <nav
                    className="route-list-pagination"
                    aria-label="หน้ารายการเส้นทาง"
                  >
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => goToPage(currentPage - 1)}
                      aria-label="หน้าก่อนหน้า"
                    >
                      <ChevronLeft />
                    </button>

                    {Array.from(
                      {
                        length: totalPages,
                      },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={
                          currentPage === page
                            ? "route-list-pagination__active"
                            : ""
                        }
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                      aria-label="หน้าถัดไป"
                    >
                      <ChevronRight />
                    </button>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}