package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "wellness_hubs")
@Data
public class WellnessHub {

    @Id
    @Column(name = "license_id")
    private Integer licenseId; // ตรงกับ "เลขใบอนุญาตประกอบกิจการ" ในฟอร์ม

    @Column(name = "wellness_hub_name", nullable = false, length = 255)
    private String wellnessHubName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "contact_information", length = 255)
    private String contactInformation;

    @Column(name = "google_maps_link", columnDefinition = "TEXT", nullable = false)
    private String googleMapsLink;

    @Column(name = "password", length = 16)
    private String password;

    @Column(name = "tel_information", length = 10)
    private String telInformation;

    @Column(name = "username", length = 100)
    private String username;

    @Column(name = "wellness_hub_description", length = 255)
    private String wellnessHubDescription;

    @Column(name = "wellness_hub_img", length = 255)
    private String wellnessHubImg;

    @Column(name = "wellness_hub_latitude")
    private Float wellnessHubLatitude;

    @Column(name = "wellness_hub_longitude")
    private Float wellnessHubLongitude;

    @Column(name = "status", length = 20)
    private String status;

    // ✨ ฟิลด์ที่ลืม: เพิ่มคอลัมน์เก็บประเภทใบรับรองศูนย์เวลเนส
    @Column(name = "certificate_type", length = 100)
    private String certificateType;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district;
}