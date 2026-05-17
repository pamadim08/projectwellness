package com.example.wellness.service;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.WellnessHubRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class WellnessHubService {

    @Autowired
    private WellnessHubRepository wellnessHubRepository;

    // ดึงข้อมูลทั้งหมด
    public List<WellnessHub> getAllHubs() {
        return wellnessHubRepository.findAll();
    }

    // 2. เมธอดสำหรับรับค่าฟิลเตอร์มาทำหน้าที่กรองข้อมูล
    public List<WellnessHub> searchWellnessHubs(Map<String, Object> payload) {
        // ดักจับกรณีหน้าบ้านไม่ได้ส่ง Object เงื่อนไขอะไรมาเลย ให้คืนค่าทั้งหมดทันที
        if (payload == null) {
            return getAllHubs();
        }

        // ยูสเคสข้อ 4: แกะข้อมูลเงื่อนไขออกจาก payload
        String keyword = payload.get("search") != null ? payload.get("search").toString().trim() : null;
        String categoryIdStr = payload.get("categoryId") != null ? payload.get("categoryId").toString() : null;
        String districtIdStr = payload.get("districtId") != null ? payload.get("districtId").toString() : null;

        // ยูสเคสข้อ 5: เรียกใช้ getAllHubs() มาแปลงเป็น Stream เพื่อกรองข้อมูลเหมือนตอนทำ JSP
        return getAllHubs().stream()
                // 5.1: เงื่อนไขที่ 1 - ค้นหาจากคำบางส่วนของชื่อสถานประกอบการ
                .filter(w -> keyword == null || keyword.isEmpty() || 
                        (w.getWellnessHubName() != null && w.getWellnessHubName().toLowerCase().contains(keyword.toLowerCase())))
                
                // 5.1: เงื่อนไขที่ 2 - กรองตามหมวดหมู่ (Category ID)
                .filter(w -> categoryIdStr == null || categoryIdStr.isEmpty() || 
                        (w.getCategory() != null && w.getCategory().getCategoryId().toString().equals(categoryIdStr)))
                
                // 5.1: เงื่อนไขที่ 3 - กรองตามรายชื่ออำเภอ (District ID)
                .filter(w -> districtIdStr == null || districtIdStr.isEmpty() || 
                        (w.getDistrict() != null && w.getDistrict().getDistrictId().toString().equals(districtIdStr)))
                
                .toList(); // 5.2: รวบรวมคืนค่ากลับเป็นรายการที่กรองเสร็จแล้ว
    }
    // ดึงข้อมูลรายร้านตาม ID
    public WellnessHub getHubById(Integer id) {
        return wellnessHubRepository.findById(id).orElse(null);
    }

    // บันทึกข้อมูลใหม่ (เดี๋ยวอนาคตเรามาใส่โค้ดเข้ารหัสรหัสผ่านตรงนี้)
    public WellnessHub saveHub(WellnessHub hub) {
        return wellnessHubRepository.save(hub);
    }
}