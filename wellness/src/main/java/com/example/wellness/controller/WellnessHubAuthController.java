package com.example.wellness.controller;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/wellness-hub-auth")
@CrossOrigin(origins = "http://localhost:3000")
public class WellnessHubAuthController {

    @Autowired
    private WellnessHubAuthService service;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody WellnessHub request) {

        Map<String, Object> response = service.login(
                request.getUsername(),
                request.getPassword());

        return ResponseEntity.ok(response);
    }

}