package com.example.wellness.dto;

import lombok.Data;

import java.util.List;

@Data
public class UpdateTripRequest {
    private Integer memberId;       // ใช้เช็คสิทธิ์ก่อนแก้ไข
    private String tripName;
    private String description;
    private List<String> licenseIds;  // รายการ hub ใหม่ทั้งหมด (แทนที่ของเดิมทั้งชุด)
    // หมายเหตุ: ไม่มี originName/destinationName/districtId เพราะแก้ไม่ได้ตาม requirement
}