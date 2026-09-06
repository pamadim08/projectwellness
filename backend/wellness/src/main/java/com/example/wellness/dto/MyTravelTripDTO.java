package com.example.wellness.dto;

import lombok.Data;

import java.util.List;

@Data
public class MyTravelTripDTO {
    private int travelTripId;
    private String tripName;
    private String description;
    private String originName;
    private String destinationName;
    private Integer originDistrictId;       // 🆕 ให้ Flutter ใช้เรียก getHubsAlongRoute ตอนแก้ไข
    private Integer destinationDistrictId;  // 🆕
    private List<HubSimpleDTO> hubs;

    // 🆕 ข้อมูลว่า trip นี้เป็นสำเนามาจากที่ไหน — null ทั้งคู่แปลว่าเป็นเส้นทางต้นฉบับ ไม่ใช่สำเนา
    private Integer duplicatedFromTripId;
    private Integer originalOwnerId;
    private String originalOwnerFirstName;
    private String originalOwnerLastName;

    @Data
    public static class HubSimpleDTO {
        private Integer licenseId;
        private String wellnessHubName;
        private String address;
        private String category;
        private int travelTripIndex;
        private Double latitude;   // เปลี่ยนจาก Float เป็น Double ให้ตรงกับ WellnessHub ของเพื่อน
        private Double longitude;  // เปลี่ยนจาก Float เป็น Double ให้ตรงกับ WellnessHub ของเพื่อน
    }
}