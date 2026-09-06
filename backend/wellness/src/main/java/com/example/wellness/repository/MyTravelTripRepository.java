
package com.example.wellness.repository;

import com.example.wellness.model.MyTravelTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MyTravelTripRepository extends JpaRepository<MyTravelTrip, Integer> {

    // 🆕 ใช้ JOIN FETCH ดึง tripDetails + wellnessHub + category มาในคำสั่งเดียว
    // แก้ปัญหา N+1 query ที่ทำให้หน้า list โหลดช้าเมื่อมี trip/hub เยอะขึ้น
    // DISTINCT กันแถวซ้ำที่เกิดจากการ join กับ tripDetails (one-to-many)
    @Query("""
            SELECT DISTINCT t FROM MyTravelTrip t
            LEFT JOIN FETCH t.tripDetails td
            LEFT JOIN FETCH td.wellnessHub wh
            LEFT JOIN FETCH wh.category
            WHERE t.member.memberId = :memberId
            ORDER BY t.travelTripId DESC
            """)
    List<MyTravelTrip> findByMemberMemberIdOrderByTravelTripIdDesc(@Param("memberId") Integer memberId);
}