package com.example.wellness.repository;

import com.example.wellness.model.WellnessHub;

import java.util.List;
import java.util.Map;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
}