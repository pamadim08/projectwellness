import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faExclamationTriangle,
  faTimes,
  faArrowRight,
  faPenToSquare,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import "./AdminStatusModal.css";

/**
 * AdminStatusModal - ป๊อปอัปสถานะกระชับ คมชัด สไตล์ทางการ
 * เน้นไอคอนเด่นชัด ข้อความสั้นกระชับ 1-2 บรรทัด ไม่มีมุมโค้งมน (Strictly 0px Border-Radius)
 */
function AdminStatusModal({
  isOpen,
  type = "success", // 'loading' | 'success' | 'error'
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  isEdit = false,
  showCloseButton = false,
}) {
  if (!isOpen) return null;

  const isLoading = type === "loading";
  const isSuccess = type === "success";
  const isError = type === "error";

  // ฟังก์ชันแปลงข้อความให้เป็น String เสมอ ป้องกัน React Error: Objects are not valid as a React child
  const safeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object") {
      return val.message || val.error || val.statusText || JSON.stringify(val);
    }
    return String(val);
  };

  const safeTitle = safeText(title);
  const safeMessage = safeText(message);

  // กำหนดข้อความสั้นกระชับ 1-2 บรรทัด
  const defaultTitle = isLoading
    ? isEdit
      ? "กำลังบันทึกการแก้ไข..."
      : "กำลังบันทึกข้อมูล..."
    : isSuccess
    ? isEdit
      ? "บันทึกการแก้ไขสำเร็จ"
      : "บันทึกข้อมูลสำเร็จ"
    : isEdit
    ? "ไม่สามารถแก้ไขข้อมูลได้"
    : "ไม่สามารถบันทึกข้อมูลได้";

  const defaultMessage = isLoading
    ? "ระบบกำลังบันทึกข้อมูลเข้าสู่ฐานข้อมูลกลาง กรุณารอสักครู่"
    : isSuccess
    ? isEdit
      ? "ระบบได้ปรับปรุงและบันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว"
      : "ระบบได้บันทึกข้อมูลใหม่เรียบร้อยแล้ว"
    : "กรุณาตรวจสอบความถูกต้องของข้อมูลแล้วลองใหม่อีกครั้ง";

  const defaultConfirmText = isSuccess ? "กลับสู่หน้ารายการ" : "ตกลง";
  const defaultCancelText = isSuccess ? "ปิด" : "กลับไปแก้ไขข้อมูล";

  const getThemeClass = () => {
    if (isLoading) return "modal-theme-loading";
    if (isSuccess) return "modal-theme-success";
    return "modal-theme-error";
  };

  return (
    <div className="admin-status-modal-overlay" role="dialog" aria-modal="true">
      <div className={`admin-status-modal-box ${getThemeClass()}`}>
        {/* แถบสีด้านบน */}
        <div className="admin-modal-top-accent" />

        {/* ปุ่มปิดมุมขวาบน (ไม่แสดงหากมีปุ่มดำเนินการด้านล่าง เพื่อความเรียบหรูและชัดเจน) */}
        {showCloseButton && !isLoading && (onClose || onConfirm) && (
          <button
            type="button"
            className="admin-status-close-btn"
            onClick={onClose || onConfirm}
            aria-label="ปิด"
            title="ปิด"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}

        {/* เนื้อหาหลัก: ไอคอน + ข้อความ 1-2 บรรทัด */}
        <div className="admin-status-body">
          {/* กรอบไอคอนทรงเหลี่ยมคมชัด */}
          <div className="admin-status-icon-frame">
            {isLoading ? (
              <FontAwesomeIcon
                icon={faSpinner}
                className="admin-status-main-icon icon-spin"
              />
            ) : (
              <FontAwesomeIcon
                icon={isSuccess ? faCheck : faExclamationTriangle}
                className="admin-status-main-icon"
              />
            )}
          </div>

          {/* ข้อความสั้น ชัดเจน */}
          <div className="admin-status-text-content">
            <h3 className="admin-status-title">{safeTitle || defaultTitle}</h3>
            <p className="admin-status-message">{safeMessage || defaultMessage}</p>

            {/* แถบ Progress Bar เล็ก คมชัด เฉพาะตอนกำลังโหลด */}
            {isLoading && (
              <div className="admin-status-progress-track">
                <div className="admin-status-progress-bar" />
              </div>
            )}
          </div>
        </div>

        {/* ปุ่มคำสั่งด้านล่าง (ไม่แสดงตอนกำลังโหลด) */}
        {!isLoading && (
          <div className="admin-status-actions">
            {isSuccess ? (
              <button
                type="button"
                className="btn-admin-action btn-admin-primary btn-success-glow"
                onClick={onConfirm || onClose}
                autoFocus
              >
                <span>{confirmText || defaultConfirmText}</span>
                <FontAwesomeIcon icon={faArrowRight} className="btn-action-icon-right" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-admin-action btn-admin-primary btn-error-glow"
                onClick={onClose}
                autoFocus
              >
                <FontAwesomeIcon icon={faPenToSquare} className="btn-action-icon-left" />
                <span>{cancelText || defaultCancelText}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

AdminStatusModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  type: PropTypes.oneOf(["loading", "success", "error"]),
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func,
  onClose: PropTypes.func,
  isEdit: PropTypes.bool,
  showCloseButton: PropTypes.bool,
};

export default AdminStatusModal;
