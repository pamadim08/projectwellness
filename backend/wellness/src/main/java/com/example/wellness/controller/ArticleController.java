package com.example.wellness.controller;

import com.example.wellness.dto.ArticleDTO;
import com.example.wellness.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping
    public ResponseEntity<?> getAllArticles() {
        try {
            List<ArticleDTO> articles = articleService.getAllArticles();
            return ResponseEntity.ok(articles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET — ค้นหาบทความตามเนื้อหาหรือชื่อผู้โพสต์
    @GetMapping("/search")
    public ResponseEntity<?> searchArticles(@RequestParam(required = false) String keyword) {
        try {
            List<ArticleDTO> articles = articleService.searchArticles(keyword);
            return ResponseEntity.ok(articles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET — กรองบทความตามหมวดหมู่และ/หรืออำเภอ (คำนวณสดจากเส้นทางที่แนบ) 🆕
    // ไม่ส่งพารามิเตอร์ใดเลย = ได้เฉพาะบทความที่มี trip แนบ (ต่างจาก /articles เฉยๆ ที่ได้ทุกบทความ)
    @GetMapping("/filter")
    public ResponseEntity<?> filterArticles(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) Integer districtId) {
        try {
            List<ArticleDTO> articles = articleService.filterArticles(categoryId, districtId);
            return ResponseEntity.ok(articles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET — บทความของ member คนนั้นๆ เท่านั้น (หน้า "บทความของฉัน")
    @GetMapping("/my")
    public ResponseEntity<?> getMyArticles(@RequestParam Integer memberId) {
        try {
            List<ArticleDTO> articles = articleService.getMyArticles(memberId);
            return ResponseEntity.ok(articles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // POST — สร้างบทความใหม่ (multipart/form-data เพราะมีไฟล์รูปแนบมาด้วย)
    // 🆕 travelTripId บังคับต้องส่งมาเสมอ (ไม่ required=false อีกต่อไป)
    // 🆕 ไม่รับ categoryId แล้ว — หมวดหมู่คำนวณจากเส้นทางที่แนบให้อัตโนมัติ
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createArticle(
            @RequestParam Integer memberId,
            @RequestParam String content,
            @RequestParam Integer travelTripId,
            @RequestParam(required = false) List<MultipartFile> images) {
        try {
            Integer articleId = articleService.createArticle(memberId, content, travelTripId, images);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "โพสต์บทความสำเร็จ",
                    "articleId", articleId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // PUT — แก้ไขบทความ (multipart/form-data เพราะอาจมีไฟล์รูปใหม่แนบมาด้วย)
    // 🆕 travelTripId บังคับต้องส่งมาเสมอ ไม่รับ categoryId แล้ว
    @PutMapping(value = "/{articleId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateArticle(
            @PathVariable Integer articleId,
            @RequestParam Integer memberId,
            @RequestParam String content,
            @RequestParam Integer travelTripId,
            @RequestParam(required = false) List<String> existingImages,
            @RequestParam(required = false) List<MultipartFile> newImages) {
        try {
            articleService.updateArticle(articleId, memberId, content,
                    travelTripId, existingImages, newImages);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "แก้ไขบทความสำเร็จ"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // DELETE — ลบบทความ (ต้องเป็นเจ้าของเท่านั้น)
    @DeleteMapping("/{articleId}")
    public ResponseEntity<?> deleteArticle(
            @PathVariable Integer articleId,
            @RequestParam Integer memberId) {
        try {
            articleService.deleteArticle(articleId, memberId);
            return ResponseEntity.ok("ลบบทความสำเร็จ");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}