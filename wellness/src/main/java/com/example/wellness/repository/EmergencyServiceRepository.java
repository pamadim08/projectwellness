package com.example.wellness.repository;

import com.example.wellness.model.EmergencyService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyServiceRepository
        extends JpaRepository<EmergencyService, Integer> {

    List<EmergencyService> findByDistrict_DistrictIdIn(
            List<Integer> districtIds);

    List<EmergencyService> findByCategory_CategoryIdIn(
            List<String> categoryIds);

    List<EmergencyService> findByDistrict_DistrictIdInAndCategory_CategoryIdIn(
            List<Integer> districtIds,
            List<String> categoryIds);

    boolean existsByUsername(String username);

    EmergencyService findByUsername(String username);
}