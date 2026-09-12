package com.example.wellness.service;

import com.example.wellness.model.EmergencyService;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.EmergencyServiceRepository;
import com.example.wellness.repository.WellnessHubRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class WellnessHubAuthService {

    private final WellnessHubRepository wellnessHubRepository;
    private final EmergencyServiceRepository emergencyServiceRepository;

    public WellnessHubAuthService(
            WellnessHubRepository wellnessHubRepository,
            EmergencyServiceRepository emergencyServiceRepository) {
        this.wellnessHubRepository = wellnessHubRepository;
        this.emergencyServiceRepository = emergencyServiceRepository;
    }

    public Map<String, Object> login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("กรุณากรอกข้อมูลให้ถูกต้อง");
        }

        String trimmedUsername = username.trim();
        if (trimmedUsername.isEmpty() || password.isEmpty() || username.contains(" ") || password.contains(" ")) {
            throw new IllegalArgumentException("กรุณากรอกข้อมูลให้ถูกต้อง");
        }

        if (trimmedUsername.length() < 4 || trimmedUsername.length() > 10) {
            throw new IllegalArgumentException("กรุณากรอกข้อมูลให้ถูกต้อง");
        }

        if (password.length() != 8) {
            throw new IllegalArgumentException("กรุณากรอกข้อมูลให้ถูกต้อง");
        }

        WellnessHub hub = wellnessHubRepository.findByUsername(trimmedUsername);

        if (hub != null) {
            if (!hub.getPassword().equals(password)) {
                throw new SecurityException("ไม่พบข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
            }

            if (!"ACTIVE".equalsIgnoreCase(hub.getStatus())) {
                throw new SecurityException("บัญชีนี้ยังไม่ได้รับการอนุมัติ");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("licenseId", hub.getLicenseId());
            response.put("username", hub.getUsername());
            response.put("wellnessHubName", hub.getWellnessHubName());
            response.put("status", hub.getStatus());

            return response;
        }

        EmergencyService emergencyService = emergencyServiceRepository.findByUsername(trimmedUsername);

        if (emergencyService == null) {
            throw new SecurityException("ไม่พบข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }

        if (!emergencyService.getPassword().equals(password)) {
            throw new SecurityException("ไม่พบข้อมูลผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }

        if (!"ACTIVE".equalsIgnoreCase(emergencyService.getStatus())) {
            throw new SecurityException("บัญชีนี้ยังไม่ได้รับการอนุมัติ");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("licenseId", emergencyService.getLicenseId());
        response.put("username", emergencyService.getUsername());
        response.put("wellnessHubName", emergencyService.getWellnessHubName());
        response.put("status", emergencyService.getStatus());

        return response;
    }
}