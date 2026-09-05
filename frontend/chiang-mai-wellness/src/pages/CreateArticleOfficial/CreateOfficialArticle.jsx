import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan,
  faPlus,
  faBold,
  faItalic,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";

import "./CreateOfficialArticle.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

// กำหนดขนาดไฟล์สูงสุดเป็น 20MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

function CreateOfficialArticle() {
  const navigate = useNavigate();
  const { id } = useParams();

  const adminName = localStorage.getItem("adminName") || "Admin";

  const [articleTitle, setArticleTitle] = useState("");
  const [articleCategory, setArticleCategory] = useState("ข่าวประชาสัมพันธ์");
  const [articleDetail, setArticleDetail] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [articleImages, setArticleImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editorRef = useRef(null);

  // State สำหรับควบคุม Popup เตือน Error
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/api/articles/${id}`);
      const data = res.data;

      setArticleTitle(data.articleTitle || "");
      setArticleCategory(data.articleCategory || "ข่าวประชาสัมพันธ์");
      setArticleDetail(data.articleDetail || "");

      if (editorRef.current) {
        editorRef.current.innerHTML = data.articleDetail || "";
      }

      if (data.img) {
        setCoverImage(data.img);
      }

      if (data.articleImages) {
        try {
          const parsedImages =
            typeof data.articleImages === "string"
              ? JSON.parse(data.articleImages)
              : data.articleImages;
          setArticleImages(parsedImages);
        } catch (e) {
          console.error("Error parsing article images", e);
        }
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ตรวจสอบชนิดไฟล์ (.png, .jpg, .jpeg) และขนาดไฟล์ไม่เกิน 20MB
  const validateImage = (file) => {
    const allowTypes = ["image/png", "image/jpeg", "image/jpg"];
    const isExtValid =
      allowTypes.includes(file.type) || /\.(png|jpe?g)$/i.test(file.name);

    if (!isExtValid) {
      return "รองรับเฉพาะไฟล์ .png, .jpg, .jpeg เท่านั้น";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "ขนาดไฟล์ต้องไม่เกิน 20 MB";
    }
    return null;
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      setErrors((prev) => ({ ...prev, cover: error }));
      setErrorMessage(error);
      setShowErrorPopup(true);
      e.target.value = "";
      return;
    }
    setErrors((prev) => ({ ...prev, cover: "" }));
    setCoverImage(file);
  };

  const handleImagesUpload = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // รวมรูปภาพประกอบสูงสุด 4 รูป
    const remainingSlots = 4 - articleImages.length;
    if (remainingSlots <= 0) {
      const msg = "เพิ่มรูปภาพประกอบได้สูงสุด 4 รูป (เมื่อรวมรูปปกจะเป็นสูงสุด 5 รูป)";
      setErrors((prev) => ({ ...prev, images: msg }));
      setErrorMessage(msg);
      setShowErrorPopup(true);
      e.target.value = "";
      return;
    }

    const validFiles = [];
    const invalidMessages = [];

    selectedFiles.forEach((file) => {
      const error = validateImage(file);
      if (error) {
        invalidMessages.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidMessages.length > 0) {
      const msg = invalidMessages.join(" | ");
      setErrors((prev) => ({ ...prev, images: msg }));
      setErrorMessage(msg);
      setShowErrorPopup(true);
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    setArticleImages((prev) => [...prev, ...filesToAdd]);
    e.target.value = "";
  };

  const handleRemoveArticleImage = (indexToRemove) => {
    setArticleImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  const formatText = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) {
      setArticleDetail(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = (e) => {
    setArticleDetail(e.currentTarget.innerHTML);
  };

  const validateForm = () => {
    let err = {};
    const titleTrimmed = articleTitle.trim();
    // 1. ชื่อบทความ: ห้ามว่าง, ภาษาไทย ภาษาอังกฤษ ตัวเลข, 10–100 ตัวอักษร
    const titleRegex = /^[a-zA-Z0-9\u0E00-\u0E7F\s]{10,100}$/;

    if (!titleTrimmed || !titleRegex.test(titleTrimmed)) {
      err.title = "กรุณากรอกข้อมูลให้ครบถ้วน";
    }

    // 2. รายละเอียดบทความ: ห้ามว่าง, 50–2,500 ตัวอักษร
    const rawDetailText = articleDetail.replace(/<[^>]*>/g, "").trim();
    if (!rawDetailText || rawDetailText.length < 50 || rawDetailText.length > 2500) {
      err.detail = "กรุณากรอกข้อมูลให้ครบถ้วน";
    }

    // 3. หมวดหมู่บทความ: Dropdown ห้ามว่าง
    if (!articleCategory) {
      err.category = "กรุณากรอกข้อมูลให้ครบถ้วน";
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      setShowErrorPopup(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let coverBase64 = "";
      if (coverImage) {
        coverBase64 =
          coverImage instanceof File
            ? await fileToBase64(coverImage)
            : coverImage;
      }

      const galleryBase64 = await Promise.all(
        articleImages.map(async (file) => {
          return file instanceof File ? await fileToBase64(file) : file;
        }),
      );

      const payload = {
        articleTitle: articleTitle.trim(),
        articleCategory: articleCategory || "ข่าวประชาสัมพันธ์",
        articleDetail: articleDetail,
        author: adminName,
        img: coverBase64,
        articleImages: JSON.stringify(galleryBase64),
        attachmentFiles: "[]",
      };

      if (id) {
        await axios.put(`http://localhost:8080/api/articles/${id}`, payload);
      } else {
        await axios.post("http://localhost:8080/api/articles", payload);
      }

      navigate("/listOfficialArticle", {
        state: {
          showToast: true,
          toastType: "success",
          toastMessage: id
            ? "บันทึกการแก้ไขบทความสำเร็จ"
            : "เผยแพร่บทความสำเร็จ",
        },
      });
    } catch (error) {
      console.error("ไม่สามารถบันทึกบทความได้", error);
      setIsSubmitting(false);
      setErrorMessage("สร้างบทความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setShowErrorPopup(true);
    }
  };

  const renderImageSrc = (imgData) => {
    if (!imgData) return "";
    if (imgData instanceof File) {
      return URL.createObjectURL(imgData);
    }
    return imgData;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar activeMenu="articles" />

      {/* Content */}
      <div className="main-content">
        <div className="gov-header">
          <h2>
            {id ? "แก้ไขบทความประชาสัมพันธ์" : "เขียนบทความประชาสัมพันธ์"}
          </h2>
          <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
        </div>

        <div className="article-card">
          {/* Cover */}
          <label>รูปภาพหน้าปกบทความ (ว่างได้ ไม่เกิน 20MB)</label>
          <label className="cover-box">
            {coverImage ? (
              <img src={renderImageSrc(coverImage)} alt="Cover Preview" />
            ) : (
              <>
                <span>คลิกเพื่ออัปโหลดรูปหน้าปก</span>
                <small>.png .jpg .jpeg ไม่เกิน 20MB</small>
              </>
            )}
            <input
              type="file"
              hidden
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={handleCoverUpload}
            />
          </label>

          <label>หัวข้อบทความ (10-100 ตัวอักษร) *</label>
          <input
            className="gov-input-field"
            maxLength={100}
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            placeholder="ระบุหัวข้อบทความ..."
          />
          <div className="char-counter">{articleTitle.length}/100</div>

          <label>หมวดหมู่บทความ *</label>
          <select
            className="gov-input-field"
            value={articleCategory}
            onChange={(e) => setArticleCategory(e.target.value)}
          >
            <option value="ข่าวประชาสัมพันธ์">ข่าวประชาสัมพันธ์</option>
            <option value="กิจกรรมสุขภาพ">กิจกรรมสุขภาพ</option>
            <option value="โปรโมชั่น">โปรโมชั่น</option>
          </select>

          <label>รูปภาพประกอบ (ว่างได้ สูงสุด 4 รูป / รวมปกเป็น 5 รูป)</label>
          <div className="gallery">
            {[0, 1, 2, 3].map((index) => {
              const imageFile = articleImages[index];
              return (
                <div className="gallery-box" key={index}>
                  {imageFile ? (
                    <>
                      <img
                        src={renderImageSrc(imageFile)}
                        alt={`รูปประกอบที่ ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="btn-remove-article-image"
                        onClick={() => handleRemoveArticleImage(index)}
                        title="ลบรูปภาพ"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </>
                  ) : (
                    <label className="gallery-upload-label">
                      <FontAwesomeIcon icon={faPlus} />
                      <span>เพิ่มรูป</span>
                      <input
                        type="file"
                        hidden
                        multiple
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={handleImagesUpload}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <label>รายละเอียดบทความ (50-2,500 ตัวอักษร) *</label>

          <div className="toolbar">
            <button type="button" onClick={() => formatText("bold")}>
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button type="button" onClick={() => formatText("italic")}>
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button type="button" onClick={() => formatText("underline")}>
              <FontAwesomeIcon icon={faUnderline} />
            </button>
          </div>

          <div
            ref={editorRef}
            className="article-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
          ></div>
          <div className="char-counter">
            {articleDetail.replace(/<[^>]*>/g, "").length}/2500
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
            >
              ยกเลิก
            </button>

            <button
              type="button"
              className="btn-save"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={isSubmitting ? { opacity: 0.7, cursor: "not-allowed" } : {}}
            >
              {isSubmitting ? "กำลังบันทึก..." : (id ? "บันทึกการแก้ไข" : "เผยแพร่บทความ")}
            </button>
          </div>
        </div>
      </div>

      {/* 🔴 Popup แจ้งเตือนข้อผิดพลาด (Error Modal) */}
      {showErrorPopup && (
        <div className="popup-bg">
          <div className="popup">
            <div className="popup-icon error">!</div>
            <h3>เกิดข้อผิดพลาด</h3>
            <p>{errorMessage}</p>
            <button
              className="confirm-btn"
              onClick={() => setShowErrorPopup(false)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateOfficialArticle;