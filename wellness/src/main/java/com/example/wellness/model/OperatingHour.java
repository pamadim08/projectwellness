package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalTime;

@Entity
@Table(name = "operating_hours") // ปรับเป็นพหูพจน์เพื่อให้เข้าชุดกับตารางอื่นในระบบ
@Data
public class OperatingHour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "oph_id")
    private Integer ophId; // คงไว้เป็น Integer

    @Column(name = "open_time", nullable = false)
    private LocalTime openTime; // ใน Postgres จะเป็นชนิด time

    @Column(name = "day_of_week", nullable = false, length = 50)
    private String dayOfWeek;

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime; // ใน Postgres จะเป็นชนิด time

    // เชื่อมไปหา WellnessHub (FK)
    @ManyToOne
    @JoinColumn(name = "license_id")
    private WellnessHub wellnessHub;

    // เชื่อมไปหา AccountRequest (FK)
    @ManyToOne
    @JoinColumn(name = "request_id")
    private AccountRequest accountRequest;
}