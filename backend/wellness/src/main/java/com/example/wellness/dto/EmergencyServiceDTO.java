package com.example.wellness.dto;


import lombok.Data;

@Data
public class EmergencyServiceDTO {
    private Integer licenseId;
    private String name;
    private String address;
    private String telInformation;
    private Double latitude;
    private Double longitude;
    private String type; // "BLS" หรือ "ALS"
}
