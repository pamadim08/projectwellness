import React, { useState, useEffect } from "react";
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

// กำหนดขนาดไฟล์สูงสุดเป็น 5MB ป้องกัน Base64 บวมจน Request พัง
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

      setArticleTitle(data.articleTitle);
      setArticleCategory(data.articleCategory);
      setArticleDetail(data.articleDetail);

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

  // ปรับการ Validate ขนาดรูปภาพเหลือ 5MB ตามที่แนะนำ
  const validateImage = (file) => {
    const allow = ["image/png", "image/jpeg", "image/jpg"];
    if (!allow.includes(file.type)) {
      return "รองรับเฉพาะ png jpg jpeg";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "ขนาดไฟล์ต้องไม่เกิน 5MB";
    }
    return null;
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      setErrors({
        ...errors,
        cover: error,
      });
      return;
    }
    setCoverImage(file);
  };

  const handleImagesUpload = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = 4 - articleImages.length;
    if (remainingSlots <= 0) {
      setErrors((prev) => ({
        ...prev,
        images: "เพิ่มรูปภาพประกอบได้สูงสุด 4 รูป",
      }));
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

    const filesToAdd = validFiles.slice(0, remainingSlots);
    setArticleImages((prev) => [...prev, ...filesToAdd]);

    let errorMessage = "";
    if (validFiles.length > remainingSlots) {
      errorMessage = `เพิ่มได้อีกเพียง ${remainingSlots} รูป ระบบเลือกเฉพาะรูปตามจำนวนช่องที่เหลือ`;
    }
    if (invalidMessages.length > 0) {
      errorMessage = invalidMessages.join(" | ");
    }

    setErrors((prev) => ({
      ...prev,
      images: errorMessage,
    }));
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
  };

  const validateForm = () => {
    let err = {};
    if (!articleTitle.trim()) {
      err.title = "กรุณากรอกชื่อบทความ";
    } else if (articleTitle.length < 10) {
      err.title = "ชื่อบทความต้องมีอย่างน้อย 10 ตัวอักษร";
    }

    if (!articleDetail.trim() || articleDetail === "<br>") {
      err.detail = "กรุณากรอกรายละเอียด";
    } else if (articleDetail.replace(/<[^>]*>/g, "").length < 50) {
      err.detail = "รายละเอียดต้องมีอย่างน้อย 50 ตัวอักษร";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      let coverBase64 = "";
      if (coverImage) {
        coverBase64 = coverImage instanceof File ? await fileToBase64(coverImage) : coverImage;
      }

      const galleryBase64 = await Promise.all(
        articleImages.map(async (file) => {
          return file instanceof File ? await fileToBase64(file) : file;
        })
      );

      const payload = {
        articleTitle: articleTitle.trim(),
        articleCategory,
        articleDetail,
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
          toastMessage: id ? "บันทึกการแก้ไขบทความสำเร็จ" : "เผยแพร่บทความสำเร็จ",
        },
      });
    } catch (error) {
      console.error("ไม่สามารถบันทึกบทความได้", error);
      setErrors((prev) => ({
        ...prev,
        submit:
          error.response?.data?.message ||
          error.response?.data ||
          "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
      }));
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
          <label>รูปภาพหน้าปกบทความ</label>
          <label className="cover-box">
            {coverImage ? (
              <img src={renderImageSrc(coverImage)} alt="Cover Preview" />
            ) : (
              <>
                <span>คลิกเพื่ออัปโหลดรูปหน้าปก</span>
                <small>png jpg jpeg ไม่เกิน 5MB</small>
              </>
            )}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleCoverUpload}
            />
          </label>
          {errors.cover && <p className="error-message">{errors.cover}</p>}

          <label>หัวข้อบทความ *</label>
          <input
            className="gov-input-field"
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            placeholder="ระบุหัวข้อบทความ"
          />
          {errors.title && <p className="error-message">{errors.title}</p>}

          <label>หมวดหมู่</label>
          <select
            className="gov-input-field"
            value={articleCategory}
            onChange={(e) => setArticleCategory(e.target.value)}
          >
            <option>ข่าวประชาสัมพันธ์</option>
            <option>กิจกรรมสุขภาพ</option>
            <option>โปรโมชั่น</option>
          </select>

          <label>รูปภาพประกอบ (สูงสุด 4 รูป)</label>
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
          {errors.images && <p className="error-message">{errors.images}</p>}

          <label>รายละเอียดบทความ *</label>
          
          {/* (1) อัปเดตใส่ type="button" ให้ปุ่มใน Toolbar ป้องกันปัญหาเมื่อใช้ tag <form> ครอบทีหลัง */}
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
            key={id || "create"}
            className="article-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setArticleDetail(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: articleDetail }}
          ></div>
          {errors.detail && <p className="error-message">{errors.detail}</p>}
          {errors.submit && <p className="error-message">{errors.submit}</p>}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
              ยกเลิก
            </button>

            <button type="button" className="btn-save" onClick={handleSubmit}>
              {id ? "บันทึกการแก้ไข" : "เผยแพร่บทความ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateOfficialArticle;