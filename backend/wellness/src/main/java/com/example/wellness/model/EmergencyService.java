package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "emergency_services")
@Data
public class EmergencyService {

    @Id
    @Column(name = "license_id")
    private Integer licenseId;

    @Column(name = "wellness_hub_name")
    private String wellnessHubName;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_information")
    private String contactInformation;

    @Column(name = "tel_information")
    private String telInformation;

    @Column(name = "google_maps_link", columnDefinition = "TEXT")
    private String googleMapsLink;

    @Column(name = "wellness_hub_description", columnDefinition = "TEXT")
    private String wellnessHubDescription;

    @Column(name = "wellness_hub_img", columnDefinition = "TEXT")
    private String wellnessHubImg;

    @Column(name = "wellness_hub_gallery", columnDefinition = "TEXT")
    private String wellnessHubGallery;

    @Column(name = "wellness_hub_latitude")
    private Double wellnessHubLatitude;

    @Column(name = "wellness_hub_longitude")
    private Double wellnessHubLongitude;

    @Column(name = "certificate_type", columnDefinition = "TEXT")
    private String certificateType;

    @Column(name = "operating_hours", columnDefinition = "TEXT")
    private String operatingHours;

    @Column(name = "username")
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "status")
    private String status;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district;
}