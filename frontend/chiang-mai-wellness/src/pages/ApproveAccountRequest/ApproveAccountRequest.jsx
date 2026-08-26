import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faXmark,
  faFilePdf,
  faMapMarkerAlt,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import "./ApproveAccountRequest.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

// Helper Functions จัดฟอร์แมตข้อมูล

// 1. แปลงประเภทใบรับรอง
const formatCertificateType = (certData) => {
  if (!certData) return "-";
  try {
    const parsed =
      typeof certData === "string" ? JSON.parse(certData) : certData;
    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }
    return String(parsed);
  } catch (e) {
    return String(certData).replace(/[\[\]"']/g, "");
  }
};

// 2. แปลงเวลาทำการเป็น Array รายวัน
const formatOperatingHoursList = (hoursData) => {
  if (!hoursData) return ["ไม่ได้ระบุเวลาทำการ"];
  try {
    const parsed =
      typeof hoursData === "string" ? JSON.parse(hoursData) : hoursData;
    if (typeof parsed !== "object" || parsed === null)
      return [String(hoursData)];

    const dayMap = {
      monday: "วันจันทร์",
      tuesday: "วันอังคาร",
      wednesday: "วันพุธ",
      thursday: "วันพฤหัสบดี",
      friday: "วันศุกร์",
      saturday: "วันเสาร์",
      sunday: "วันอาทิตย์",
    };

    const is24Hours = Object.keys(dayMap).every((dayKey) => {
      const info = parsed[dayKey];
      return (
        info &&
        info.active &&
        info.open === "00:00" &&
        (info.close === "23:59" || info.close === "24:00" || info.close === "00:00")
      );
    });

    if (is24Hours) {
      return ["เปิดให้บริการตลอด 24 ชั่วโมง (ทุกวัน)"];
    }

    const activeDays = Object.entries(parsed)
      .filter(([_, info]) => info && info.active)
      .map(
        ([dayKey, info]) =>
          `${dayMap[dayKey] || dayKey}: ${info.open} - ${info.close} น.`,
      );

    return activeDays.length > 0 ? activeDays : ["หยุดบริการทุกวัน"];
  } catch (e) {
    return [String(hoursData)];
  }
};

// 3. จัดการรูปภาพ
const getImageUrl = (imgData) => {
  if (!imgData) return null;
  if (imgData.startsWith("data:image") || imgData.startsWith("http")) {
    return imgData;
  }
  return `http://localhost:8080/uploads/${imgData}`;
};

// 4. แปลง Gallery JSON Array ป้องกัน JSON.parse error
const parseGalleryImages = (galleryData) => {
  if (!galleryData) return [];
  if (Array.isArray(galleryData)) return galleryData;
  try {
    const parsed = JSON.parse(galleryData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

function ApproveAccountRequest() {
  const navigate = useNavigate();
  const { id } = useParams();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const [request, setRequest] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, []);

  const fetchRequest = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/account-requests/${id}`,
      );
      setRequest(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await axios.put(
        `http://localhost:8080/api/account-requests/${id}/approve`,
      );

      navigate("/listAccountRequest", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: `อนุมัติคำร้องขอสิทธิ์ของ "${
            request?.wellnessHubName || "สถานประกอบการ"
          }" เรียบร้อยแล้ว`,
          updatedRequestId: Number(id),
          requestStatus: "APPROVED",
        },
      });
    } catch (err) {
      console.log(err);
      alert("เกิดข้อผิดพลาดในการอนุมัติ กรุณาลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reason) {
      alert("กรุณาเลือกเหตุผลการไม่อนุมัติ");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await axios.put(
        `http://localhost:8080/api/account-requests/${id}/reject`,
        null,
        {
          params: { reason },
        },
      );

      navigate("/listAccountRequest", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: `ไม่อนุมัติคำร้องของ "${
            request?.wellnessHubName || "สถานประกอบการ"
          }" เรียบร้อยแล้ว`,
          updatedRequestId: Number(id),
          requestStatus: "REJECTED",
          rejectionReason: reason,
        },
      });
    } catch (err) {
      console.log(err);
      alert("เกิดข้อผิดพลาดในการปฏิเสธคำร้อง กรุณาลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleOpenPdf = (pdfData) => {
    if (!pdfData) {
      alert("ไม่พบไฟล์เอกสารแนบ");
      return;
    }

    if (pdfData.startsWith("data:application/pdf")) {
      try {
        const arr = pdfData.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new Blob([u8arr], { type: mime });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, "_blank");
      } catch (e) {
        alert("ไม่สามารถเปิดไฟล์ PDF ได้ รูปแบบ Base64 ไม่ถูกต้อง");
      }
    } else {
      const targetUrl = pdfData.startsWith("http")
        ? pdfData
        : `http://localhost:8080/uploads/${pdfData}`;
      window.open(targetUrl, "_blank");
    }
  };

  if (!request) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f4f6f9",
          color: "#475569",
          fontFamily: "'Sarabun', sans-serif",
        }}
      >
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          style={{ fontSize: "40px", color: "#2563eb", marginBottom: "16px" }}
        />
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
          กำลังโหลดข้อมูลคำร้อง...
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#94a3b8" }}>
          กรุณารอสักครู่ ระบบกำลังดึงข้อมูลจากเซิร์ฟเวอร์
        </p>
      </div>
    );
  }

  const operatingHoursList = formatOperatingHoursList(request.operatingHours);
  const galleryList = parseGalleryImages(request.wellnessHubGallery);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar activeMenu="account-requests" />

      {/* Main Content */}
      <div className="main-content">
        <button
          className="back-btn"
          onClick={() => navigate("/listAccountRequest")}
        ></button>

        <div className="gov-header">
          <h2>พิจารณาคำร้องขอสิทธิ์</h2>
          <p>ตรวจสอบข้อมูลสถานประกอบการอย่างละเอียดก่อนอนุมัติบัญชี</p>
        </div>

        <div className="request-card">
          {/* SECTION 1: ข้อมูลสถานประกอบการ */}
          <h3>ข้อมูลสถานประกอบการ</h3>

          {request.wellnessHubImg && (
            <div
              className="cover-img-container"
              style={{
                width: "100%",
                height: "260px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                overflow: "hidden",
                marginBottom: "20px",
                backgroundColor: "#f8fafc",
              }}
            >
              <img
                src={getImageUrl(request.wellnessHubImg)}
                alt="Wellness Hub Cover"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="detail-grid">
            <div>
              <label>ชื่อสถานประกอบการ</label>
              <p>{request.wellnessHubName || "-"}</p>
            </div>

            <div>
              <label>หมวดหมู่ / ประเภท</label>
              <p>{request.category?.categoryName || "-"}</p>
            </div>

            <div>
              <label>เลขใบอนุญาตประกอบกิจการ</label>
              <p>{request.licenseId || "-"}</p>
            </div>

            <div>
              <label>ประเภทใบรับรอง</label>
              <p>{formatCertificateType(request.certificateType)}</p>
            </div>

            <div>
              <label>เบอร์โทรศัพท์สถานประกอบการ</label>
              <p>{request.tellInformation || "-"}</p>
            </div>

            <div>
              <label>Email สถานประกอบการ</label>
              <p>{request.userEmail || "-"}</p>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label>เวลาทำการ</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginTop: "6px",
                }}
              >
                {operatingHoursList.map((hourText, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#fafafa",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      color: "#334155",
                      fontSize: "14px",
                    }}
                  >
                    {hourText}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr
            style={{
              margin: "24px 0",
              border: "0",
              borderTop: "1px solid #e2e8f0",
            }}
          />

          {/* SECTION 2: เกี่ยวกับสถานประกอบการ */}
          <h3>เกี่ยวกับสถานประกอบการ</h3>
          <p
            className="description-text"
            style={{ lineHeight: "1.6", color: "#475569" }}
          >
            {request.wellnessHubDescription || "ไม่มีรายละเอียดเพิ่มเติม"}
          </p>

          <hr
            style={{
              margin: "24px 0",
              border: "0",
              borderTop: "1px solid #e2e8f0",
            }}
          />

          {/* SECTION 3: รูปภาพบรรยากาศ (Gallery) */}
          {galleryList.length > 0 && (
            <div className="gallery-section">
              <h3>รูปภาพบรรยากาศ</h3>
              <div
                className="gallery-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                {galleryList.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      width: "100%",
                      height: "140px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`gallery-${index}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ))}
              </div>
              <hr
                style={{
                  margin: "24px 0",
                  border: "0",
                  borderTop: "1px solid #e2e8f0",
                }}
              />
            </div>
          )}

          {/* SECTION 4: ตำแหน่งที่ตั้ง */}
          <h3>ตำแหน่งที่ตั้ง</h3>
          <div className="detail-grid" style={{ marginBottom: "12px" }}>
            <div>
              <label>อำเภอ / เขต</label>
              <p>{request.district?.districtName || "-"}</p>
            </div>

            <div>
              <label>แผนที่สถานที่ตั้ง</label>
              <div style={{ marginTop: "6px" }}>
                {request.googleMapsLink ? (
                  <a
                    href={request.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      borderRadius: "4px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "13px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} /> เปิดดูแผนที่บน
                    Google Maps
                  </a>
                ) : (
                  <p>-</p>
                )}
              </div>
            </div>
          </div>

          <div className="full-width-detail">
            <label>ที่อยู่ตั้งสถานประกอบการ</label>
            <p className="address-text">{request.address || "-"}</p>
          </div>

          <hr
            style={{
              margin: "24px 0",
              border: "0",
              borderTop: "1px solid #e2e8f0",
            }}
          />

          {/* SECTION 5: ข้อมูลผู้ยื่นคำขอ */}
          <h3>ข้อมูลผู้ยื่นคำขอ</h3>
          <div className="detail-grid">
            <div>
              <label>ชื่อผู้ยื่นคำขอ</label>
              <p>{request.requesterName || "-"}</p>
            </div>

            <div>
              <label>Email ผู้ยื่นคำขอ</label>
              <p>{request.userEmail || "-"}</p>
            </div>

            <div>
              <label>Username</label>
              <p>{request.username || "-"}</p>
            </div>

            <div>
              <label>เบอร์โทรศัพท์</label>
              <p>{request.tellInformation || "-"}</p>
            </div>

            <div>
              <label>ช่องทางติดต่อเพิ่มเติม</label>
              <p>{request.contactInformation || "-"}</p>
            </div>
          </div>

          <hr
            style={{
              margin: "24px 0",
              border: "0",
              borderTop: "1px solid #e2e8f0",
            }}
          />

          {/* SECTION 6: เอกสารประกอบ */}
          <h3>เอกสารประกอบ</h3>
          <div
            className="pdf-box"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#fafafa",
              border: "1px solid #999",
              borderRadius: "0px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FontAwesomeIcon
                icon={faFilePdf}
                style={{ color: "#dc2626", fontSize: "20px" }}
              />
              <span
                style={{
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                {request.verificationDocuments
                  ? "เอกสารยืนยันตัวตน (PDF)"
                  : "ไม่มีไฟล์เอกสารแนบ"}
              </span>
            </div>

            <button
              type="button"
              style={{
                padding: "6px 16px",
                background: "#ffffff",
                color: "#333",
                border: "1px solid #333",
                borderRadius: "0px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => handleOpenPdf(request.verificationDocuments)}
            >
              เปิดเอกสาร
            </button>
          </div>

          {/* Action Buttons */}
          <div className="action-area" style={{ marginTop: "30px" }}>
            <button
              className="approve-btn"
              onClick={() => setShowApprove(true)}
              disabled={isSubmitting}
            >
              <FontAwesomeIcon icon={faCheck} /> อนุมัติ
            </button>

            <button
              className="reject-btn"
              onClick={() => setShowReject(true)}
              disabled={isSubmitting}
            >
              <FontAwesomeIcon icon={faXmark} /> ไม่อนุมัติ
            </button>
          </div>
        </div>
      </div>

      {/* Popup Approve */}
      {showApprove && (
        <div className="popup-bg">
          <div className="popup">
            <h3>ยืนยันการอนุมัติสิทธิ์?</h3>
            <p>
              ระบบจะอนุมัติคำร้องและสร้างบัญชีผู้ใช้งาน  <p>สำหรับสถานประกอบการนี้</p>
            </p>

            <p>กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</p>

            <div className="popup-buttons">
              <button
                className="confirm-btn"
                onClick={handleApprove}
                disabled={isSubmitting}
                style={{
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  "ยืนยัน"
                )}
              </button>

              <button
                className="cancel-btn"
                onClick={() => setShowApprove(false)}
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Reject */}
      {showReject && (
        <div className="popup-bg">
          <div className="popup reject-popup">
            <h3>ยืนยันการไม่อนุมัติ?</h3>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">เลือกเหตุผล</option>
              <option>เอกสารไม่ครบถ้วน</option>
              <option>ข้อมูลไม่ถูกต้อง</option>
              <option>ไม่ผ่านเกณฑ์การพิจารณา</option>
            </select>

            <div className="popup-buttons">
              <button
                className="confirm-btn"
                onClick={handleReject}
                disabled={isSubmitting}
                style={{
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  "ยืนยัน"
                )}
              </button>

              <button
                className="cancel-btn"
                onClick={() => setShowReject(false)}
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApproveAccountRequest;
