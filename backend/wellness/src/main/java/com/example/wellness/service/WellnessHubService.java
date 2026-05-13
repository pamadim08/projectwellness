package com.example.wellness.service;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.WellnessHubRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class WellnessHubService {

    @Autowired
    private WellnessHubRepository wellnessHubRepository;

    // ดึงข้อมูลทั้งหมด
    public List<WellnessHub> getAllHubs() {
        return wellnessHubRepository.findAll();
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