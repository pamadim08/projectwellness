package com.example.wellness.controller;

import com.example.wellness.dto.MainRouteDTO;
import com.example.wellness.model.MainRoute;
import com.example.wellness.service.MainRouteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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
@CrossOrigin(origins = "http://localhost:3000")
public class MainRouteController {

    private final MainRouteService mainRouteService;

    public MainRouteController(MainRouteService mainRouteService) {
        this.mainRouteService = mainRouteService;
    }

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
    public ResponseEntity<?> getMainRouteById(@PathVariable Integer id) {
        MainRoute route = mainRouteService.getMainRouteById(id);
        if (route == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "ไม่พบข้อมูลเส้นทาง"));
        }
        return ResponseEntity.ok(route);
    }

    // 🟢 เส้นทางรับข้อมูลชุดใหม่ [POST]
    @PostMapping
    public ResponseEntity<?> createMainRoute(@RequestBody Map<String, Object> payload) {
        try {
            MainRoute saved = mainRouteService.createMainRoute(payload);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "บันทึกเส้นทางไม่สำเร็จ กรุณาลองอีกครั้ง"));
        }
    }

    // 🟡 เส้นทางรับข้อมูลอัปเดตทับรายการเดิม [PUT]
    @PutMapping("/{id}")
    public ResponseEntity<?> editMainRoute(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload) {
        try {
            MainRoute updated = mainRouteService.editMainRoute(id, payload);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "ไม่พบข้อมูลเส้นทาง"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "ไม่สามารถแก้ไขข้อมูลเส้นทางหลักได้ กรุณาลองใหม่อีกครั้ง"));
        }
    }

    // 🗑️ ลบข้อมูลเส้นทาง [DELETE]
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMainRoute(@PathVariable Integer id) {
        try {
            boolean isDeleted = mainRouteService.deleteMainRoute(id);
            if (isDeleted) {
                return ResponseEntity.ok("🗑️ ระบบได้ทำการลบข้อมูลเส้นทางสุขภาพหลักออกจากระบบเรียบร้อยแล้ว");
            }
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("❌ ไม่พบรหัสไอดีเส้นทางท่องเที่ยวที่ต้องการลบ");
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("❌ เกิดข้อผิดพลาดของโครงสร้างฐานข้อมูลในการถอนสิทธิ์: " + e.getMessage());
        }
    }

    // 🖼️ อัปโหลดรูปภาพเส้นทาง
    // บันทึกไฟล์จริงไปที่ uploads/routes/
    // และคืน filename เพื่อเอาไปเก็บใน main_routes.route_image
    @PostMapping("/upload-image")
    public ResponseEntity<?> uploadRouteImage(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("message", "No file provided"));
            }

            long maxBytes = 20L * 1024L * 1024L;

            if (file.getSize() > maxBytes) {
                return ResponseEntity
                        .status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body(Map.of("message", "File too large (Max 20MB)"));
            }

            String contentType = file.getContentType();

            if (contentType == null ||
                    !(contentType.equals("image/jpeg") ||
                            contentType.equals("image/png"))) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("message", "Invalid file type (Only JPG and PNG are supported)"));
            }

            String uploadsDir = "uploads/routes";
            File dir = new File(uploadsDir);

            if (!dir.exists()) {
                boolean created = dir.mkdirs();
                if (!created && !dir.exists()) {
                    return ResponseEntity
                            .status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("message", "Cannot create upload directory"));
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

            file.transferTo(target.toFile());

            return ResponseEntity.ok(Map.of("filename", filename));

        } catch (IOException ioException) {
            ioException.printStackTrace();
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to save file"));

        } catch (Exception exception) {
            exception.printStackTrace();
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", exception.getMessage() != null
                            ? exception.getMessage()
                            : "Upload failed"));
        }
    }

    /*

    =======MOBILE=============
    ==========================

     */

    @GetMapping("/user")
    public ResponseEntity<?> listMainRouteUser() {
        try {
            List<MainRouteDTO> routes = mainRouteService.listMainRouteUser();
            return ResponseEntity.ok(routes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET /v1/main-routes/{id} — ดึงตาม id
    @GetMapping("user/{id}")
    public ResponseEntity<?> getRouteById(@PathVariable Integer id) {
        try {
            MainRouteDTO route = mainRouteService.getRouteById(id);
            return ResponseEntity.ok(route);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

}