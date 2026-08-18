import { useCallback, useState } from "react";
import axios from "axios";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSearch2,
  LoaderCircle,
  Search,
  ShieldX,
} from "lucide-react";

import "./TrackAccountRequest.css";

const API_URL = "http://localhost:8080/api/account-requests/track";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

function getStatusInformation(status) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "APPROVED") {
    return {
      label: "อนุมัติแล้ว",
      className: "track-request-status track-request-status--approved",
      icon: CheckCircle2,
      description: "บัญชีผู้ใช้งานจะถูกจัดส่งไปยังอีเมลที่ใช้ยื่นคำขอ",
    };
  }

  if (normalizedStatus === "REJECTED") {
    return {
      label: "ไม่อนุมัติ",
      className: "track-request-status track-request-status--rejected",
      icon: ShieldX,
      description: "สามารถแก้ไขข้อมูลหรือเอกสารและส่งคำขอใหม่ได้",
    };
  }

  return {
    label: "รอตรวจสอบ",
    className: "track-request-status track-request-status--pending",
    icon: Clock3,
    description: "คำขอกำลังอยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ",
  };
}

function formatProcessedDate(value) {
  if (!hasValue(value)) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่อีกครั้ง";
  }

  return (
    error.response?.data?.message ||
    error.response?.data ||
    "ไม่สามารถค้นหาสถานะคำขอได้ กรุณาลองใหม่อีกครั้ง"
  );
}

export default function TrackAccountRequest() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const searchRequests = useCallback(async (searchKeyword) => {
    const normalizedKeyword = searchKeyword.trim();
    const isNumeric = /^\d+$/.test(normalizedKeyword);

    // ==========================================
    // Validation Logic
    // ==========================================
    if (!normalizedKeyword) {
      setError("กรุณากรอกเลขใบอนุญาตหรือชื่อสถานประกอบการ");
      setResults([]);
      setSearched(false);
      return;
    }

    if (!isNumeric && normalizedKeyword.length < 2) {
      setError("กรุณากรอกชื่อสถานประกอบการอย่างน้อย 2 ตัวอักษร");
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const response = await axios.get(API_URL, {
        params: { query: normalizedKeyword },
        timeout: 30000,
      });

      setResults(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setResults([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    searchRequests(keyword);
  };

  const handleKeywordChange = (event) => {
    setKeyword(event.target.value);

    if (error) {
      setError("");
    }
  };

  return (
    <main className="track-request-page">
      <header className="track-request-hero">
        <div className="track-request-container">
          <p className="track-request-eyebrow">REQUEST STATUS</p>

          <h1>ติดตามสถานะคำขอ</h1>

          <p className="track-request-hero__description">
            กรอกเลขที่ใบอนุญาต หรือชื่อสถานประกอบการ
            เพื่อตรวจสอบผลการพิจารณาคำขอสิทธิ์
          </p>
        </div>
      </header>

      <div className="track-request-container track-request-content">
        <section className="track-request-search-card">
          <div className="track-request-search-card__heading">
            <div className="track-request-search-card__icon">
              <FileSearch2 />
            </div>

            <div>
              <h2>ค้นหาคำขอของคุณ</h2>
              <p>ระบบจะแสดงเฉพาะคำขอที่ตรงกับข้อมูลที่ค้นหา</p>
            </div>
          </div>

          <form
            className="track-request-search-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="track-request-search-input">
              <Search />

              <input
                type="text"
                value={keyword}
                onChange={handleKeywordChange}
                placeholder="ตัวอย่าง: 500XXXXXX หรือชื่อสถานประกอบการ"
                aria-label="เลขใบอนุญาตหรือชื่อสถานประกอบการ"
                autoComplete="off"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="track-request-button-spinner" />
                  กำลังค้นหา
                </>
              ) : (
                <>
                  <Search />
                  ค้นหา
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="track-request-search-error" role="alert">
              <CircleAlert />
              <span>{error}</span>
            </div>
          )}
        </section>

        {loading && (
          <section className="track-request-state">
            <LoaderCircle className="track-request-state__spinner" />
            <h2>กำลังตรวจสอบสถานะ</h2>
            <p>ระบบกำลังค้นหาคำขอที่เกี่ยวข้อง กรุณารอสักครู่</p>
          </section>
        )}

        {!loading && !searched && !error && (
          <section className="track-request-welcome">
            <div className="track-request-welcome__icon">
              <Building2 />
            </div>

            <div>
              <h2>ตรวจสอบผลได้ด้วยข้อมูลสถานประกอบการ</h2>
              <p>
                ใช้เลขใบอนุญาตหรือชื่อสถานประกอบการที่กรอกไว้ในแบบฟอร์มยื่นคำขอ
              </p>
            </div>
          </section>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <section className="track-request-state">
            <FileSearch2 />
            <h2>ไม่พบคำขอ</h2>
            <p>
              ไม่พบข้อมูลที่ตรงกับ <strong>“{keyword.trim()}”</strong>
              <br />
              กรุณาตรวจสอบเลขใบอนุญาตหรือชื่อสถานประกอบการอีกครั้ง
            </p>
          </section>
        )}

        {!loading && results.length > 0 && (
          <section className="track-request-results">
            <div className="track-request-results__heading">
              <div>
                <p>SEARCH RESULTS</p>
                <h2>ผลการตรวจสอบคำขอ</h2>
              </div>

              <span>{results.length} รายการ</span>
            </div>

            <div className="track-request-table-wrapper">
              <table className="track-request-table">
                <thead>
                  <tr>
                    <th>เลขใบอนุญาต</th>
                    <th>ชื่อสถานประกอบการ</th>
                    <th>สถานะ</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((request) => {
                    const statusInformation = getStatusInformation(
                      request.requestStatus,
                    );
                    const StatusIcon = statusInformation.icon;

                    return (
                      <tr key={request.requestId}>
                        <td
                          data-label="เลขใบอนุญาต"
                          className="track-request-table__license"
                        >
                          {request.licenseId ||
                            request.wellnessHub?.licenseId ||
                            "-"}
                        </td>

                        <td data-label="ชื่อสถานประกอบการ">
                          <div className="track-request-table__hub">
                            <div className="track-request-table__hub-icon">
                              <Building2 />
                            </div>

                            <div>
                              <strong>{request.wellnessHubName}</strong>

                              {hasValue(request.userEmail) && (
                                <span>
                                  อีเมลผู้ยื่นคำขอ: {request.userEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td data-label="สถานะ">
                          <div className={statusInformation.className}>
                            <StatusIcon />
                            <span>{statusInformation.label}</span>
                          </div>
                        </td>

                        <td data-label="รายละเอียด">
                          <div className="track-request-detail">
                            <p>{statusInformation.description}</p>

                            {normalizeStatus(request.requestStatus) ===
                              "REJECTED" &&
                              hasValue(request.rejectionReason) && (
                                <div className="track-request-rejection-reason">
                                  <strong>เหตุผล:</strong>{" "}
                                  {request.rejectionReason}
                                </div>
                              )}

                            {hasValue(request.processedDate) && (
                              <span>
                                วันที่ดำเนินการ:{" "}
                                {formatProcessedDate(request.processedDate)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <aside className="track-request-note">
          <CircleAlert />

          <div>
            <h3>ข้อมูลสำคัญ</h3>
            <p>
              หากคำขอได้รับอนุมัติ
              ระบบจะส่งชื่อผู้ใช้และรหัสผ่านไปยังอีเมลที่ใช้ยื่นคำขอ
              โดยปกติใช้เวลาตรวจสอบประมาณ 1–3 วันทำการ
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
