package com.example.wellness.repository;

import com.example.wellness.model.AccountRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountRequestRepository
                extends JpaRepository<AccountRequest, Integer> {

        // =============================
        // List
        // =============================

        List<AccountRequest> findAllByOrderByRequestIdDesc();

        List<AccountRequest> findByRequestStatusOrderByRequestIdDesc(
                        String requestStatus);

        // =============================
        // Count
        // =============================

        long countByRequestStatus(
                        String requestStatus);

        long countByRequestStatusIgnoreCase(
                        String requestStatus);

        // =============================
        // ตรวจคำขอซ้ำด้วย License ID
        // =============================

        boolean existsByLicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        long deleteByLicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        void deleteByLicenseId(
                        Integer licenseId);

        // =============================
        // Search
        // =============================

        List<AccountRequest> findByUsernameIgnoreCaseOrderByRequestIdDesc(
                        String username);

        List<AccountRequest> findByUsernameContainingIgnoreCaseOrderByRequestIdDesc(
                        String username);

        List<AccountRequest> findByWellnessHubNameContainingIgnoreCaseOrderByRequestIdDesc(
                        String wellnessHubName);

        List<AccountRequest> findByLicenseIdOrderByRequestIdDesc(
                        Integer licenseId);

}