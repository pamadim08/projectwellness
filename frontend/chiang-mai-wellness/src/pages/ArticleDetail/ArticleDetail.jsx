import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Newspaper,
  RefreshCw,
} from "lucide-react";

import { Link, useParams } from "react-router-dom";

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
    } catch (error) {
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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

      childNode.removeAttribute(attribute.name);
    });

    if (tagName === "A" && childNode.hasAttribute("href")) {
      childNode.setAttribute("target", "_blank");
      childNode.setAttribute("rel", "noopener noreferrer");
    }

    sanitizeArticleNode(childNode);
  });
}

function normalizePlainTextArticle(value = "") {
  const normalizedValue = String(value)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .split(/\n{2,}/)
    .map((paragraph) => {
      const paragraphHtml = escapeHtml(paragraph.trim()).replace(
        /\n/g,
        "<br />",
      );

      return `<p>${paragraphHtml}</p>`;
    })
    .join("");
}

function sanitizeArticleHtml(value = "") {
  if (!hasValue(value)) {
    return "";
  }

  let articleHtml = String(value).trim();

  articleHtml = articleHtml
    .replace(/\\r\\n/g, "<br />")
    .replace(/\\n/g, "<br />")
    .replace(/\\r/g, "<br />")
    .replace(/\\t/g, " ");

  const containsHtml = /<\/?[a-z][\s\S]*?>/i.test(articleHtml);

  if (!containsHtml) {
    return normalizePlainTextArticle(value);
  }

  if (typeof DOMParser === "undefined") {
    return normalizePlainTextArticle(value);
  }

  const parser = new DOMParser();

  const documentContent = parser.parseFromString(
    `<div id="article-content-root">${articleHtml}</div>`,
    "text/html",
  );

  const articleRoot = documentContent.getElementById(
    "article-content-root",
  );

  if (!articleRoot) {
    return normalizePlainTextArticle(value);
  }

  sanitizeArticleNode(articleRoot);

  return articleRoot.innerHTML;
}

function getErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  if (error.response?.status === 404) {
    return "ไม่พบบทความที่คุณกำลังค้นหา";
  }

  return (
    error.response?.data?.message ||
    "ไม่สามารถโหลดรายละเอียดบทความได้ กรุณาลองใหม่อีกครั้ง"
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

    return normalizeImageSource(
      article.img || article.articleImages,
    );
  }, [article]);

  const publishDate = useMemo(() => {
    return formatDate(article?.publishDate);
  }, [article]);

  const articleContent = useMemo(() => {
    return sanitizeArticleHtml(article?.articleDetail || "");
  }, [article]);

  if (loading) {
    return (
      <main className="article-detail-page article-detail-page--loading">
        <section
          className="article-detail-loading"
          aria-label="กำลังโหลดรายละเอียดบทความ"
          aria-busy="true"
        >
          <div className="article-detail-container">
            <div className="article-detail-loading__header">
              <div className="article-detail-spinner" />

              <div>
                <h1>กำลังโหลดบทความ</h1>

                <p>ระบบกำลังเตรียมเนื้อหาให้คุณ</p>
              </div>
            </div>

            <div className="article-detail-loading__layout">
              <div className="article-detail-loading__info">
                <div className="article-detail-loading__line article-detail-loading__line--small" />

                <div className="article-detail-loading__line article-detail-loading__line--title" />

                <div className="article-detail-loading__line article-detail-loading__line--medium" />

                <div className="article-detail-loading__line article-detail-loading__line--short" />
              </div>

              <div className="article-detail-loading__image" />
            </div>

            <div className="article-detail-loading__body">
              <div className="article-detail-loading__line" />
              <div className="article-detail-loading__line" />
              <div className="article-detail-loading__line article-detail-loading__line--body-short" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="article-detail-page">
        <div className="article-detail-container article-detail-error-wrap">
          <Link
            to="/articles"
            className="article-detail-back-link"
          >
            <ArrowLeft />

            <span>กลับไปหน้าบทความ</span>
          </Link>

          <section
            className="article-detail-state article-detail-state--error"
            role="alert"
          >
            <CircleAlert />

            <h1>ไม่สามารถเปิดบทความได้</h1>

            <p>{error || "ไม่พบข้อมูลบทความ"}</p>

            <div className="article-detail-state__actions">
              <button type="button" onClick={loadArticle}>
                <RefreshCw />

                ลองใหม่
              </button>

              <Link to="/articles">
                ดูบทความทั้งหมด

                <ArrowRight />
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
        <header className="article-detail-header">
          <div className="article-detail-container">
            <Link
              to="/articles"
              className="article-detail-back-link"
            >
              <ArrowLeft />

              <span>บทความทั้งหมด</span>
            </Link>

            <div className="article-detail-header__layout">
              <div className="article-detail-header__content">
                <div className="article-detail-meta">
                  <span className="article-detail-category">
                    {getArticleCategory(article)}
                  </span>

                  {publishDate && (
                    <span className="article-detail-date">
                      <CalendarDays />

                      {publishDate}
                    </span>
                  )}
                </div>

                <h1>
                  {article.articleTitle || "บทความสุขภาพ"}
                </h1>

                <p className="article-detail-header__intro">
                  เรื่องราว ความรู้ และแนวคิดเกี่ยวกับสุขภาพ
                  เพื่อช่วยให้การดูแลตัวเองและการเดินทางของคุณมีความหมายมากขึ้น
                </p>

                <div className="article-detail-header__divider" />
              </div>

              <figure
                className={`article-detail-header__cover ${
                  !imageSource || imageError
                    ? "article-detail-header__cover--fallback"
                    : ""
                }`}
              >
                {imageSource && !imageError ? (
                  <img
                    src={imageSource}
                    alt={
                      article.articleTitle ||
                      "ภาพประกอบบทความ"
                    }
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="article-detail-header__fallback">
                    <Newspaper aria-hidden="true" />

                    <span>บทความสุขภาพ</span>
                  </div>
                )}
              </figure>
            </div>
          </div>
        </header>

        <div className="article-detail-container article-detail-content">
          <div className="article-detail-reading">
            <aside className="article-detail-reading__aside">
              <span className="article-detail-reading__label">
                บทความ
              </span>

              <div className="article-detail-reading__aside-line" />

              <div className="article-detail-reading__meta-block">
                <span>หมวดหมู่</span>

                <strong>
                  {getArticleCategory(article)}
                </strong>
              </div>

              {publishDate && (
                <div className="article-detail-reading__meta-block">
                  <span>เผยแพร่</span>

                  <strong>{publishDate}</strong>
                </div>
              )}
            </aside>

            <section
              className="article-detail-body"
              aria-label="เนื้อหาบทความ"
            >
              {articleContent ? (
                <div
                  className="article-detail-body__content"
                  dangerouslySetInnerHTML={{
                    __html: articleContent,
                  }}
                />
              ) : (
                <div className="article-detail-body__empty">
                  <Newspaper />

                  <h2>ยังไม่มีเนื้อหาบทความ</h2>

                  <p>
                    บทความนี้ยังไม่ได้เพิ่มรายละเอียดเนื้อหา
                  </p>
                </div>
              )}
            </section>
          </div>

          <footer className="article-detail-footer">
            <div className="article-detail-footer__text">
              <span>อ่านบทความเพิ่มเติม</span>

              <h2>ค้นหาเรื่องราวที่คุณสนใจต่อ</h2>

              <p>
                ยังมีบทความเกี่ยวกับสุขภาพ การดูแลตนเอง
                และการท่องเที่ยวเชิงสุขภาพให้คุณเลือกอ่าน
              </p>
            </div>

            <Link
              to="/articles"
              className="article-detail-footer__button"
            >
              <span>ดูบทความทั้งหมด</span>

              <ArrowRight />
            </Link>
          </footer>
        </div>
      </article>
    </main>
  );
}