package com.example.wellness.controller;

import com.example.wellness.model.MainRoute;
import com.example.wellness.service.MainRouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/main-routes")
@CrossOrigin(origins = "http://localhost:3000") // ซิงค์เชื่อมโยงเปิดสิทธิ์ให้หน้าบ้าน React ยิงขอข้อมูลสำเร็จ
public class MainRouteController {

    @Autowired
    private MainRouteService mainRouteService;

    // 🏛️ [GET] /api/main-routes -> 🌟 ปรับปรุงใหม่: ให้ดึงข้อมูลสรุปสถิติจำนวนเวลเนสและรายชื่ออำเภอผ่านตัวแปรแบบ Map ไปพ่นลงตารางหน้ารวม
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllMainRoutes() {
        try {
            List<Map<String, Object>> summaryList = mainRouteService.getAllMainRoutesForList();
            return ResponseEntity.ok(summaryList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // 🏛️ [GET] /api/main-routes/{id} -> ค้นหาเส้นทางเจาะจงรายไอดี
    @GetMapping("/{id}")
    public MainRoute getMainRouteById(@PathVariable Integer id) {
        return mainRouteService.getMainRouteById(id);
    }

    

    // 🟢 เส้นทางรับข้อมูลชุดใหม่ [POST]
    @PostMapping
    public ResponseEntity<?> createRoute(@RequestBody Map<String, Object> payload) {
        try {
            MainRoute saved = mainRouteService.createMainRoute(payload);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ ไม่สามารถดำเนินการสร้างบันทึกใหม่ได้: " + e.getMessage());
        }
    }

    // 🟡 เส้นทางรับข้อมูลอัปเดตทับรายการเดิม [PUT]
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoute(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            MainRoute updated = mainRouteService.updateMainRoute(id, payload);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.status(404).body("❌ ไม่พบข้อมูลเส้นทางเก่าที่ระบุไอดีเข้ามาแก้ไข");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ ไม่สามารถบันทึกทับรายการเก่าได้: " + e.getMessage());
        }
    }

    // 🗑️ 🌟 เพิ่มเมธอดลบข้อมูลเส้นทาง [DELETE] -> ดักจับคำขอเพื่อถอนรากถอนโคนข้อมูลพร้อมแสดงป๊อบอัพลอยฝั่ง React
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoute(@PathVariable Integer id) {
        try {
            boolean isDeleted = mainRouteService.deleteMainRoute(id);
            if (isDeleted) {
                return ResponseEntity.ok("🗑️ ระบบได้ทำการลบข้อมูลเส้นทางสุขภาพหลักออกจากระบบเรียบร้อยแล้ว");
            }
            return ResponseEntity.status(404).body("❌ ไม่พบรหัสไอดีเส้นทางท่องเที่ยวที่แอดมินต้องการลบ");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ เกิดข้อผิดพลาดของโครงสร้างฐานข้อมูลในการถอนสิทธิ์: " + e.getMessage());
        }
    }
}