package com.example.wellness.controller;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/wellness-hubs")
@CrossOrigin(origins = "http://localhost:3000")
public class WellnessHubController {

    @Autowired
    private WellnessHubService wellnessHubService;

    @GetMapping
    public List<WellnessHub> getAll() {
        return wellnessHubService.getAllHubs();
    }

    // ยูสเคสข้อ 4-5: รับเงื่อนไขการค้นหาในรูปแบบ JSON Body ผ่านตัวแปร Map
    @PostMapping("/search")
    public ResponseEntity<List<WellnessHub>> getFilteredWellnessHubs(@RequestBody Map<String, Object> payload) {
        List<WellnessHub> results = wellnessHubService.searchWellnessHubs(payload);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    public WellnessHub getById(@PathVariable Integer id) {
        return wellnessHubService.getHubById(id);
    }

    // 🌟 ➕ จุดที่เพิ่มใหม่: สร้าง API Endpoint
    // เพื่อให้กดสั่งแปลงข้อมูลจากข้างนอกได้ตลอดเวลา
    // @PostMapping("/migrate-old-links")
    // public ResponseEntity<Map<String, Object>> runMigration() {
    // wellnessHubService.migrateOldGoogleMapsLinks();
    // Map<String, Object> report = new HashMap<>();
    // report.put("status", "completed");
    // return ResponseEntity.ok(report);
    // }

    @PostMapping
    public WellnessHub create(@RequestBody WellnessHub hub) {
        return wellnessHubService.createWellnessHub(hub);
    }

    @PutMapping("/{id}")
    public ResponseEntity<WellnessHub> update(@PathVariable Integer id, @RequestBody WellnessHub hub) {
        WellnessHub updatedHub = wellnessHubService.updateWellnessHub(id, hub);
        if (updatedHub == null) {
            // ส่งสเตตัส 404 บ่งบอกไม่สำเร็จตาม Alternate Flow
            // "ไม่สามารถแก้ไขข้อมูลสถานประกอบการได้"
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updatedHub);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean isDeleted = wellnessHubService.deleteWellnessHub(id);
        if (!isDeleted) {
            // คืนค่า 404 หากไม่พบ ID ที่ต้องการลบ
            return ResponseEntity.notFound().build();
        }
        // คืนค่า 204 No Content หรือ 200 OK แสดงว่าลบสำเร็จ
        return ResponseEntity.noContent().build();
    }
}