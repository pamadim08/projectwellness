package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "account_requests") // ปรับเป็นพหูพจน์เพื่อให้ OperatingHour อ้างอิงได้ถูกต้อง
@Data
public class AccountRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Integer requestId; // PK: รหัสการร้องขอ (Integer ตามเดิม)

    @Column(name = "contact_information", nullable = false, length = 255)
    private String contactInformation; // ข้อมูลการติดต่อ

    @Column(name = "rejection_reason", nullable = false, length = 255)
    private String rejectionReason; // เหตุผลที่ไม่อนุมัติ

    @Column(name = "rejection_date", nullable = false, length = 10)
    private String rejectionDate; // วันที่ไม่อนุมัติ (เก็บเป็น String ตามเดิม)

    @Column(name = "rejection_status", nullable = false, length = 255)
    private String rejectionStatus; // สถานะ

    @Column(name = "tell_information", nullable = false, length = 10)
    private String tellInformation; // เบอร์โทร

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail; // อีเมล

    @Column(name = "verification_documents", nullable = false, length = 255)
    private String verificationDocuments; // เอกสารรับรอง

    @Column(name = "wellness_hub_description", nullable = false, length = 255)
    private String wellnessHubDescription; // รายละเอียดสถานประกอบการ

    @ManyToOne
    @JoinColumn(name = "license_id")
    private WellnessHub wellnessHub; // เชื่อม FK ไปยัง WellnessHub
}