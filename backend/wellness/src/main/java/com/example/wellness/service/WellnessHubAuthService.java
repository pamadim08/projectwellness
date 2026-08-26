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
        WellnessHub hub = wellnessHubRepository.findByUsername(username);

        if (hub != null) {
            if (!hub.getPassword().equals(password)) {
                throw new RuntimeException("รหัสผ่านไม่ถูกต้อง");
            }

            if (!"ACTIVE".equalsIgnoreCase(hub.getStatus())) {
                throw new RuntimeException("บัญชีนี้ยังไม่ได้รับการอนุมัติ");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("licenseId", hub.getLicenseId());
            response.put("username", hub.getUsername());
            response.put("wellnessHubName", hub.getWellnessHubName());
            response.put("status", hub.getStatus());

            return response;
        }

        EmergencyService emergencyService = emergencyServiceRepository.findByUsername(username);

        if (emergencyService == null) {
            throw new RuntimeException("ไม่พบชื่อผู้ใช้งาน");
        }

        if (!emergencyService.getPassword().equals(password)) {
            throw new RuntimeException("รหัสผ่านไม่ถูกต้อง");
        }

        if (!"ACTIVE".equalsIgnoreCase(emergencyService.getStatus())) {
            throw new RuntimeException("บัญชีนี้ยังไม่ได้รับการอนุมัติ");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("licenseId", emergencyService.getLicenseId());
        response.put("username", emergencyService.getUsername());
        response.put("wellnessHubName", emergencyService.getWellnessHubName());
        response.put("status", emergencyService.getStatus());

        return response;
    }
}