package com.example.wellness.controller;
import com.example.wellness.dto.UserProfileResponse;
import com.example.wellness.model.Member;
import com.example.wellness.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/member") // ตั้งชื่อเส้นทางหลัก
@CrossOrigin
public class MemberController {

    @Autowired
    private MemberService memberService;


    // สร้าง API แบบ GET: /api/users/check-email?email=test@email.com
    @GetMapping("/check_exist_email")
    public ResponseEntity<Boolean> checkEmail(@RequestParam String email) {

        // เอาอีเมลที่ Flutter ส่งมา ไปเช็คใน Service
        boolean isExist = memberService.isEmailTaken(email);

        // ตอบกลับไปหา Flutter เป็น true (ซ้ำ) หรือ false (ไม่ซ้ำ)
        return ResponseEntity.ok(isExist);
    }

    // 🆕 เปลี่ยน return type เป็น ResponseEntity<?> เพื่อส่ง error message กลับไปได้
    // (เดิม ResponseEntity<Member> ทำได้แค่ 500 เปล่าๆ ไม่มีเหตุผลอะไรกลับไปเลย)
    @PostMapping
    public ResponseEntity<?> RegisterMember(@RequestBody Member newMember) {
        try {
            // ส่งข้อมูลไปให้ Service ทำการบันทึกลงฐานข้อมูล (มี validation ครบตาม requirement แล้ว)
            Member registeredMember = memberService.registerMember(newMember);

            // ตอบกลับไปหา Flutter ว่าสร้างสำเร็จแล้ว (รหัส 201 CREATED) พร้อมส่งข้อมูลที่เซฟแล้วกลับไปให้ดู
            return ResponseEntity.status(HttpStatus.CREATED).body(registeredMember);

        } catch (IllegalArgumentException e) {
            // 🆕 error จาก validation (รูปแบบผิด/อีเมลซ้ำ/ฯลฯ) — ส่งข้อความจริงกลับไปให้ Flutter โชว์
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            // ข้อผิดพลาดอื่นที่ไม่คาดคิด (เช่น DB ล่ม) — ยังคง 500 ไว้เหมือนเดิม
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง"
            ));
        }
    }

    // 🆕 5.1.1 — แยก 2 alternate flow: ไม่มีบัญชี (404) vs รหัสผ่านผิด (401)
    @PostMapping("/login")
    public ResponseEntity<?> loginMember(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String password = loginData.get("password");

        try {
            Member member = memberService.loginMember(email, password);
            return ResponseEntity.ok(member);
        } catch (NoSuchElementException e) {
            // ไม่พบบัญชีนี้เลยในระบบ
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            // มีบัญชีอยู่ แต่รหัสผ่านไม่ตรง
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"
            ));
        }
    }

    // GET /v1/member/{id} — ดึงข้อมูล member
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getMember(@PathVariable Integer id) {
        try {
            UserProfileResponse profile = memberService.getMember(id);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("ไม่พบสมาชิก");
        }
    }

    // PUT /v1/member/{id} — อัปเดตชื่อนามสกุล
    @PutMapping("/{id}")
    public ResponseEntity<?> editProfile(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        try {
            String firstName = body.get("firstName");
            String lastName = body.get("lastName");

            if (firstName == null || firstName.isBlank() ||
                    lastName == null || lastName.isBlank()) {
                return ResponseEntity.badRequest().body("กรุณากรอกชื่อและนามสกุล");
            }

            memberService.editProfile(id, firstName, lastName);
            return ResponseEntity.ok("อัปเดตข้อมูลสำเร็จ");
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("ไม่พบสมาชิก");
        }
    }

    // PUT /v1/member/{id}/profile-image — แก้ไขรูปโปรไฟล์ (แยก endpoint เพราะเป็น multipart) 🆕
    @PutMapping(value = "/{id}/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProfileImage(
            @PathVariable Integer id,
            @RequestParam("image") MultipartFile image) {
        try {
            String newPath = memberService.updateProfileImage(id, image);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "อัปเดตรูปโปรไฟล์สำเร็จ",
                    "profileImage", newPath
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }
}