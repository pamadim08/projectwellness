package com.example.wellness.repository;

import com.example.wellness.model.AccountRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountRequestRepository
                extends JpaRepository<AccountRequest, Integer> {

        List<AccountRequest> findAllByOrderByRequestIdDesc();

        List<AccountRequest> findByRequestStatusOrderByRequestIdDesc(
                        String requestStatus);

        long countByRequestStatus(
                        String requestStatus);

        long countByRequestStatusIgnoreCase(
                        String requestStatus);

        boolean existsByWellnessHub_LicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        long deleteByWellnessHub_LicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        void deleteByWellnessHub_LicenseId(
                        Integer licenseId);

        List<AccountRequest> findByWellnessHubNameContainingIgnoreCaseOrderByRequestIdDesc(
                        String wellnessHubName);

        List<AccountRequest> findByWellnessHub_LicenseIdOrderByRequestIdDesc(
                        Integer licenseId);

        // =============================
        // Emergency Service
        // =============================

        boolean existsByEmergencyService_LicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        long deleteByEmergencyService_LicenseIdAndRequestStatus(
                        Integer licenseId,
                        String requestStatus);

        List<AccountRequest> findByEmergencyService_LicenseIdOrderByRequestIdDesc(
                        Integer licenseId);

        List<AccountRequest> findByEmergencyService_WellnessHubNameContainingIgnoreCaseOrderByRequestIdDesc(
                        String wellnessHubName);
}