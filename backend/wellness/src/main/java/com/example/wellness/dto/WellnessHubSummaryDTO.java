package com.example.wellness.dto;

import com.example.wellness.model.Category;
import com.example.wellness.model.District;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WellnessHubSummaryDTO {
    private String licenseId;
    private String wellnessHubName;
    private String address;
    private String contactInformation;
    private String telInformation;
    private String googleMapsLink;
    private String wellnessHubImg;
    private Double wellnessHubLatitude;
    private Double wellnessHubLongitude;
    private String status;
    private String certificateType;
    private String operatingHours;
    private Category category;
    private District district;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
