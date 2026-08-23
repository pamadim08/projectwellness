package com.example.wellness.controller;

import com.example.wellness.model.District;
import com.example.wellness.service.DistrictService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/districts")
@CrossOrigin(origins = "http://localhost:3000")
public class DistrictController {

    @Autowired
    private DistrictService districtService;

    @GetMapping
    public List<District> listAlldistrict() {
        return districtService.listAlldistrict();
    }
}