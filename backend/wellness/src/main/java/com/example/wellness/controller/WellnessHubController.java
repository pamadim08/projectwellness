package com.example.wellness.controller;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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

    @GetMapping("/{id}")
    public WellnessHub getById(@PathVariable Integer id) {
        return wellnessHubService.getHubById(id);
    }
    
    @PostMapping
    public WellnessHub create(@RequestBody WellnessHub hub) {
        return wellnessHubService.saveHub(hub);
    }
}