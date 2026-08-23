package com.example.wellness.controller;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wellness-hubs")
@CrossOrigin(origins = "http://localhost:3000")
public class WellnessHubController {

    private final WellnessHubService wellnessHubService;

    public WellnessHubController(
            WellnessHubService wellnessHubService) {
        this.wellnessHubService = wellnessHubService;
    }

    /*
     * =====================================================
     * ดึงรายการทั้งหมด
     * =====================================================
     *
     * Service จะรวมข้อมูลจาก:
     * - wellness_hubs
     * - emergency_services
     */
    @GetMapping
    public ResponseEntity<List<WellnessHub>> listWellnessHub() {
        List<WellnessHub> results = wellnessHubService.listWellnessHub();

        return ResponseEntity.ok(results);
    }

    /*
     * =====================================================
     * ค้นหาสถานประกอบการ
     * =====================================================
     *
     * รองรับทั้ง Wellness Hub และ Emergency Service
     */
    @PostMapping("/search")
    public ResponseEntity<List<WellnessHub>> listWellnessHub(
            @RequestBody(required = false) Map<String, Object> payload) {
        List<WellnessHub> results = wellnessHubService
                .listWellnessHub(payload);

        return ResponseEntity.ok(results);
    }

    /*
     * =====================================================
     * ดูรายละเอียดตามเลขใบอนุญาต
     * =====================================================
     *
     * Service จะตรวจทั้งสองตาราง
     */
    @GetMapping("/{id}")
    public ResponseEntity<WellnessHub> viewWellnessHubDetail(
            @PathVariable Integer id) {
        WellnessHub result = wellnessHubService.viewWellnessHubDetail(id);

        if (result == null) {
            return ResponseEntity
                    .notFound()
                    .build();
        }

        return ResponseEntity.ok(result);
    }

    /*
     * =====================================================
     * สร้างสถานประกอบการ
     * =====================================================
     *
     * หมวดทั่วไป:
     * -> wellness_hubs
     *
     * EM01 / EM02:
     * -> emergency_services
     */
    @PostMapping
    public ResponseEntity<?> createWellnessHub(
            @RequestBody WellnessHub hub) {
        try {
            WellnessHub createdHub = wellnessHubService
                    .createWellnessHub(hub);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(createdHub);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    exception.getMessage()));
        }
    }

    /*
     * =====================================================
     * แก้ไขสถานประกอบการ
     * =====================================================
     *
     * รองรับ:
     * - Wellness -> Wellness
     * - Wellness -> Emergency
     * - Emergency -> Emergency
     * - Emergency -> Wellness
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> editWellnessHub(
            @PathVariable Integer id,
            @RequestBody WellnessHub hub) {
        try {
            WellnessHub updatedHub = wellnessHubService
                    .editWellnessHub(
                            id,
                            hub);

            if (updatedHub == null) {
                return ResponseEntity
                        .notFound()
                        .build();
            }

            return ResponseEntity.ok(updatedHub);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    exception.getMessage()));
        }
    }

    /*
     * =====================================================
     * ลบสถานประกอบการ
     * =====================================================
     *
     * Service จะตรวจว่าอยู่ตารางใดแล้วลบให้ถูกต้อง
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Integer id) {
        try {
            boolean deleted = wellnessHubService
                    .deleteWellnessHub(id);

            if (!deleted) {
                return ResponseEntity
                        .notFound()
                        .build();
            }

            return ResponseEntity
                    .noContent()
                    .build();

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "message",
                                    exception.getMessage()));
        }
    }

    /*
     * เปิดใช้ชั่วคราวเมื่อต้องการสั่ง Migration เอง
     *
     * หลัง Migration สำเร็จ ควรปิด Endpoint นี้
     */
    // @PostMapping("/migrate-old-links")
    // public ResponseEntity<Map<String, Object>>
    // runMigration() {
    //
    // wellnessHubService
    // .migrateOldGoogleMapsLinks();
    //
    // return ResponseEntity.ok(
    // Map.of(
    // "status", "completed",
    // "message",
    // "ตรวจสอบและอัปเดตพิกัดเรียบร้อยแล้ว"
    // )
    // );
    // }
}