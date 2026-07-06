package com.example.wellness.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "route_description", nullable = true, length = 255)

    private String routeDescription;
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "category_id", columnDefinition = "Text")
    private String categoryId;

    @OneToMany(mappedBy = "mainRoute", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MainRouteDetail> details = new ArrayList<>();
}