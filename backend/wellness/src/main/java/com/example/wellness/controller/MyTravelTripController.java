package com.example.wellness.controller;

import com.example.wellness.dto.CreateTripRequest;
import com.example.wellness.dto.MyTravelTripDTO;
import com.example.wellness.dto.PagedResult;
import com.example.wellness.dto.UpdateTripRequest;
import com.example.wellness.service.MyTravelTripService;
import com.example.wellness.service.WellnessHubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/my-travel-trips")
@RequiredArgsConstructor
public class MyTravelTripController {

    private final MyTravelTripService myTravelTripService;
    private final WellnessHubService wellnessHubService;

    // POST — สร้างเส้นทาง
    @PostMapping
    public ResponseEntity<?> createTrip(@RequestBody CreateTripRequest request) {
        try {
            Integer tripId = myTravelTripService.createTrip(request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "สร้างเส้นทางสำเร็จ",
                    "travelTripId", tripId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // GET — ดึง hub ตามเส้นทาง
    @GetMapping("/route-hubs")
    public ResponseEntity<?> getHubsAlongRoute(
            @RequestParam Integer originDistrictId,
            @RequestParam Integer destinationDistrictId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            PagedResult result = wellnessHubService.getHubsAlongRoute(
                    originDistrictId, destinationDistrictId, page, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET — ดึงรายการ trip ของ member
    @GetMapping
    public ResponseEntity<?> getMyTrips(@RequestParam Integer memberId) {
        try {
            List<MyTravelTripDTO> trips = myTravelTripService.getMyTrips(memberId);
            return ResponseEntity.ok(trips);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // GET — ดึง trip เดียวแบบเปิดกว้าง ไม่เช็คสิทธิ์เจ้าของ 🆕
    // ใช้ตอนดู preview trip ที่แนบมากับบทความของคนอื่น ก่อนตัดสินใจคัดลอก
    @GetMapping("/{tripId}")
    public ResponseEntity<?> getTripById(@PathVariable Integer tripId) {
        try {
            MyTravelTripDTO trip = myTravelTripService.getTripById(tripId);
            return ResponseEntity.ok(trip);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // POST — คัดลอกเส้นทางของคนอื่นเข้าบัญชีตัวเอง 🆕
    @PostMapping("/{tripId}/duplicate")
    public ResponseEntity<?> duplicateTrip(
            @PathVariable Integer tripId,
            @RequestParam Integer memberId) {
        try {
            Integer newTripId = myTravelTripService.duplicateTrip(tripId, memberId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "คัดลอกเส้นทางสำเร็จ",
                    "travelTripId", newTripId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // PUT — แก้ไข trip (ชื่อ/คำอธิบาย/รายการ hub) 🆕
    @PutMapping("/{tripId}")
    public ResponseEntity<?> updateTrip(
            @PathVariable Integer tripId,
            @RequestBody UpdateTripRequest request) {
        try {
            myTravelTripService.updateTrip(tripId, request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "แก้ไขเส้นทางสำเร็จ"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // DELETE — ลบ trip
    @DeleteMapping("/{tripId}")
    public ResponseEntity<?> deleteTrip(
            @PathVariable Integer tripId,
            @RequestParam Integer memberId) {
        try {
            myTravelTripService.deleteTrip(tripId, memberId);
            return ResponseEntity.ok("ลบเส้นทางสำเร็จ");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}