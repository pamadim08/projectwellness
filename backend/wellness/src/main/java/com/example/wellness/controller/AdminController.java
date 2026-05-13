package com.example.wellness.controller;

import com.example.wellness.model.Admin;
import com.example.wellness.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Admin loginData) {
        return adminService.login(loginData.getUsername(), loginData.getPassword())
                .map(admin -> ResponseEntity.ok((Object) admin)) // Cast เป็น Object เพื่อความชัวร์
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body((Object) "ขออภัย Username หรือ Password ไม่ถูกต้อง"));
    }
}