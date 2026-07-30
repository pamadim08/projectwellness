package com.example.wellness.controller;

import com.example.wellness.model.AccountRequest;
import com.example.wellness.service.AccountRequestService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/account-requests")
@CrossOrigin(origins = "http://localhost:3000")
public class AccountRequestController {

    private final AccountRequestService service;

    public AccountRequestController(
            AccountRequestService service) {

        this.service = service;

    }

    // =========================
    // List Account Request
    // =========================

    @GetMapping
    public List<AccountRequest> getAllRequests() {

        return service.getAllRequests();

    }

    // =========================
    // Detail
    // =========================

    @GetMapping("/{id}")
    public AccountRequest getRequestById(
            @PathVariable Integer id) {

        return service.getRequestById(id);

    }

    // =========================
    // Approve
    // =========================

    @PutMapping("/{id}/approve")
    public AccountRequest approve(
            @PathVariable Integer id) {

        return service.approveRequest(id);

    }

    // =========================
    // Reject
    // =========================

    @PutMapping("/{id}/reject")
    public AccountRequest reject(
            @PathVariable Integer id,
            @RequestParam String reason) {

        return service.rejectRequest(
                id,
                reason);

    }

}