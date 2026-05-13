package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "main_route_details")
@Data
public class MainRouteDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id; // PK หลักของตารางนี้ (รันไปเรื่อยๆ)

    @Column(name = "order_number", nullable = false)
    private Integer orderNumber; // ลำดับที่ 1, 2, 3... ในเส้นทางนั้นๆ

    @ManyToOne
    @JoinColumn(name = "district_id")
    private District district; // อำเภอที่ผ่าน

    @ManyToOne
    @JoinColumn(name = "route_id")
    private MainRoute mainRoute; // อยู่ในเส้นทางไหน
}