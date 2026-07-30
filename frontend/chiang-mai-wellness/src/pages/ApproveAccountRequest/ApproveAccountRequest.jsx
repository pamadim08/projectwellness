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
} from "@fortawesome/free-solid-svg-icons";

import "./ApproveAccountRequest.css";

function ApproveAccountRequest() {
  const navigate = useNavigate();
  const { id } = useParams();
  const adminName = localStorage.getItem("adminName") || "Admin";

  const [request, setRequest] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

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
    try {
      await axios.put(
        `http://localhost:8080/api/account-requests/${id}/approve`,
      );
      alert("อนุมัติคำร้องสำเร็จ");
      navigate("/listAccountRequest");
    } catch (err) {
      console.log(err);
      alert("เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  const handleReject = async () => {
    if (!reason) {
      alert("กรุณาเลือกเหตุผล");
      return;
    }

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
      alert("ปฏิเสธคำร้องสำเร็จ");
      navigate("/listAccountRequest");
    } catch (err) {
      console.log(err);
      alert("เกิดข้อผิดพลาดในการปฏิเสธคำร้อง");
    }
  };

  // 5. เพิ่มฟังก์ชันสำหรับการ Logout เคลียร์สิทธิ์แอดมิน
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // 6. ปรับการแสดงผลของหน้าจอตอนกำลังดาวน์โหลดข้อมูลให้อยู่ในกรอบโครงสร้างที่เหมาะสม
  if (!request) {
    return (
      <div className="admin-layout">
        <div className="main-content">
          <div className="loading-text">กำลังโหลดข้อมูลคำร้อง...</div>
        </div>
      </div>
    );
  }

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

        {/* 5. ผูกฟังก์ชันเข้ากับปุ่ม Logout */}
        <button className="btn-sidebar-logout" onClick={handleLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          ออกจากระบบ
        </button>
      </nav>

      {/* Content */}
      <div className="main-content">
        {/* 4. เพิ่มปุ่มย้อนกลับไปหน้าก่อนหน้าบริเวณมุมบนสุด */}
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
              <p>{request.wellnessHubName}</p>
            </div>
            <div>
              {/* 1. แก้ไขการเข้าถึง Object แบบ Nested ของ Category */}
              <label>หมวดหมู่ / ประเภท</label>
              <p>{request.category?.categoryName || "-"}</p>
            </div>
            <div>
              <label>Email</label>
              <p>{request.userEmail}</p>
            </div>
            <div>
              <label>เบอร์โทรศัพท์</label>
              <p>{request.tellInformation}</p>
            </div>
            <div>
              <label>ประเภทใบรับรอง</label>
              <p>{request.certificateType}</p>
            </div>
            <div>
              <label>เวลาทำการ</label>
              <p>{request.operatingHours || "-"}</p>
            </div>
            <div>
              {/* 1. แก้ไขการเข้าถึง Object แบบ Nested ของ District */}
              <label>อำเภอ / เขต</label>
              <p>{request.district?.districtName || "-"}</p>
            </div>
            <div>
              {/* 2. ปรับ Logic การแสดงพิกัดเพื่อรองรับกรณีค่าเป็น 0 */}
              <label>พิกัด (Latitude, Longitude)</label>
              <p>
                {request.wellnessHubLatitude !== null &&
                request.wellnessHubLongitude !== null
                  ? `${request.wellnessHubLatitude}, ${request.wellnessHubLongitude}`
                  : "-"}
              </p>
            </div>
          </div>

          <div className="full-width-detail">
            <label>ที่อยู่ตั้งสถานประกอบการ</label>
            <p className="address-text">{request.address || "-"}</p>
          </div>

          {request.googleMapsLink && (
            <div className="map-link-box">
              <label>ลิงก์แผนที่ Google Maps</label>
              <br />
              <a
                href={request.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-btn"
              >
                <FontAwesomeIcon icon={faMapMarkerAlt} /> เปิดดูแผนที่บน Google
                Maps
              </a>
            </div>
          )}

          {/* 3. จัดการโครงสร้างพาร์ทรูปภาพ เผื่อการเก็บ Path ไฟล์อัปโหลดในโปรเจคช่วงปลาย */}
          {request.wellnessHubImg && (
            <div className="image-preview-box">
              <label>รูปภาพสถานประกอบการ</label>
              <div className="img-container">
                <img
                  src={
                    request.wellnessHubImg.startsWith("http")
                      ? request.wellnessHubImg
                      : `http://localhost:8080/uploads/${request.wellnessHubImg}`
                  }
                  alt="Wellness Hub Preview"
                />
              </div>
            </div>
          )}

          <h3>รายละเอียดเพิ่มเติม</h3>
          <p className="description-text">
            {request.wellnessHubDescription || "ไม่มีรายละเอียดเพิ่มเติม"}
          </p>

          <h3>เอกสารประกอบ</h3>
          <div className="pdf-box">
            <FontAwesomeIcon icon={faFilePdf} />
            <span>{request.verificationDocuments || "ไม่มีไฟล์เอกสาร"}</span>
            <button
              onClick={() => {
                if (request.verificationDocuments) {
                  // เช็คเผื่อกรณีปลายทางเป็นชื่อไฟล์ธรรมดาเพื่อเปิดลิงก์ให้ถูกต้องเช่นกัน
                  const targetUrl = request.verificationDocuments.startsWith(
                    "http",
                  )
                    ? request.verificationDocuments
                    : `http://localhost:8080/uploads/${request.verificationDocuments}`;
                  window.open(targetUrl, "_blank");
                } else {
                  alert("ไม่พบไฟล์เอกสารแนบ");
                }
              }}
            >
              เปิดเอกสาร
            </button>
          </div>

          <div className="action-area">
            <button
              className="approve-btn"
              onClick={() => setShowApprove(true)}
            >
              <FontAwesomeIcon icon={faCheck} />
              อนุมัติ
            </button>

            <button className="reject-btn" onClick={() => setShowReject(true)}>
              <FontAwesomeIcon icon={faXmark} />
              ไม่อนุมัติ
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
              <button className="confirm-btn" onClick={handleApprove}>
                ยืนยัน
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowApprove(false)}
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
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">เลือกเหตุผล</option>
              <option>เอกสารไม่ครบถ้วน</option>
              <option>ข้อมูลไม่ถูกต้อง</option>
              <option>ไม่ผ่านเกณฑ์การพิจารณา</option>
            </select>
            <div className="popup-buttons">
              <button className="confirm-btn" onClick={handleReject}>
                ยืนยัน
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowReject(false)}
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
