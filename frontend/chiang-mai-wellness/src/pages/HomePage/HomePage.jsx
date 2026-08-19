import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Flag,
  MapPin,
  Navigation,
  Newspaper,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./HomePage.css";

const API_BASE_URL = "http://localhost:8080/api";

// ข้อ 4: แก้ไขลิงก์ใน HERO_SLIDES เป็น Anchor link
const HERO_SLIDES = [
  {
    id: 1,
    title: "ค้นพบเชียงใหม่ในมุมของการพักกายและใจ",
    description:
      "รวมเส้นทางท่องเที่ยวเชิงสุขภาพ สถานประกอบการ และภูมิปัญญาท้องถิ่น เพื่อให้คุณวางแผนการเดินทางได้ง่ายขึ้น",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjGvEU3vRnZVrbUZ0ZcWGjjfgPdSWVQs_Di0fFDj4MNGQgEdbNDt8uzA4&s=10",
    link: "#recommended-routes",
    buttonText: "สำรวจเส้นทางแนะนำ",
  },
  {
    id: 2,
    title: "สัมผัสภูมิปัญญาสุขภาพล้านนา",
    description:
      "ค้นหาสปา สมุนไพร นวดเพื่อสุขภาพ และกิจกรรมที่เหมาะกับจังหวะการพักผ่อนของคุณ",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=85",
    link: "#home-search",
    buttonText: "ค้นหาสถานประกอบการ",
  },
  {
    id: 3,
    title: "เติมความรู้ก่อนออกเดินทาง",
    description:
      "อ่านบทความสุขภาพและเรื่องราวท้องถิ่น เพื่อเตรียมทริปที่ดีต่อทั้งร่างกายและจิตใจ",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1920&q=85",
    link: "#latest-articles",
    buttonText: "อ่านบทความสุขภาพ",
  },
];

const SEARCH_TYPES = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "WELLNESS_HUB", label: "สถานประกอบการ" },
  { value: "ROUTE", label: "เส้นทางท่องเที่ยว" },
  { value: "ARTICLE", label: "บทความสุขภาพ" },
];

// Mapping for route category display (Thai name, color, background)
const ROUTE_CATEGORY_DISPLAY = {
  C01: {
    name: "นวด/สปาเพื่อสุขภาพ",
    color: "#2E7D57",
    background: "#EDF6F0",
  },
  C02: {
    name: "คลินิก/สถานพยาบาล",
    color: "#315F82",
    background: "#EFF4F7",
  },
  C03: {
    name: "อาหารและเครื่องดื่ม",
    color: "#8A6325",
    background: "#F8F3E9",
  },
  C04: {
    name: "ที่พักฟื้นฟูสุขภาพ",
    color: "#695680",
    background: "#F3F0F6",
  },
  C05: {
    name: "สถานที่ท่องเที่ยว",
    color: "#317182",
    background: "#EDF5F6",
  },
  EM01: {
    name: "หน่วยกู้ภัย",
    color: "#896A20",
    background: "#FAF5E8",
  },
  EM02: {
    name: "โรงพยาบาล",
    color: "#A43D46",
    background: "#FAEFF0",
  },
};

function getRouteCategoryDisplay(category) {
  const categoryId = String(category?.categoryId || "")
    .trim()
    .toUpperCase();

  const display = ROUTE_CATEGORY_DISPLAY[categoryId];

  if (display) {
    return {
      ...display,
      categoryId,
    };
  }

  return {
    categoryId,
    name: category?.categoryName || "หมวดหมู่อื่น",
    color: "#56635B",
    background: "#F1F3F1",
  };
}

function getErrorMessage(error, fallbackMessage) {
  return error.response?.data?.message || fallbackMessage;
}

