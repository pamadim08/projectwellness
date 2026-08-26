package com.example.wellness.controller;

import com.example.wellness.model.Admin;
import com.example.wellness.service.AccountGeneratorService;
import com.example.wellness.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    private final AdminService adminService;
    private final AccountGeneratorService accountGeneratorService;

    public AdminController(AdminService adminService, AccountGeneratorService accountGeneratorService) {
        this.adminService = adminService;
        this.accountGeneratorService = accountGeneratorService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Admin loginData) {
        return adminService.login(
                loginData.getUsername(),
                loginData.getPassword())
                .map(admin -> ResponseEntity.ok((Object) admin))
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body((Object) "ขออภัย Username หรือ Password ไม่ถูกต้อง"));
    }

    @PostMapping("/generate-account")
    public ResponseEntity<?> generateAccount() {
        return ResponseEntity.ok(accountGeneratorService.generateAccounts());
    }
}