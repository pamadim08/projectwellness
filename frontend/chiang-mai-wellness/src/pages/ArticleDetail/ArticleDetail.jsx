import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Newspaper,
  RefreshCw,
  User,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import LoadingState from "../../Components/LoadingState/LoadingState";
import "./ArticleDetail.css";

const API_URL = "http://localhost:8080/api/articles";

const ALLOWED_ARTICLE_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "DEL",
  "H2",
  "H3",
  "H4",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "A",
  "HR",
  "SPAN",
  "DIV",
  "SUP",
  "SUB",
  "CODE",
  "IMG",
  "FIGURE",
  "FIGCAPTION",
]);

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeImageSource(value) {
  if (!hasValue(value)) {
    return "";
  }

  let imageValue = value;

  if (typeof imageValue === "string") {
    const trimmedValue = imageValue.trim();

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        imageValue = parsedValue[0] || "";
      } else {
        imageValue = trimmedValue;
      }
    } catch {
      imageValue = trimmedValue;
    }
  }

  if (Array.isArray(imageValue)) {
    imageValue = imageValue[0] || "";
  }

  if (!hasValue(imageValue)) {
    return "";
  }

  const normalizedValue = String(imageValue).trim();

  if (
    normalizedValue.startsWith("data:image/") ||
    normalizedValue.startsWith("http://") ||
    normalizedValue.startsWith("https://") ||
    normalizedValue.startsWith("blob:")
  ) {
    return normalizedValue;
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(normalizedValue)) {
    return `data:image/jpeg;base64,${normalizedValue}`;
  }

  return normalizedValue;
}

function formatDate(value) {
  if (!hasValue(value)) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getArticleCategory(article) {
  return article?.articleCategory || "บทความสุขภาพ";
}

function sanitizeInlineStyle(styleValue = "") {
  const safeStyles = [];

  String(styleValue)
    .split(";")
    .forEach((styleRule) => {
      const [rawProperty, ...rawValueParts] = styleRule.split(":");

      if (!rawProperty || rawValueParts.length === 0) {
        return;
      }

      const property = rawProperty.trim().toLowerCase();
      const value = rawValueParts.join(":").trim().toLowerCase();

      if (
        property === "font-weight" &&
        /^(bold|bolder|[5-9]00)$/.test(value)
      ) {
        safeStyles.push(`font-weight: ${value}`);
      }

      if (
        property === "font-style" &&
        /^(italic|oblique)$/.test(value)
      ) {
        safeStyles.push(`font-style: ${value}`);
      }

      if (
        property === "text-decoration" &&
        /^(underline|line-through)$/.test(value)
      ) {
        safeStyles.push(`text-decoration: ${value}`);
      }

      if (
        property === "text-align" &&
        /^(left|right|center|justify)$/.test(value)
      ) {
        safeStyles.push(`text-align: ${value}`);
      }
    });

  return safeStyles.join("; ");
}

function sanitizeArticleNode(node) {
  Array.from(node.childNodes).forEach((childNode) => {
    if (childNode.nodeType === Node.COMMENT_NODE) {
      childNode.remove();
      return;
    }

    if (childNode.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tagName = childNode.tagName;

    if (
      tagName === "SCRIPT" ||
      tagName === "STYLE" ||
      tagName === "IFRAME" ||
      tagName === "OBJECT" ||
      tagName === "EMBED" ||
      tagName === "FORM" ||
      tagName === "INPUT" ||
      tagName === "BUTTON"
    ) {
      childNode.remove();
      return;
    }

    if (!ALLOWED_ARTICLE_TAGS.has(tagName)) {
      const parentNode = childNode.parentNode;

      while (childNode.firstChild) {
        parentNode.insertBefore(childNode.firstChild, childNode);
      }

      childNode.remove();
      return;
    }

    Array.from(childNode.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName === "style") {
        const safeStyle = sanitizeInlineStyle(attribute.value);

        if (safeStyle) {
          childNode.setAttribute("style", safeStyle);
        } else {
          childNode.removeAttribute("style");
        }

        return;
      }

      if (tagName === "A" && attributeName === "href") {
        const href = String(attribute.value).trim();

        const isSafeHref =
          href.startsWith("http://") ||
          href.startsWith("https://") ||
          href.startsWith("/") ||
          href.startsWith("#") ||
          href.startsWith("mailto:");

        if (!isSafeHref) {
          childNode.removeAttribute("href");
        }

        return;
      }

      if (attributeName.startsWith("on") || attributeName === "srcdoc") {
        childNode.removeAttribute(attribute.name);
      }
    });

    sanitizeArticleNode(childNode);
  });
}

