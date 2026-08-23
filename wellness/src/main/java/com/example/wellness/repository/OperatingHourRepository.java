package com.example.wellness.repository;

import com.example.wellness.model.OperatingHour;
import com.example.wellness.model.WellnessHub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface OperatingHourRepository extends JpaRepository<OperatingHour, Integer> {

    /**
     * 🌟 ลบข้อมูลวันเวลาเปิด-ปิดทั้งหมดที่ผูกกับสถานประกอบการนี้
     * (ล้างข้อมูลเก่าก่อนอัปเดต)
     * 
     * @Transactional และ @Modifying จำเป็นต้องใส่เพื่อให้ Spring ทำลายข้อมูลเก่าใน
     *                Supabase ได้สำเร็จโดยไม่ติดขัดสิทธิ์การ Write
     */
    @Modifying
    @Transactional
    void deleteByWellnessHub(WellnessHub wellnessHub);
}