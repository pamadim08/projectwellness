package com.example.wellness.controller;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.service.WellnessHubAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/wellness-hub-auth")
@CrossOrigin(origins = "http://localhost:3000")
public class WellnessHubAuthController {

    private final WellnessHubAuthService service;

    public WellnessHubAuthController(WellnessHubAuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody WellnessHub request) {
        Map<String, Object> response = service.login(
                request.getUsername(),
                request.getPassword());

        return ResponseEntity.ok(response);
    }
}