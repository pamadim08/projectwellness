package com.example.wellness.service;

import com.example.wellness.repository.AccountRequestRepository;
import com.example.wellness.repository.MainRouteRepository;
import com.example.wellness.repository.WellnessHubRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final WellnessHubRepository wellnessHubRepository;
    private final MainRouteRepository mainRouteRepository;
    private final AccountRequestRepository accountRequestRepository;

    public DashboardService(
            WellnessHubRepository wellnessHubRepository,
            MainRouteRepository mainRouteRepository,
            AccountRequestRepository accountRequestRepository
    ) {
        this.wellnessHubRepository = wellnessHubRepository;
        this.mainRouteRepository = mainRouteRepository;
        this.accountRequestRepository = accountRequestRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardSummary() {

        long totalWellnessHubs = wellnessHubRepository.count();
        long totalMainRoutes = mainRouteRepository.count();

        long totalAccountRequests =
                accountRequestRepository.count();

        long pendingAccountRequests =
                accountRequestRepository
                        .countByRequestStatusIgnoreCase(
                                STATUS_PENDING
                        );

        long approvedAccountRequests =
                accountRequestRepository
                        .countByRequestStatusIgnoreCase(
                                STATUS_APPROVED
                        );

        long rejectedAccountRequests =
                accountRequestRepository
                        .countByRequestStatusIgnoreCase(
                                STATUS_REJECTED
                        );

        double approvedPercentage = calculatePercentage(
                approvedAccountRequests,
                totalAccountRequests
        );

        double rejectedPercentage = calculatePercentage(
                rejectedAccountRequests,
                totalAccountRequests
        );

        double pendingPercentage = calculatePercentage(
                pendingAccountRequests,
                totalAccountRequests
        );

        List<Map<String, Object>> wellnessHubsByDistrict =
                wellnessHubRepository
                        .countWellnessHubsByDistrict();

        Map<String, Object> response = new LinkedHashMap<>();

        response.put(
                "totalWellnessHubs",
                totalWellnessHubs
        );

        response.put(
                "totalMainRoutes",
                totalMainRoutes
        );

        response.put(
                "totalAccountRequests",
                totalAccountRequests
        );

        response.put(
                "pendingAccountRequests",
                pendingAccountRequests
        );

        response.put(
                "approvedAccountRequests",
                approvedAccountRequests
        );

        response.put(
                "rejectedAccountRequests",
                rejectedAccountRequests
        );

        response.put(
                "pendingPercentage",
                pendingPercentage
        );

        response.put(
                "approvedPercentage",
                approvedPercentage
        );

        response.put(
                "rejectedPercentage",
                rejectedPercentage
        );

        response.put(
                "wellnessHubsByDistrict",
                wellnessHubsByDistrict
        );

        return response;
    }

    private double calculatePercentage(
            long amount,
            long total
    ) {
        if (total <= 0) {
            return 0.0;
        }

        return BigDecimal.valueOf(amount)
                .multiply(BigDecimal.valueOf(100))
                .divide(
                        BigDecimal.valueOf(total),
                        2,
                        RoundingMode.HALF_UP
                )
                .doubleValue();
    }
}