function formatArticleContent(rawContent = "") {
  if (!hasValue(rawContent)) {
    return "";
  }

  let text = String(rawContent);

  // 🌟 แปลงสัญลักษณ์พิเศษและ Newline ต่างๆ (เช่น \r\n, \n, /n, \\n, ↵)
  text = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\/n/gi, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return text.replace(/\n/g, "<br />");
  }

  try {
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(text);

    // หากเป็นข้อความล้วน ให้แปลง \n คู่เป็นย่อหน้า และ \n เดี่ยวเป็น <br />
    if (!hasHtmlTags) {
      const paragraphs = text.split(/\n\s*\n/);
      text = paragraphs
        .map((p) => {
          const cleanP = p.trim().replace(/\n/g, "<br />");
          return cleanP ? `<p>${cleanP}</p>` : "";
        })
        .join("");
    } else {
      // ถ้ามี HTML Tags อยู่แล้ว ให้แปลง \n ที่อยู่นอกแท็กเป็น <br />
      text = text.replace(/\n/g, "<br />");
    }

    const parser = new DOMParser();
    const documentObject = parser.parseFromString(
      `<!DOCTYPE html><html><body>${text}</body></html>`,
      "text/html",
    );

    const bodyElement = documentObject.body;
    sanitizeArticleNode(bodyElement);

    return bodyElement.innerHTML;
  } catch {
    return text.replace(/\n/g, "<br />");
  }
}

function getErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  return (
    error.response?.data?.message ||
    error.response?.data ||
    "ไม่สามารถเปิดบทความได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function ArticleDetail() {
  const { articleId } = useParams();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  const loadArticle = useCallback(async () => {
    if (!hasValue(articleId)) {
      setArticle(null);
      setError("ไม่พบรหัสบทความ");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setImageError(false);

    try {
      const response = await axios.get(`${API_URL}/${articleId}`, {
        timeout: 30000,
      });

      setArticle(response.data || null);
    } catch (requestError) {
      setArticle(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [articleId]);

  const imageSource = useMemo(() => {
    if (!article) {
      return "";
    }

    return normalizeImageSource(article.img || article.articleImages);
  }, [article]);

  const publishDate = useMemo(() => {
    return formatDate(article?.publishDate);
  }, [article]);

  const articleContent = useMemo(() => {
    return formatArticleContent(article?.articleDetail || "");
  }, [article]);

  if (loading) {
    return (
      <LoadingState
        fullPage
        title="กำลังโหลดเนื้อหาบทความ"
        message="ระบบกำลังเตรียมข้อมูลและภาพประกอบ กรุณารอสักครู่"
      />
    );
  }

  if (error || !article) {
    return (
      <main className="article-detail-page">
        <div className="article-detail-container article-detail-error-wrap">
          <Link to="/articles" className="article-detail-back-pill">
            <ArrowLeft size={16} />
            <span>กลับไปหน้ารวมบทความ</span>
          </Link>

          <section
            className="article-detail-state article-detail-state--error"
            role="alert"
          >
            <CircleAlert size={48} className="article-detail-state__icon" />
            <h1>ไม่สามารถเปิดบทความได้</h1>
            <p>{error || "ไม่พบข้อมูลบทความที่ต้องการ"}</p>

            <div className="article-detail-state__actions">
              <button
                type="button"
                className="article-detail-btn-retry"
                onClick={loadArticle}
              >
                <RefreshCw size={16} />
                <span>ลองใหม่อีกครั้ง</span>
              </button>

              <Link to="/articles" className="article-detail-btn-back">
                <span>ดูบทความทั้งหมด</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="article-detail-page">
      <article className="article-detail">
        {/* 🌟 1. HERO HEADER SECTION */}
        <header className="article-detail-hero">
          <div className="article-detail-container">
            <Link to="/articles" className="article-detail-back-pill">
              <ArrowLeft size={16} />
              <span>บทความทั้งหมด</span>
            </Link>

            <div className="article-detail-hero__grid">
              <div className="article-detail-hero__main">
                {/* Meta Chips (ไม่มีเวลาอ่าน) */}
                <div className="article-detail-chips">
                  <span className="article-detail-chip article-detail-chip--category">
                    <Sparkles size={13} />
                    {getArticleCategory(article)}
                  </span>

                  {publishDate && (
                    <span className="article-detail-chip article-detail-chip--date">
                      <CalendarDays size={13} />
                      {publishDate}
                    </span>
                  )}
                </div>

                {/* Article Title */}
                <h1 className="article-detail-hero__title">
                  {article.articleTitle || "บทความสุขภาพ"}
                </h1>

                {/* Subtitle / Author Info */}
                <div className="article-detail-hero__author-bar">
                  <div className="article-detail-author-avatar">
                    <User size={16} />
                  </div>
                  <div className="article-detail-author-text">
                    <span className="article-detail-author-label">ผู้เผยแพร่</span>
                    <strong className="article-detail-author-name">
                      {article.author || "ผู้ดูแลระบบ (Admin)"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Cover Image Banner */}
              <figure
                className={`article-detail-hero__cover-wrap ${
                  !imageSource || imageError
                    ? "article-detail-hero__cover-wrap--fallback"
                    : ""
                }`}
              >
                {imageSource && !imageError ? (
                  <img
                    src={imageSource}
                    alt={article.articleTitle || "ภาพประกอบบทความ"}
                    className="article-detail-hero__cover-img"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="article-detail-hero__fallback">
                    <Newspaper size={44} aria-hidden="true" />
                    <span>บทความสุขภาพและท่องเที่ยวเชียงใหม่</span>
                  </div>
                )}
              </figure>
            </div>
          </div>
        </header>

        {/* 🌟 2. CONTENT & READING LAYOUT */}
        <div className="article-detail-container article-detail-content-area">
          <div className="article-detail-layout">
            {/* Sidebar Meta Column */}
            <aside className="article-detail-sidebar">
              <div className="article-detail-card-meta">
                <div className="article-detail-card-meta__header">
                  <BookOpen size={16} />
                  <h3>เกี่ยวกับบทความนี้</h3>
                </div>

                <div className="article-detail-card-meta__list">
                  <div className="article-detail-meta-row">
                    <span className="article-detail-meta-label">หมวดหมู่</span>
                    <strong className="article-detail-meta-val">
                      {getArticleCategory(article)}
                    </strong>
                  </div>

                  <div className="article-detail-meta-row">
                    <span className="article-detail-meta-label">ผู้เขียน/เผยแพร่</span>
                    <strong className="article-detail-meta-val">
                      {article.author || "Admin"}
                    </strong>
                  </div>

                  {publishDate && (
                    <div className="article-detail-meta-row">
                      <span className="article-detail-meta-label">วันที่เผยแพร่</span>
                      <strong className="article-detail-meta-val">
                        {publishDate}
                      </strong>
                    </div>
                  )}
                </div>

                <Link to="/articles" className="article-detail-sidebar-btn">
                  <span>ค้นหาบทความอื่น</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </aside>

            {/* Main Article Body Card */}
            <section
              className="article-detail-main-body"
              aria-label="เนื้อหาบทความ"
            >
              {articleContent ? (
                <div
                  className="article-detail-prose"
                  dangerouslySetInnerHTML={{
                    __html: articleContent,
                  }}
                />
              ) : (
                <div className="article-detail-empty-content">
                  <Newspaper size={40} />
                  <h2>ยังไม่มีเนื้อหาบทความ</h2>
                  <p>บทความนี้อยู่ระหว่างการปรับปรุงเนื้อหาเพิ่มเติม</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}