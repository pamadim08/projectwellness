package com.example.wellness.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateTripRequest {
    private Integer memberId;
    private String tripName;
    private String description;
    private String originName;
    private String destinationName;
    private Integer originDistrictId;       // 🆕
    private Integer destinationDistrictId;  // 🆕
    private List<String> licenseIds;
}