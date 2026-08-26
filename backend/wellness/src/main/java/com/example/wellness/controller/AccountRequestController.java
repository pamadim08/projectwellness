package com.example.wellness.controller;

import com.example.wellness.model.AccountRequest;
import com.example.wellness.service.AccountRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account-requests")
@CrossOrigin(origins = "http://localhost:3000")
public class AccountRequestController {

    private final AccountRequestService service;

    public AccountRequestController(AccountRequestService service) {
        this.service = service;
    }

    // =========================
    // Track Request (Public API)
    // =========================
    @GetMapping("/track")
    public ResponseEntity<?> trackRequestStatus(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String query) {
        try {
            String targetUsername = (username != null && !username.trim().isEmpty()) ? username : query;
            List<AccountRequest> requests = service.trackRequestStatus(targetUsername);

            List<Map<String, Object>> results = requests.stream()
                    .map(request -> {
                        Map<String, Object> map = new LinkedHashMap<>();

                        Integer licenseId = getLicenseId(request);

                        map.put("requestId", request.getRequestId());
                        map.put("username", request.getUsername());
                        map.put("requesterName", request.getRequesterName());
                        map.put("licenseId", licenseId);
                        map.put("wellnessHubName", request.getWellnessHubName());
                        map.put("requestStatus", request.getRequestStatus());
                        map.put("rejectionReason", request.getRejectionReason());
                        map.put("processedDate", request.getProcessedDate());
                        map.put("userEmail", maskEmail(request.getUserEmail()));

                        return map;
                    })
                    .toList();

            return ResponseEntity.ok(results);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // =========================
    // Create Request
    // =========================
    @PostMapping
    public ResponseEntity<?> requestWellnessHubAccount(@RequestBody Map<String, Object> payload) {
        try {
            AccountRequest savedRequest = service.requestWellnessHubAccount(payload);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(savedRequest);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // =========================
    // List Account Request
    // =========================
    @GetMapping
    public List<AccountRequest> listAccountRequest() {
        return service.listAccountRequest();
    }

    // =========================
    // Detail
    // =========================
    @GetMapping("/{id}")
    public AccountRequest getRequestById(@PathVariable Integer id) {
        return service.getRequestById(id);
    }

    // =========================
    // Approve
    // =========================
    @PutMapping("/{id}/approve")
    public AccountRequest approveAccountRequest(@PathVariable Integer id) {
        return service.approveAccountRequest(id);
    }

    // =========================
    // Reject
    // =========================
    @PutMapping("/{id}/reject")
    public AccountRequest reject(
            @PathVariable Integer id,
            @RequestParam String reason) {
        return service.rejectRequest(id, reason);
    }

    // =========================
    // Helper Methods
    // =========================
    private Integer getLicenseId(AccountRequest request) {
        return request.getLicenseId();
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) {
            return null;
        }

        String[] parts = email.split("@", 2);
        String username = parts[0];
        String maskedUsername;

        if (username.length() <= 2) {
            maskedUsername = username.charAt(0) + "***";
        } else {
            maskedUsername = username.substring(0, 2) + "***";
        }

        return maskedUsername + "@" + parts[1];
    }
}