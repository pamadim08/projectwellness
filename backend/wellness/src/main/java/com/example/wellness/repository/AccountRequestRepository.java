package com.example.wellness.repository;

import com.example.wellness.model.AccountRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountRequestRepository
        extends JpaRepository<AccountRequest, Integer> {

    // เรียงคำร้องล่าสุดก่อน
    List<AccountRequest> findAllByOrderByRequestIdDesc();

    // กรองตามสถานะ เช่น PENDING, APPROVED, REJECTED
    List<AccountRequest> findByRequestStatusOrderByRequestIdDesc(
            String requestStatus
    );

    // นับจำนวนคำร้องตามสถานะ สำหรับ Dashboard/Badge
    long countByRequestStatus(String requestStatus);

    void deleteByWellnessHub_LicenseId(Integer licenseId);
    long countByRequestStatusIgnoreCase(String requestStatus);
}