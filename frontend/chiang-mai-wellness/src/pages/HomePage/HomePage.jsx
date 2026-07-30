import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
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
      "https://images.unsplash.com/photo-1599708153386-62bf3f035ee9?auto=format&fit=crop&w=1920&q=85",
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
        {HERO_SLIDES.map((slide, index) => (
          <article
            key={slide.id}
            className={`homepage-hero__slide ${
              index === activeSlide ? "homepage-hero__slide--active" : ""
            }`}
            aria-hidden={index !== activeSlide}
          >
            <img src={slide.image} alt="" className="homepage-hero__image" />

            <div className="homepage-hero__overlay" />

            <div className="homepage-container homepage-hero__content">
              <p className="homepage-hero__eyebrow">CHIANG MAI WELLNESS</p>

              <h1>{slide.title}</h1>

              <p className="homepage-hero__description">{slide.description}</p>

              {/* ข้อ 4: เปลี่ยนจาก <Link> เป็น <a> */}
              <a
                href={slide.link}
                className="homepage-primary-button"
                tabIndex={index === activeSlide ? 0 : -1}
              >
                {slide.buttonText}
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="homepage-hero__arrow homepage-hero__arrow--left"
          onClick={() => changeSlide(-1)}
          aria-label="สไลด์ก่อนหน้า"
        >
          <ArrowLeft />
        </button>

        <button
          type="button"
          className="homepage-hero__arrow homepage-hero__arrow--right"
          onClick={() => changeSlide(1)}
          aria-label="สไลด์ถัดไป"
        >
          <ArrowRight />
        </button>

        <div className="homepage-hero__dots">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`homepage-hero__dot ${
                index === activeSlide ? "homepage-hero__dot--active" : ""
              }`}
              onClick={() => setActiveSlide(index)}
              aria-label={`แสดงสไลด์ที่ ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Global Search */}
      <section id="home-search" className="homepage-search">
        <div className="homepage-container">
          <div className="homepage-search__panel">
            <div className="homepage-search__heading">
              <div className="homepage-search__heading-icon">
                <Search />
              </div>

              <div>
                <h2>ค้นหาข้อมูลที่คุณสนใจ</h2>
                <p>ค้นหาสถานประกอบการ เส้นทางท่องเที่ยว และบทความสุขภาพ</p>
              </div>
            </div>

            <form
              className="homepage-search__form"
              onSubmit={handleSearch}
              noValidate
            >
              <select
                value={searchType}
                onChange={(event) => setSearchType(event.target.value)}
                aria-label="เลือกประเภทข้อมูล"
              >
                {SEARCH_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="homepage-search__input">
                <Search aria-hidden="true" />

                <input
                  type="text"
                  value={keyword}
                  maxLength={100}
                  placeholder="พิมพ์ชื่อสถานที่ เส้นทาง หรือบทความ..."
                  onChange={(event) => {
                    setKeyword(event.target.value);

                    if (searchError) {
                      setSearchError("");
                    }
                  }}
                  aria-label="คำค้นหา"
                  aria-invalid={Boolean(searchError)}
                />
              </div>

              <button type="submit">
                <Search />
                ค้นหา
              </button>
            </form>

            {searchError && (
              <p className="homepage-search__error" role="alert">
                {searchError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Recommended Routes */}
      {/* ข้อ 4: เพิ่ม id="recommended-routes" */}
      <section id="recommended-routes" className="homepage-section">
        <div className="homepage-container">
          <div className="homepage-section__heading">
            <div>
              <p className="homepage-section__eyebrow">CURATED JOURNEYS</p>
              <h2>เส้นทางแนะนำ</h2>
              <p>เส้นทางที่คัดสรรเพื่อให้คุณค้นพบประสบการณ์สุขภาพในเชียงใหม่</p>
            </div>

            {/* ข้อ 4: เปลี่ยนลิงก์ดูทั้งหมดเป็น <a> และป้องกันการเปลี่ยนหน้า */}
            <a
              href="#recommended-routes"
              className="homepage-section__link"
              onClick={(event) => event.preventDefault()}
            >
              ดูทั้งหมด
              <ArrowRight />
            </a>
          </div>

          {routesLoading && (
            <div
              className="homepage-card-grid"
              aria-label="กำลังโหลดเส้นทางแนะนำ"
              aria-busy="true"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="homepage-skeleton">
                  <div className="homepage-skeleton__image" />
                  <div className="homepage-skeleton__line homepage-skeleton__line--title" />
                  <div className="homepage-skeleton__line" />
                  <div className="homepage-skeleton__line homepage-skeleton__line--short" />
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
            <div className="homepage-card-grid">
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
                  <article key={routeId} className="homepage-card">
                    <div className="homepage-card__route-cover">
                      <MapPin aria-hidden="true" />
                      <span>{pinCount} จุดแนะนำ</span>
                    </div>

                    <div className="homepage-card__body">
                      <p className="homepage-card__category">WELLNESS ROUTE</p>

                      <h3>{routeName}</h3>

                      <p className="homepage-card__description">
                        {routeDescription}
                      </p>

                      {route.districtsPassed && (
                        <p className="homepage-card__meta">
                          <MapPin />
                          {route.districtsPassed}
                        </p>
                      )}

                      <Link
                       to={`/wellness-routes/${routeId}`}
                        className="homepage-card__link"
                      >
                        ดูรายละเอียดเส้นทาง
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
      {/* ข้อ 4: เพิ่ม id="latest-articles" */}
      <section
        id="latest-articles"
        className="homepage-section homepage-section--articles"
      >
        <div className="homepage-container">
          <div className="homepage-section__heading">
            <div>
              <p className="homepage-section__eyebrow">WELLNESS STORIES</p>
              <h2>บทความสุขภาพล่าสุด</h2>
              <p>
                เรื่องราวและความรู้ที่ช่วยให้ทุกการเดินทางเป็นส่วนหนึ่งของการดูแลตัวเอง
              </p>
            </div>

            {/* ข้อ 4: เปลี่ยนลิงก์ดูทั้งหมดเป็น <a> และป้องกันการเปลี่ยนหน้า */}
            <a
              href="#latest-articles"
              className="homepage-section__link"
              onClick={(event) => event.preventDefault()}
            >
              ดูทั้งหมด
              <ArrowRight />
            </a>
          </div>

          {articlesLoading && (
            <div
              className="homepage-card-grid"
              aria-label="กำลังโหลดบทความล่าสุด"
              aria-busy="true"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="homepage-skeleton">
                  <div className="homepage-skeleton__image" />
                  <div className="homepage-skeleton__line homepage-skeleton__line--title" />
                  <div className="homepage-skeleton__line" />
                  <div className="homepage-skeleton__line homepage-skeleton__line--short" />
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
            <div className="homepage-card-grid">
              {/* ข้อ 3: Map ฟิลด์บทความตาม DTO Backend และใช้ class สำหรับซ่อนรูปภาพเมื่อ error */}
              {articles.map((article) => {
                const articleId = article.articleId;

                const articleTitle = article.articleTitle || "บทความสุขภาพ";

                const articleDescription = removeHtml(
                  article.articleDetail || "",
                );

                const articleImage = article.img || "";

                const publishedDate = article.publishDate;

                return (
                  <article
                    key={articleId}
                    className="homepage-card homepage-article-card"
                  >
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

                    <div className="homepage-card__body">
                      <p className="homepage-card__category">
                        {article.articleCategory || "บทความสุขภาพ"}
                      </p>

                      <h3>{articleTitle}</h3>

                      <p className="homepage-card__description">
                        {articleDescription ||
                          "อ่านเรื่องราวและข้อมูลเพื่อการดูแลสุขภาพที่ดี"}
                      </p>

                      <p className="homepage-card__meta">
                        <CalendarDays />
                        {formatDate(publishedDate)}
                      </p>

                      <a
                        href="#article-detail"
                        className="homepage-card__link"
                        onClick={(event) => event.preventDefault()}
                      >
                        อ่านบทความ
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
