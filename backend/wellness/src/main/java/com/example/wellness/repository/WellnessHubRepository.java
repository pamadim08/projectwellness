package com.example.wellness.repository;

import com.example.wellness.model.WellnessHub;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WellnessHubRepository
        extends JpaRepository<WellnessHub, Integer> {

    boolean existsByUsername(String username);

    WellnessHub findByUsername(String username);

    @Query("""
            SELECT new map(
                d.districtId AS districtId,
                d.districtName AS districtName,
                COUNT(w) AS wellnessHubCount
            )
            FROM District d
            LEFT JOIN WellnessHub w
                ON w.district.districtId = d.districtId
            GROUP BY
                d.districtId,
                d.districtName
            ORDER BY
                d.districtName ASC
            """)
    List<Map<String, Object>> countWellnessHubsByDistrict();

    List<WellnessHub> findByDistrict_DistrictIdInAndCategory_CategoryIdIn(
            List<Integer> districtIds,
            List<String> categoryIds);


    List<WellnessHub> findByWellnessHubNameContaining(String keyword);

    @Query("SELECT w FROM WellnessHub w " +
            "WHERE (LOWER(w.wellnessHubName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND w.address IS NOT NULL " +
            "AND TRIM(w.address) <> '' " +
            "AND TRIM(w.address) <> 'ไม่ระบุ' " +
            "ORDER BY " +
            "   CASE WHEN LOWER(w.wellnessHubName) LIKE LOWER(CONCAT(:keyword, '%')) THEN 0 " +
            "        WHEN LOWER(w.wellnessHubName) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 " +
            "        ELSE 2 END ASC, " +
            "   w.wellnessHubName ASC")
    List<WellnessHub>
    searchByNameStartingWithAndHasAddress(@Param("keyword") String keyword);

    @Query("SELECT w FROM WellnessHub w " +
            "WHERE (:keyword IS NULL OR :keyword = '' OR " +
            "   LOWER(w.wellnessHubName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND w.address IS NOT NULL " +
            "AND TRIM(w.address) <> '' " +
            "AND TRIM(w.address) <> 'ไม่ระบุ' " +
            "AND (:categoryId IS NULL OR w.category.categoryId = :categoryId) " +
            "AND (:districtId IS NULL OR w.district.districtId = :districtId) " +
            "ORDER BY w.wellnessHubName ASC")
    List<WellnessHub> searchWithFilter(
            @Param("keyword") String keyword,
            @Param("categoryId") String categoryId,
            @Param("districtId") Integer districtId
    );

    @Query("SELECT w FROM WellnessHub w " +
            "WHERE (:keyword IS NULL OR :keyword = '' OR " +
            "   LOWER(w.wellnessHubName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND w.address IS NOT NULL " +
            "AND TRIM(w.address) <> '' " +
            "AND TRIM(w.address) <> 'ไม่ระบุ' " +
            "AND (:categoryId IS NULL OR w.category.categoryId = :categoryId) " +
            "AND (:districtId IS NULL OR w.district.districtId = :districtId) " +
            "ORDER BY w.wellnessHubName ASC")
    Page<WellnessHub> searchWithFilter(
            @Param("keyword") String keyword,
            @Param("categoryId") String categoryId,
            @Param("districtId") Integer districtId,
            Pageable pageable
    );

    @Query("SELECT w FROM WellnessHub w " +
            "JOIN FETCH w.category " +
            "JOIN FETCH w.district " +
            "WHERE w.district.districtId IN :districtId " +
            "AND w.category.categoryId IN :categoryId " +
            "AND w.wellnessHubLatitude IS NOT NULL " +
            "AND w.wellnessHubLongitude IS NOT NULL " +
            "AND w.wellnessHubLatitude <> 0 " +
            "AND w.wellnessHubLongitude <> 0")
    List<WellnessHub> findByDistrictIdsAndCategoryIds(
            @Param("districtId") List<Integer> districtIds,
            @Param("categoryId") List<String> categoryIds
    );
}