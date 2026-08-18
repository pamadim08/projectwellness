import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";

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
  faCheck,
  faXmark,
  faFilePdf,
  faMapMarkerAlt,
  faArrowLeft,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import "./ApproveAccountRequest.css";

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

function ApproveAccountRequest() {
  const navigate = useNavigate();
  const { id } = useParams();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const [request, setRequest] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  // 🌟 ป้องกันการกดซ้ำระหว่างส่งข้อมูล
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

  // 🌟 ฟังก์ชันอนุมัติ
  // ส่งสถานะกลับไปหน้า List เพื่ออัปเดตเฉพาะรายการเดิมโดยไม่โหลด List ใหม่
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

  // 🌟 ฟังก์ชันปฏิเสธ
  // ส่งสถานะและเหตุผลกลับไปหน้า List เพื่อแสดงปุ่มดูเหตุผลโดยไม่โหลด List ใหม่
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
          params: {
            reason,
          },
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

  // หน้ารอโหลดข้อมูลให้อยู่ตรงกลางจอ
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

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <FontAwesomeIcon icon={faShieldHeart} />
            <span>Admin Panel</span>
          </div>

          <div className="user-profile-box">
            <FontAwesomeIcon icon={faCircleUser} />
            <div>
              <span>ผู้ใช้งานปัจจุบัน:</span>
              <br />
              <b>{adminName}</b>
            </div>
          </div>

          <p className="menu-label">เมนูหลัก</p>

          <Link className="menu-item" to="/admin/dashboard">
            <FontAwesomeIcon icon={faChartPie} />
            แผงควบคุมหลัก
          </Link>

          <Link className="menu-item active">
            <FontAwesomeIcon icon={faClipboardCheck} />
            ตรวจสอบคำขอสิทธิ์
          </Link>

          <p className="menu-label">การจัดการข้อมูล</p>

          <Link className="menu-item" to="/listMainRoute">
            <FontAwesomeIcon icon={faRoute} />
            จัดการเส้นทางสุขภาพ
          </Link>

          <Link className="menu-item" to="/listWellnesshub">
            <FontAwesomeIcon icon={faShop} />
            จัดการสถานประกอบการ
          </Link>

          <Link className="menu-item" to="/listOfficialArticle">
            <FontAwesomeIcon icon={faNewspaper} />
            จัดการบทความ
          </Link>
        </div>

        <button className="btn-sidebar-logout" onClick={handleLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          ออกจากระบบ
        </button>
      </nav>

      {/* Content */}
      <div className="main-content">
        <button
          className="back-btn"
          onClick={() => navigate("/listAccountRequest")}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> กลับรายการคำร้อง
        </button>

        <div className="gov-header">
          <h2>พิจารณาคำร้องขอสิทธิ์</h2>
          <p>ตรวจสอบข้อมูลสถานประกอบการอย่างละเอียดก่อนอนุมัติบัญชี</p>
        </div>

        <div className="request-card">
          <h3>ข้อมูลสถานประกอบการ</h3>

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
              <label>Email</label>
              <p>{request.userEmail || "-"}</p>
            </div>

            <div>
              <label>เบอร์โทรศัพท์</label>
              <p>{request.tellInformation || "-"}</p>
            </div>

            <div>
              <label>ประเภทใบรับรอง</label>
              <p>{formatCertificateType(request.certificateType)}</p>
            </div>

            <div style={{ gridRow: "span 3" }}>
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
                      padding: "10px",
                      backgroundColor: "#fafafa",
                      border: "1px solid #999",
                      borderRadius: "0px",
                      color: "#333",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  >
                    {hourText}
                  </div>
                ))}
              </div>
            </div>

            {request.wellnessHubImg && (
              <div>
                <label>รูปภาพสถานประกอบการ</label>
                <div
                  className="img-container"
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    height: "220px",
                    border: "1px solid #999",
                  }}
                >
                  <img
                    src={getImageUrl(request.wellnessHubImg)}
                    alt="Wellness Hub Preview"
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
              </div>
            )}

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
                      borderRadius: "3px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "13px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      transition: "background-color 0.2s",
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

            <div>
              <label>อำเภอ / เขต</label>
              <p>{request.district?.districtName || "-"}</p>
            </div>
          </div>

          <div className="full-width-detail">
            <label>ที่อยู่ตั้งสถานประกอบการ</label>
            <p className="address-text">{request.address || "-"}</p>
          </div>

          <h3 style={{ marginTop: "20px" }}>รายละเอียดเพิ่มเติม</h3>
          <p className="description-text">
            {request.wellnessHubDescription || "ไม่มีรายละเอียดเพิ่มเติม"}
          </p>

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

          <div className="action-area" style={{ marginTop: "25px" }}>
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
            <p>ระบบจะสร้างบัญชีผู้ใช้งานให้อัตโนมัติ</p>
            <p>Username และ Password จะถูกส่งไปยัง Email ของสถานประกอบการ</p>

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
