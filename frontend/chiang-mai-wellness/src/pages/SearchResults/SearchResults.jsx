import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CircleAlert,
  MapPin,
  Newspaper,
  RefreshCw,
  Route,
  Search,
} from "lucide-react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

import "./SearchResults.css";

const API_BASE_URL = "http://localhost:8080/api";

const SEARCH_TYPES = [
  {
    value: "ALL",
    label: "ทั้งหมด",
  },
  {
    value: "WELLNESS_HUB",
    label: "สถานประกอบการ",
  },
  {
    value: "ROUTE",
    label: "เส้นทางท่องเที่ยว",
  },
  {
    value: "ARTICLE",
    label: "บทความสุขภาพ",
  },
];

const ALLOWED_TYPES = SEARCH_TYPES.map((type) => type.value);

function removeHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    "ไม่สามารถค้นหาข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function SearchResults() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const queryKeyword = searchParams.get("q") || "";

  const queryType = searchParams.get("type") || "ALL";

  const normalizedType = ALLOWED_TYPES.includes(queryType.toUpperCase())
    ? queryType.toUpperCase()
    : "ALL";

  const [keyword, setKeyword] = useState(queryKeyword);

  const [searchType, setSearchType] = useState(normalizedType);

  const [searchData, setSearchData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [validationError, setValidationError] = useState("");

  const loadSearchResults = useCallback(async () => {
    const normalizedKeyword = queryKeyword.trim();

    if (!normalizedKeyword) {
      setSearchData(null);
      setError("กรุณากรอกคำค้นหา");
      setLoading(false);
      return;
    }

    if (normalizedKeyword.length > 100) {
      setSearchData(null);
      setError("คำค้นหาต้องไม่เกิน 100 ตัวอักษร");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/home/search`, {
        params: {
          q: normalizedKeyword,
          type: normalizedType,
        },
        timeout: 30000,
      });

      setSearchData(response.data || null);
    } catch (requestError) {
      setSearchData(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [queryKeyword, normalizedType]);

  useEffect(() => {
    setKeyword(queryKeyword);
    setSearchType(normalizedType);
    setValidationError("");
    loadSearchResults();
  }, [queryKeyword, normalizedType, loadSearchResults]);

  const routes = useMemo(
    () => (Array.isArray(searchData?.routes) ? searchData.routes : []),
    [searchData],
  );

  const wellnessHubs = useMemo(
    () =>
      Array.isArray(searchData?.wellnessHubs) ? searchData.wellnessHubs : [],
    [searchData],
  );

  const articles = useMemo(
    () => (Array.isArray(searchData?.articles) ? searchData.articles : []),
    [searchData],
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      setValidationError("กรุณากรอกคำค้นหาก่อนกดค้นหา");
      return;
    }

    if (normalizedKeyword.length > 100) {
      setValidationError("คำค้นหาต้องไม่เกิน 100 ตัวอักษร");
      return;
    }

    setValidationError("");

    navigate(
      `/search?q=${encodeURIComponent(
        normalizedKeyword,
      )}&type=${encodeURIComponent(searchType)}`,
    );
  };

  if (loading) {
    return (
      <main className="search-results-page">
        <div className="search-results-container">
          <section className="search-results-state">
            <div className="search-results-spinner" />

            <h1>กำลังค้นหาข้อมูล</h1>

            <p>ระบบกำลังค้นหาเส้นทาง สถานประกอบการ และบทความที่เกี่ยวข้อง</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="search-results-page">
      <header className="search-results-hero">
        <div className="search-results-container">
          <Link to="/" className="search-results-back">
            <ArrowLeft />
            กลับหน้าแรก
          </Link>

          <p className="search-results-eyebrow">SEARCH WELLNESS</p>

          <h1>ผลการค้นหา</h1>

          {queryKeyword && (
            <p className="search-results-hero__description">
              ผลลัพธ์ที่เกี่ยวข้องกับ
              <strong>“{queryKeyword}”</strong>
            </p>
          )}

          <form
            className="search-results-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <select
              value={searchType}
              onChange={(event) => setSearchType(event.target.value)}
              aria-label="ประเภทการค้นหา"
            >
              {SEARCH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <div className="search-results-form__input">
              <Search />

              <input
                type="text"
                value={keyword}
                maxLength={100}
                placeholder="ค้นหาเส้นทาง สถานประกอบการ หรือบทความ..."
                onChange={(event) => {
                  setKeyword(event.target.value);

                  if (validationError) {
                    setValidationError("");
                  }
                }}
                aria-invalid={Boolean(validationError)}
              />
            </div>

            <button type="submit">
              <Search />
              ค้นหา
            </button>
          </form>

          {validationError && (
            <p className="search-results-validation" role="alert">
              {validationError}
            </p>
          )}
        </div>
      </header>

      <div className="search-results-container search-results-content">
        {error && (
          <section className="search-results-state search-results-state--error">
            <CircleAlert />

            <h2>ไม่สามารถค้นหาข้อมูลได้</h2>

            <p>{error}</p>

            <button type="button" onClick={loadSearchResults}>
              <RefreshCw />
              ลองใหม่
            </button>
          </section>
        )}

        {!error && searchData && (
          <>
            <section className="search-results-summary">
              <article>
                <strong>{searchData.totalResults || 0}</strong>
                <span>ผลลัพธ์ทั้งหมด</span>
              </article>

              <article>
                <Route />
                <div>
                  <strong>{searchData.routeCount || 0}</strong>
                  <span>เส้นทาง</span>
                </div>
              </article>

              <article>
                <Building2 />
                <div>
                  <strong>{searchData.wellnessHubCount || 0}</strong>
                  <span>สถานประกอบการ</span>
                </div>
              </article>

              <article>
                <Newspaper />
                <div>
                  <strong>{searchData.articleCount || 0}</strong>
                  <span>บทความ</span>
                </div>
              </article>
            </section>

            {searchData.totalResults === 0 ? (
              <section className="search-results-state">
                <Search />

                <h2>ไม่พบข้อมูลที่ค้นหา</h2>

                <p>ลองใช้คำค้นที่สั้นลง หรือตรวจสอบการสะกดอีกครั้ง</p>
              </section>
            ) : (
              <>
                {routes.length > 0 && (
                  <section className="search-results-section">
                    <div className="search-results-heading">
                      <div>
                        <p>WELLNESS ROUTES</p>
                        <h2>เส้นทางท่องเที่ยว</h2>
                      </div>

                      <span>{routes.length} รายการ</span>
                    </div>

                    <div className="search-results-grid">
                      {routes.map((route) => (
                        <article
                          key={route.routeId}
                          className="search-result-card"
                        >
                          <div className="search-result-card__cover search-result-card__cover--route">
                            <Route />

                            <span>{route.pinCount || 0} จุดแนะนำ</span>
                          </div>

                          <div className="search-result-card__body">
                            <p className="search-result-card__category">
                              WELLNESS ROUTE
                            </p>

                            <h3>{route.routeName}</h3>

                            {route.routeDescription && (
                              <p className="search-result-card__description">
                                {route.routeDescription}
                              </p>
                            )}

                            {route.districtsPassed && (
                              <p className="search-result-card__meta">
                                <MapPin />
                                {route.districtsPassed}
                              </p>
                            )}

                            <Link
                              to={`/wellness-routes/${route.routeId}`}
                              className="search-result-card__link"
                            >
                              ดูรายละเอียดเส้นทาง
                              <ArrowRight />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {wellnessHubs.length > 0 && (
                  <section className="search-results-section">
                    <div className="search-results-heading">
                      <div>
                        <p>WELLNESS PLACES</p>
                        <h2>สถานประกอบการ</h2>
                      </div>

                      <span>{wellnessHubs.length} รายการ</span>
                    </div>

                    <div className="search-results-grid">
                      {wellnessHubs.map((hub) => (
                        <article
                          key={hub.licenseId}
                          className="search-result-card"
                        >
                          <div className="search-result-card__cover search-result-card__cover--hub">
                            <Building2 />
                          </div>

                          <div className="search-result-card__body">
                            {hub.categoryName && (
                              <p className="search-result-card__category">
                                {hub.categoryName}
                              </p>
                            )}

                            <h3>{hub.wellnessHubName}</h3>

                            {hub.wellnessHubDescription && (
                              <p className="search-result-card__description">
                                {hub.wellnessHubDescription}
                              </p>
                            )}

                            {hub.districtName && (
                              <p className="search-result-card__meta">
                                <MapPin />
                                อ.
                                {hub.districtName}
                              </p>
                            )}

                            <Link
                              to={`/wellness-hubs/${hub.licenseId}`}
                              className="search-result-card__link"
                            >
                              ดูรายละเอียดสถานประกอบการ
                              <ArrowRight />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {articles.length > 0 && (
                  <section className="search-results-section">
                    <div className="search-results-heading">
                      <div>
                        <p>WELLNESS STORIES</p>
                        <h2>บทความสุขภาพ</h2>
                      </div>

                      <span>{articles.length} รายการ</span>
                    </div>

                    <div className="search-results-grid">
                      {articles.map((article) => {
                        const articleDescription = removeHtml(
                          article.articleDetail || "",
                        );

                        const publishedDate = formatDate(article.publishDate);

                        return (
                          <article
                            key={article.articleId}
                            className="search-result-card"
                          >
                            <div className="search-result-card__cover search-result-card__cover--article">
                              {article.img ? (
                                <img
                                  src={article.img}
                                  alt={article.articleTitle}
                                  onError={(event) => {
                                    event.currentTarget.classList.add(
                                      "search-result-card__image--hidden",
                                    );
                                  }}
                                />
                              ) : (
                                <Newspaper />
                              )}
                            </div>

                            <div className="search-result-card__body">
                              <p className="search-result-card__category">
                                {article.articleCategory || "บทความสุขภาพ"}
                              </p>

                              <h3>{article.articleTitle}</h3>

                              {articleDescription && (
                                <p className="search-result-card__description">
                                  {articleDescription}
                                </p>
                              )}

                              {publishedDate && (
                                <p className="search-result-card__meta">
                                  <CalendarDays />
                                  {publishedDate}
                                </p>
                              )}

                              <Link
                                to={`/articles/${article.articleId}`}
                                className="search-result-card__link"
                              >
                                อ่านบทความ
                                <ArrowRight />
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
