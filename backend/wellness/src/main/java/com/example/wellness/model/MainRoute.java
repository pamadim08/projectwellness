package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "main_routes") // ปรับเป็นพหูพจน์เพื่อให้เข้าชุดกับตารางอื่น
@Data
public class MainRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "route_id")
    private Integer routeId; // คงไว้เป็น Integer ตามเดิม

    @Column(name = "route_name", nullable = false, length = 50)
    private String routeName;

    @Column(name = "route_description", nullable = false, length = 255)
    private String routeDescription;

    // แนะนำ: แทนที่จะใช้ String categoryId เฉยๆ 
    // เราควรเชื่อมเป็นความสัมพันธ์ @ManyToOne เหมือนใน WellnessHub ค่ะ
    @ManyToOne
    @JoinColumn(name = "category_id") 
    private Category category; 
}