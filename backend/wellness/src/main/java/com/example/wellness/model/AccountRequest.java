package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "account_requests")
@Data
public class AccountRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Integer requestId;

    // ============================
    // ข้อมูลผู้สมัคร
    // ============================

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    @Column(name = "contact_information", length = 255)
    private String contactInformation;

    @Column(name = "tell_information", length = 10)
    private String tellInformation;

    // ============================
    // ข้อมูลสถานประกอบการ
    // ============================

    @Column(name = "wellness_hub_name", nullable = false, length = 255)
    private String wellnessHubName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "google_maps_link", columnDefinition = "TEXT")
    private String googleMapsLink;

    @Column(name = "wellness_hub_description", columnDefinition = "TEXT")
    private String wellnessHubDescription;

    @Column(name = "wellness_hub_img", columnDefinition = "TEXT")
    private String wellnessHubImg;

    @Column(name = "wellness_hub_latitude")
    private Double wellnessHubLatitude;

    @Column(name = "wellness_hub_longitude")
    private Double wellnessHubLongitude;

    @Column(name = "certificate_type", columnDefinition = "TEXT")
    private String certificateType;

    @Column(name = "operating_hours", columnDefinition = "TEXT")
    private String operatingHours;

    // ============================
    // เอกสารประกอบ
    // ============================

    @Column(name = "verification_documents", columnDefinition = "TEXT")
    private String verificationDocuments;

    // ============================
    // Workflow
    // ============================

    /*
        PENDING
        APPROVED
        REJECTED
     */
    @Column(name = "request_status", nullable = false, length = 20)
    private String requestStatus;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "processed_date")
    private LocalDateTime processedDate;

    // ============================
    // ความสัมพันธ์
    // ============================

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district;

    @ManyToOne
    @JoinColumn(name = "license_id")
    private WellnessHub wellnessHub;

}