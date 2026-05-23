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

    //ยูสเคสข้อ 4-5: รับเงื่อนไขการค้นหาในรูปแบบ JSON Body ผ่านตัวแปร Map
    @PostMapping("/search")
    public ResponseEntity<List<WellnessHub>> getFilteredWellnessHubs(@RequestBody Map<String, Object> payload) {
        List<WellnessHub> results = wellnessHubService.searchWellnessHubs(payload);
        return ResponseEntity.ok(results);
    }
    @GetMapping("/{id}")
    public WellnessHub getById(@PathVariable Integer id) {
        return wellnessHubService.getHubById(id);
    }
    
    @PostMapping
    public WellnessHub create(@RequestBody WellnessHub hub) {
        return wellnessHubService.createWellnessHub(hub);
    }
}