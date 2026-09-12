package com.example.wellness.controller;

import com.example.wellness.dto.PagedResult;
import com.example.wellness.dto.ResponseObject;
import com.example.wellness.dto.WellnessHubDTO;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

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
     * สร้างรหัสและชื่อผู้ใช้งานอัตโนมัติสำหรับเพิ่มสถานประกอบการ
     * =====================================================
     */
    @GetMapping("/next-license-id")
    public ResponseEntity<?> getNextLicenseId() {
        Integer nextId = wellnessHubService.generateNextLicenseId();
        String username = "WH_" + nextId;
        return ResponseEntity.ok(Map.of(
                "licenseId", nextId,
                "username", username
        ));
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

    /*

    =========== MOBILE ===================================

     */


    @GetMapping("/user")
    public ResponseEntity<ResponseObject> getAllWellnessHubs() {
        try {
            List<WellnessHubDTO> dtos = wellnessHubService.getWellnessHubs();
            return new ResponseEntity<>(new ResponseObject(true, "ดึงข้อมูลสถานประกอบการทั้งหมดสำเร็จ", dtos), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(new ResponseObject(false, "เกิดข้อผิดพลาดในการดึงข้อมูล", null), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // 2. ดึงข้อมูลรายร้านตาม ID
    @GetMapping("/user/{id}")
    public ResponseEntity<ResponseObject> getWellnessHubDetail(@PathVariable Integer id) {
        try {
            WellnessHubDTO dto = wellnessHubService.getWellnessHubDetail(id);
            return new ResponseEntity<>(new ResponseObject(true, "ดึงข้อมูลสถานประกอบการรหัส " + id + " สำเร็จ", dto), HttpStatus.OK);
        } catch (Exception e) {
            if (e instanceof NoSuchElementException) {
                return new ResponseEntity<>(new ResponseObject(false, "ไม่พบข้อมูลสถานประกอบการที่ระบุ", null), HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(new ResponseObject(false, "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", null), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ✅ เปลี่ยนเป็น DTO เหมือน endpoint อื่น
    // แทนที่ /search เดิม หรือเพิ่ม endpoint ใหม่
    @GetMapping("/search")
    public ResponseEntity<ResponseObject> searchHubs(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) Integer districtId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        try {
            PagedResult result = wellnessHubService
                    .searchWellnessHub(keyword, categoryId, districtId, page, size);
            return new ResponseEntity<>(
                    new ResponseObject(true, "ค้นหาสำเร็จ", result),
                    HttpStatus.OK
            );
        } catch (Exception e) {
            return new ResponseEntity<>(
                    new ResponseObject(false, "เกิดข้อผิดพลาดในการค้นหา", null),
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // เพิ่มใน WellnessHubController ที่มีอยู่แล้ว

    @PostMapping("/favorite")
    public ResponseEntity<?> addToFavorite(
            @RequestParam Integer memberId,
            @RequestParam Integer licenseId) {
        try {
            wellnessHubService.addToFavorite(memberId, licenseId);
            return ResponseEntity.ok("เพิ่มรายการโปรดสำเร็จ");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/favorite")
    public ResponseEntity<?> removeFromFavorite(
            @RequestParam Integer memberId,
            @RequestParam Integer licenseId) {
        wellnessHubService.removeFromFavorite(memberId, licenseId);
        return ResponseEntity.ok("ลบรายการโปรดสำเร็จ");
    }

    @GetMapping("/favorite")
    public ResponseEntity<?> getListFavorite(@RequestParam Integer memberId) {
        return ResponseEntity.ok(wellnessHubService.getListFavorite(memberId));
    }

    @GetMapping("/favorite/check")
    public ResponseEntity<?> checkFavorite(
            @RequestParam Integer memberId,
            @RequestParam Integer licenseId) {
        return ResponseEntity.ok(wellnessHubService.isFavorite(memberId, licenseId));
    }


    @GetMapping("/route")
    public ResponseEntity<PagedResult> getHubsForRoute(
            @RequestParam Integer originId,
            @RequestParam Integer destId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PagedResult result = wellnessHubService.getHubsAlongRoute(originId, destId, page, size);
        return ResponseEntity.ok(result);
    }


    @GetMapping("/by-districts")
    public ResponseEntity<?> getHubsByDistricts(
            @RequestParam String districtId,
            @RequestParam(required = false) String categoryId) {
        try {
            List<Integer> ids = Arrays.stream(districtId.split(","))
                    .map(Integer::parseInt)
                    .collect(Collectors.toList());

            List<String> catIds = (categoryId != null && !categoryId.isEmpty())
                    ? Arrays.asList(categoryId.split(","))
                    : null;

            List<WellnessHubDTO> result = wellnessHubService
                    .getHubsByDistricts(ids, catIds);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }
}