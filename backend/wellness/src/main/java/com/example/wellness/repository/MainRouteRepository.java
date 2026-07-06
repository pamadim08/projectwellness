package com.example.wellness.repository;

import com.example.wellness.model.MainRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MainRouteRepository extends JpaRepository<MainRoute, Integer> {
    // สืบทอดคำสั่งดึงข้อมูลพื้นฐานครบถ้วนโดยใช้ ID คีย์หลักเป็น Integer
}