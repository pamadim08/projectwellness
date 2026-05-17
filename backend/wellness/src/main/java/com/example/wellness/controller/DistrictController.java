package com.example.wellness.controller;

import com.example.wellness.model.District;
import com.example.wellness.repository.DistrictRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/districts")
@CrossOrigin(origins = "http://localhost:3000")
public class DistrictController {

    @Autowired
    private DistrictRepository districtRepository;

    @GetMapping
    public List<District> getAllDistricts() {
        return districtRepository.findAll(); // ดึงรายชื่ออำเภอทั้งหมดส่งกลับไปเป็นอาเรย์ให้ React
    }
}