package com.example.wellness.controller;

import com.example.wellness.model.MainRoute;
import com.example.wellness.service.MainRouteService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/main-routes")
public class MainRouteController {

        @Autowired
        private MainRouteService mainRouteService;

        // 🏛️ [GET] /api/main-routes
        // ดึงข้อมูลสรุปสถิติจำนวนเวลเนสและรายชื่ออำเภอผ่านตัวแปรแบบ Map
        @GetMapping
        public ResponseEntity<List<Map<String, Object>>> listMainRoute() {
                try {
                        List<Map<String, Object>> summaryList = mainRouteService.listMainRoute();

                        return ResponseEntity.ok(summaryList);

                } catch (Exception e) {
                        e.printStackTrace();

                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(null);
                }
        }

        // 🏛️ [GET] /api/main-routes/{id}
        // ค้นหาเส้นทางเจาะจงรายไอดี
        @GetMapping("/{id}")
        public MainRoute getMainRouteById(
                        @PathVariable Integer id) {

                return mainRouteService.getMainRouteById(id);
        }

        // 🟢 เส้นทางรับข้อมูลชุดใหม่ [POST]
        @PostMapping
        public ResponseEntity<?> createMainRoute(
                        @RequestBody Map<String, Object> payload) {

                try {
                        MainRoute saved = mainRouteService.createMainRoute(payload);

                        return ResponseEntity.ok(saved);

                } catch (Exception e) {
                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(
                                                        "❌ ไม่สามารถดำเนินการสร้างบันทึกใหม่ได้: "
                                                                        + e.getMessage());
                }
        }

        // 🟡 เส้นทางรับข้อมูลอัปเดตทับรายการเดิม [PUT]
        @PutMapping("/{id}")
        public ResponseEntity<?> editMainRoute(
                        @PathVariable Integer id,
                        @RequestBody Map<String, Object> payload) {

                try {
                        MainRoute updated = mainRouteService.editMainRoute(
                                        id,
                                        payload);

                        if (updated != null) {
                                return ResponseEntity.ok(updated);
                        }

                        return ResponseEntity
                                        .status(HttpStatus.NOT_FOUND)
                                        .body(
                                                        "❌ ไม่พบข้อมูลเส้นทางเก่าที่ระบุไอดีเข้ามาแก้ไข");

                } catch (Exception e) {
                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(
                                                        "❌ ไม่สามารถบันทึกทับรายการเก่าได้: "
                                                                        + e.getMessage());
                }
        }

        // 🗑️ ลบข้อมูลเส้นทาง [DELETE]
        @DeleteMapping("/{id}")
        public ResponseEntity<?> deleteMainRoute(
                        @PathVariable Integer id) {

                try {
                        boolean isDeleted = mainRouteService.deleteMainRoute(id);

                        if (isDeleted) {
                                return ResponseEntity.ok(
                                                "🗑️ ระบบได้ทำการลบข้อมูลเส้นทางสุขภาพหลักออกจากระบบเรียบร้อยแล้ว");
                        }

                        return ResponseEntity
                                        .status(HttpStatus.NOT_FOUND)
                                        .body(
                                                        "❌ ไม่พบรหัสไอดีเส้นทางท่องเที่ยวที่ต้องการลบ");

                } catch (Exception e) {
                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(
                                                        "❌ เกิดข้อผิดพลาดของโครงสร้างฐานข้อมูลในการถอนสิทธิ์: "
                                                                        + e.getMessage());
                }
        }

        // 🖼️ อัปโหลดรูปภาพเส้นทาง
        // บันทึกไฟล์จริงไปที่ uploads/routes/
        // และคืน filename เพื่อเอาไปเก็บใน main_routes.route_image
        @PostMapping("/upload-image")
        public ResponseEntity<?> uploadRouteImage(
                        @RequestParam("file") MultipartFile file) {

                try {
                        if (file == null || file.isEmpty()) {
                                return ResponseEntity
                                                .badRequest()
                                                .body(
                                                                Map.of(
                                                                                "message",
                                                                                "No file provided"));
                        }

                        long maxBytes = 5L * 1024L * 1024L;

                        if (file.getSize() > maxBytes) {
                                return ResponseEntity
                                                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                                                .body(
                                                                Map.of(
                                                                                "message",
                                                                                "File too large"));
                        }

                        String contentType = file.getContentType();

                        if (contentType == null ||
                                        !(contentType.equals("image/jpeg") ||
                                                        contentType.equals("image/png") ||
                                                        contentType.equals("image/webp"))) {
                                return ResponseEntity
                                                .badRequest()
                                                .body(
                                                                Map.of(
                                                                                "message",
                                                                                "Invalid file type"));
                        }

                        String uploadsDir = "uploads/routes";

                        File dir = new File(uploadsDir);

                        if (!dir.exists()) {
                                boolean created = dir.mkdirs();

                                if (!created && !dir.exists()) {
                                        return ResponseEntity
                                                        .status(
                                                                        HttpStatus.INTERNAL_SERVER_ERROR)
                                                        .body(
                                                                        Map.of(
                                                                                        "message",
                                                                                        "Cannot create upload directory"));
                                }
                        }

                        String originalFilename = file.getOriginalFilename() == null
                                        ? "file"
                                        : file.getOriginalFilename();

                        String extension = "";

                        int dotIndex = originalFilename.lastIndexOf('.');

                        if (dotIndex >= 0) {
                                extension = originalFilename.substring(dotIndex);
                        }

                        String filename = System.currentTimeMillis()
                                        + "-"
                                        + UUID.randomUUID()
                                        + extension;

                        Path target = Paths.get(uploadsDir)
                                        .resolve(filename)
                                        .toAbsolutePath()
                                        .normalize();

                        file.transferTo(
                                        target.toFile());

                        return ResponseEntity.ok(
                                        Map.of(
                                                        "filename",
                                                        filename));

                } catch (IOException ioException) {
                        ioException.printStackTrace();

                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        "Failed to save file"));

                } catch (Exception exception) {
                        exception.printStackTrace();

                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        exception.getMessage() != null
                                                                                        ? exception.getMessage()
                                                                                        : "Upload failed"));
                }
        }
}