package com.example.wellness.repository;

import com.example.wellness.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Integer> {
    List<Article> findAllByOrderByPostDateDesc();

    // ใช้สำหรับหน้า "บทความของฉัน" — กรองเฉพาะบทความของ member คนนั้นจริงๆ
    List<Article> findByMemberMemberIdOrderByPostDateDesc(Integer memberId);

    // ค้นหาบทความจากเนื้อหา หรือชื่อ-นามสกุลผู้โพสต์ (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
    @Query("""
            SELECT a FROM Article a
            JOIN a.member m
            WHERE LOWER(a.content) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(m.firstName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(m.lastName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(CONCAT(m.firstName, ' ', m.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY a.postDate DESC
            """)
    List<Article> searchArticles(@Param("keyword") String keyword);

    // 🆕 กรองบทความตามหมวดหมู่สถานประกอบการ และ/หรืออำเภอ — คำนวณสดผ่าน join ไปหา trip ที่แนบ
    // ทุกครั้งที่เรียก ไม่มีการ cache ค่าไว้เลย (ตามที่ตกลงกันไว้ กันข้อมูลค้างถ้า trip ถูกแก้ทีหลัง)
    // ส่ง null ทั้งคู่ = เอาทุกบทความที่มี trip แนบ (join ผ่าน a.myTravelTrip เป็น inner join
    // จึงตัดบทความเก่าที่ไม่มี trip แนบออกไปโดยธรรมชาติ)
    @Query("""
            SELECT DISTINCT a FROM Article a
            JOIN a.myTravelTrip t
            LEFT JOIN t.tripDetails td
            LEFT JOIN td.wellnessHub wh
            LEFT JOIN wh.category c
            WHERE (:categoryId IS NULL OR c.categoryId = :categoryId)
              AND (:districtId IS NULL
                   OR t.originDistrict.districtId = :districtId
                   OR t.destinationDistrict.districtId = :districtId)
            ORDER BY a.postDate DESC
            """)
    List<Article> filterArticles(@Param("categoryId") String categoryId,
                                 @Param("districtId") Integer districtId);
}