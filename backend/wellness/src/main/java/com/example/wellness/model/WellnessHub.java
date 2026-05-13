package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "wellness_hubs")
@Data
public class WellnessHub {

    @Id
    @Column(name = "license_id")
    private Integer licenseId;
    @Column(name = "wellness_hub_name", nullable = false, length = 255)
    private String wellnessHubName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "contact_information", length = 255)
    private String contactInformation;

    @Column(name = "google_maps_link", length = 255)
    private String googleMapsLink;

    @Column(name = "password", length = 16)
    private String password;

    @Column(name = "tel_information", nullable = false, length = 10)
    private String telInformation;

    @Column(name = "username", length = 100)
    private String username;

    @Column(name = "wellness_hub_description", length = 255)
    private String wellnessHubDescription;

    @Column(name = "wellness_hub_img", length = 255)
    private String wellnessHubImg;

    // ใช้ Float ตามเดิมตามที่คุณต้องการค่ะ
    @Column(name = "wellness_hub_latitude", nullable = false)
    private Float wellnessHubLatitude;

    @Column(name = "wellness_hub_longitude", nullable = false)
    private Float wellnessHubLongitude;
    // เพิ่มต่อจากฟิลด์เดิมใน WellnessHub.java
    @Column(name = "status", length = 20)
    private String status; // เช่น "active" หรือ "inactive"

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district;
}