function formatDate(value) {
  if (!value) {
    return "ไม่ระบุวันที่";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันที่";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function removeHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function HomePage() {
  const navigate = useNavigate();

  const [activeSlide, setActiveSlide] = useState(0);
  const [pauseSlider, setPauseSlider] = useState(false);

  const [searchType, setSearchType] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [searchError, setSearchError] = useState("");

  const [routes, setRoutes] = useState([]);
  const [articles, setArticles] = useState([]);

  const [routesLoading, setRoutesLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);

  const [routesError, setRoutesError] = useState("");
  const [articlesError, setArticlesError] = useState("");

  // ข้อ 1: แก้ API เส้นทางแนะนำ ให้ดึงและ slice 6 รายการ
  const loadRoutes = useCallback(async (signal) => {
    setRoutesLoading(true);
    setRoutesError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/home/recommended-routes`,
        {
          signal,
          timeout: 10000,
        },
      );

      const routeList = Array.isArray(response.data)
        ? response.data.slice(0, 6)
        : [];

      setRoutes(routeList);
    } catch (error) {
      if (axios.isCancel(error) || signal?.aborted) {
        return;
      }

      console.error("โหลดเส้นทางแนะนำไม่สำเร็จ", error);

      setRoutes([]);

      setRoutesError(
        getErrorMessage(
          error,
          "ไม่สามารถโหลดเส้นทางแนะนำได้ กรุณาลองใหม่อีกครั้ง",
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setRoutesLoading(false);
      }
    }
  }, []);

  // ข้อ 2: แก้ API บทความล่าสุด ให้ดึงและ slice 6 รายการ
  const loadArticles = useCallback(async (signal) => {
    setArticlesLoading(true);
    setArticlesError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/home/latest-articles`, {
        signal,
        timeout: 10000,
      });

      const articleList = Array.isArray(response.data)
        ? response.data.slice(0, 6)
        : [];

      setArticles(articleList);
    } catch (error) {
      if (axios.isCancel(error) || signal?.aborted) {
        return;
      }

      console.error("โหลดบทความล่าสุดไม่สำเร็จ", error);

      setArticles([]);

      setArticlesError(
        getErrorMessage(
          error,
          "ไม่สามารถโหลดบทความล่าสุดได้ กรุณาลองใหม่อีกครั้ง",
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setArticlesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadRoutes(controller.signal);
    loadArticles(controller.signal);

    return () => controller.abort();
  }, [loadRoutes, loadArticles]);

  useEffect(() => {
    if (pauseSlider) {
      return undefined;
    }

    const sliderTimer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % HERO_SLIDES.length);
    }, 6000);

    return () => window.clearInterval(sliderTimer);
  }, [pauseSlider]);

  const changeSlide = (direction) => {
    setActiveSlide(
      (currentSlide) =>
        (currentSlide + direction + HERO_SLIDES.length) % HERO_SLIDES.length,
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      setSearchError("กรุณากรอกคำค้นหาก่อนกดค้นหา");
      return;
    }

    if (normalizedKeyword.length > 100) {
      setSearchError("คำค้นหาต้องไม่เกิน 100 ตัวอักษร");
      return;
    }

    setSearchError("");

    navigate(
      `/search?q=${encodeURIComponent(
        normalizedKeyword,
      )}&type=${encodeURIComponent(searchType)}`,
    );
  };

  return (
    <div className="homepage">
      {/* Hero Slider */}
      <section
        className="homepage-hero"
        aria-label="แนะนำการท่องเที่ยวเชิงสุขภาพ"
        onMouseEnter={() => setPauseSlider(true)}
        onMouseLeave={() => setPauseSlider(false)}
      >
        <div className="homepage-container homepage-hero__layout">
          <div className="homepage-hero__content">
            <p className="homepage-hero__eyebrow">CHIANG MAI WELLNESS</p>

            {HERO_SLIDES.map((slide, index) => (
              <article
                key={slide.id}
                className={`homepage-hero__copy ${
                  index === activeSlide ? "homepage-hero__copy--active" : ""
                }`}
                aria-hidden={index !== activeSlide}
              >
                <h1>{slide.title}</h1>

                <p className="homepage-hero__description">
                  {slide.description}
                </p>

                <a
                  href={slide.link}
                  className="homepage-primary-button"
                  tabIndex={index === activeSlide ? 0 : -1}
                >
                  <span>{slide.buttonText}</span>
                  <ArrowRight aria-hidden="true" />
                </a>
              </article>
            ))}

            <div className="homepage-hero__controls">
              <button
                type="button"
                className="homepage-hero__arrow"
                onClick={() => changeSlide(-1)}
                aria-label="สไลด์ก่อนหน้า"
              >
                <ArrowLeft />
              </button>

              <div className="homepage-hero__dots" aria-label="เลือกสไลด์">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`homepage-hero__dot ${
                      index === activeSlide ? "homepage-hero__dot--active" : ""
                    }`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`แสดงสไลด์ที่ ${index + 1}`}
                    aria-current={index === activeSlide ? "true" : undefined}
                  />
                ))}
              </div>

              <button
                type="button"
                className="homepage-hero__arrow"
                onClick={() => changeSlide(1)}
                aria-label="สไลด์ถัดไป"
              >
                <ArrowRight />
              </button>
            </div>
          </div>

          <div className="homepage-hero__visual">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.id}
                className={`homepage-hero__image-frame ${
                  index === activeSlide
                    ? "homepage-hero__image-frame--active"
                    : ""
                }`}
                aria-hidden={index !== activeSlide}
              >
                <img
                  src={slide.image}
                  alt=""
                  className="homepage-hero__image"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Search */}
      <section id="home-search" className="homepage-search">
        <div className="homepage-container">
          <div className="homepage-search__heading">
            <div>
              <h2>ค้นหาสิ่งที่คุณสนใจ</h2>
              <p>
                ค้นหาสถานประกอบการ เส้นทางท่องเที่ยว
                หรือบทความสุขภาพได้จากที่เดียว
              </p>
            </div>
          </div>

          <form
            className="homepage-search__form"
            onSubmit={handleSearch}
            noValidate
          >
            <div className="homepage-search__field homepage-search__field--type">
              <label htmlFor="homepage-search-type">ประเภทข้อมูล</label>

              <select
                id="homepage-search-type"
                value={searchType}
                onChange={(event) => setSearchType(event.target.value)}
              >
                {SEARCH_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="homepage-search__field homepage-search__field--keyword">
              <label htmlFor="homepage-search-keyword">คำค้นหา</label>

              <div className="homepage-search__input">
                <Search aria-hidden="true" />

                <input
                  id="homepage-search-keyword"
                  type="text"
                  value={keyword}
                  maxLength={100}
                  placeholder="ชื่อสถานที่ เส้นทาง หรือบทความ..."
                  onChange={(event) => {
                    setKeyword(event.target.value);

                    if (searchError) {
                      setSearchError("");
                    }
                  }}
                  aria-invalid={Boolean(searchError)}
                  aria-describedby={
                    searchError ? "homepage-search-error" : undefined
                  }
                />
              </div>
            </div>

            <button type="submit" className="homepage-search__button">
              <Search aria-hidden="true" />
              <span>ค้นหา</span>
            </button>
          </form>

          {searchError && (
            <p
              id="homepage-search-error"
              className="homepage-search__error"
              role="alert"
            >
              {searchError}
            </p>
          )}
        </div>
      </section>

      {/* Recommended Routes */}
      <section
        id="recommended-routes"
        className="homepage-section homepage-section--routes"
      >
        <div className="homepage-container">
          <div className="homepage-section__heading">
            <div>
              <h2>เส้นทางแนะนำ</h2>

              <p>
                เลือกเส้นทางท่องเที่ยวเชิงสุขภาพที่เหมาะกับรูปแบบ
                และความสนใจของคุณ
              </p>
            </div>

            <a
              href="#recommended-routes"
              className="homepage-section__link"
              onClick={(event) => event.preventDefault()}
            >
              <span>ดูเส้นทางทั้งหมด</span>
              <ArrowRight />
            </a>
          </div>

          {routesLoading && (
            <div
              className="homepage-route-grid"
              aria-label="กำลังโหลดเส้นทางแนะนำ"
              aria-busy="true"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="homepage-route-skeleton">
                  <div className="homepage-route-skeleton__rail" />

                  <div className="homepage-skeleton__content">
                    <div className="homepage-skeleton__line homepage-skeleton__line--label" />
                    <div className="homepage-skeleton__line homepage-skeleton__line--title" />
                    <div className="homepage-skeleton__line" />
                    <div className="homepage-skeleton__line homepage-skeleton__line--short" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!routesLoading && routesError && (
            <div className="homepage-state homepage-state--error" role="alert">
              <p>{routesError}</p>

              <button type="button" onClick={() => loadRoutes()}>
                <RefreshCw />
                ลองใหม่
              </button>
            </div>
          )}

          {!routesLoading && !routesError && routes.length === 0 && (
            <div className="homepage-state">
              <MapPin className="homepage-state__icon" />

              <h3>ยังไม่มีเส้นทางแนะนำ</h3>

              <p>เมื่อผู้ดูแลเพิ่มเส้นทางแล้ว ข้อมูลจะแสดงในส่วนนี้</p>
            </div>
          )}

          {!routesLoading && !routesError && routes.length > 0 && (
            <div className="homepage-route-grid">
              {routes.map((route) => {
                const routeId = route.routeId || route.id;

                const routeName =
                  route.routeName || route.name || "เส้นทางสุขภาพ";

                const routeDescription =
                  route.routeDescription ||
                  route.description ||
                  "ค้นพบประสบการณ์การท่องเที่ยวเชิงสุขภาพในเชียงใหม่";

                const pinCount =
                  route.pinCount ||
                  route.wellnessHubCount ||
                  route.totalPins ||
                  0;

                return (
                  <article key={routeId} className="homepage-route-card">
                    <aside
                      className="homepage-route-card__rail"
                      aria-label={`เส้นทางนี้มี ${pinCount} จุดแนะนำ`}
                    >
                      <div className="homepage-route-card__rail-heading">
                        <Navigation aria-hidden="true" />
                        <span>เส้นทาง</span>
                      </div>

                      <div
                        className="homepage-route-card__rail-path"
                        aria-hidden="true"
                      >
                        <div className="homepage-route-card__rail-stop">
                          <span className="homepage-route-card__rail-dot homepage-route-card__rail-dot--start" />
                          <span>เริ่มต้น</span>
                        </div>

                        <span className="homepage-route-card__rail-line" />

                        <div className="homepage-route-card__rail-stop">
                          <span className="homepage-route-card__rail-dot" />
                          <span>จุดแวะ</span>
                        </div>

                        <span className="homepage-route-card__rail-line" />

                        <div className="homepage-route-card__rail-stop">
                          <span className="homepage-route-card__rail-finish">
                            <Flag />
                          </span>
                          <span>ปลายทาง</span>
                        </div>
                      </div>

                      <div className="homepage-route-card__rail-count">
                        <strong>{pinCount}</strong>
                        <span>จุดแนะนำ</span>
                      </div>
                    </aside>

                    <div className="homepage-route-card__content">
                      <p className="homepage-route-card__label">
                        เส้นทางท่องเที่ยวเชิงสุขภาพ
                      </p>

                      <h3>{routeName}</h3>

                      <p className="homepage-route-card__description">
                        {routeDescription}
                      </p>

                      {Array.isArray(route.categories) &&
                        route.categories.length > 0 && (
                          <div
                            className="homepage-card__categories"
                            aria-label="หมวดหมู่ของเส้นทาง"
                          >
                            {route.categories.map((category, index) => {
                              const categoryDisplay =
                                getRouteCategoryDisplay(category);

                              return (
                                <span
                                  key={`${
                                    category.categoryId || "category"
                                  }-${index}`}
                                  className="homepage-card__category-chip"
                                  style={{
                                    color: categoryDisplay.color,
                                    backgroundColor: categoryDisplay.background,
                                    borderColor: categoryDisplay.color,
                                  }}
                                >
                                  <span
                                    className="homepage-card__category-dot"
                                    style={{
                                      backgroundColor: categoryDisplay.color,
                                    }}
                                  />

                                  {categoryDisplay.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                      {route.districtsPassed && (
                        <div className="homepage-route-card__location">
                          <MapPin aria-hidden="true" />

                          <div>
                            <span className="homepage-route-card__location-label">
                              พื้นที่ที่เดินทางผ่าน
                            </span>

                            <span className="homepage-route-card__location-value">
                              {route.districtsPassed}
                            </span>
                          </div>
                        </div>
                      )}

                      <Link
                        to={`/wellness-routes/${routeId}`}
                        className="homepage-route-card__link"
                      >
                        <span>ดูรายละเอียดเส้นทาง</span>
                        <ArrowRight />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Latest Articles */}
      <section
        id="latest-articles"
        className="homepage-section homepage-section--articles"
      >
        <div className="homepage-container">
          <div className="homepage-section__heading">
            <div>
              <h2>บทความสุขภาพล่าสุด</h2>

              <p>
                อ่านเรื่องราว ความรู้ และข้อมูลที่ช่วยให้คุณ
                เตรียมตัวก่อนออกเดินทางได้ดียิ่งขึ้น
              </p>
            </div>

            <a
              href="#latest-articles"
              className="homepage-section__link"
              onClick={(event) => event.preventDefault()}
            >
              <span>ดูบทความทั้งหมด</span>
              <ArrowRight />
            </a>
          </div>

          {articlesLoading && (
            <div
              className="homepage-article-grid"
              aria-label="กำลังโหลดบทความล่าสุด"
              aria-busy="true"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="homepage-article-skeleton">
                  <div className="homepage-article-skeleton__image" />

                  <div className="homepage-skeleton__content">
                    <div className="homepage-skeleton__line homepage-skeleton__line--label" />
                    <div className="homepage-skeleton__line homepage-skeleton__line--title" />
                    <div className="homepage-skeleton__line" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!articlesLoading && articlesError && (
            <div className="homepage-state homepage-state--error" role="alert">
              <p>{articlesError}</p>

              <button type="button" onClick={() => loadArticles()}>
                <RefreshCw />
                ลองใหม่
              </button>
            </div>
          )}

          {!articlesLoading && !articlesError && articles.length === 0 && (
            <div className="homepage-state">
              <Newspaper className="homepage-state__icon" />

              <h3>ยังไม่มีบทความสุขภาพ</h3>

              <p>เมื่อมีบทความเผยแพร่แล้ว ข้อมูลจะแสดงในส่วนนี้</p>
            </div>
          )}

          {!articlesLoading && !articlesError && articles.length > 0 && (
            <div className="homepage-article-grid">
              {articles.map((article) => {
                const articleId = article.articleId;

                const articleTitle = article.articleTitle || "บทความสุขภาพ";

                const articleDescription = removeHtml(
                  article.articleDetail || "",
                );

                const articleImage = article.img || "";

                const publishedDate = article.publishDate;

                return (
                  <article key={articleId} className="homepage-article-card">
                    <div className="homepage-article-card__image">
                      {articleImage ? (
                        <img
                          src={articleImage}
                          alt={articleTitle}
                          onError={(event) => {
                            event.currentTarget.classList.add(
                              "homepage-article-card__image-hidden",
                            );
                          }}
                        />
                      ) : (
                        <Newspaper aria-hidden="true" />
                      )}
                    </div>

                    <div className="homepage-article-card__body">
                      <div className="homepage-article-card__meta-row">
                        <p className="homepage-article-card__category">
                          {article.articleCategory || "บทความสุขภาพ"}
                        </p>

                        <p className="homepage-article-card__date">
                          <CalendarDays aria-hidden="true" />
                          {formatDate(publishedDate)}
                        </p>
                      </div>

                      <h3>{articleTitle}</h3>

                      <p className="homepage-article-card__description">
                        {articleDescription ||
                          "อ่านเรื่องราวและข้อมูลเพื่อการดูแลสุขภาพที่ดี"}
                      </p>

                      <a
                        href="#article-detail"
                        className="homepage-article-card__link"
                        onClick={(event) => event.preventDefault()}
                      >
                        <span>อ่านบทความ</span>
                        <ArrowRight />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
