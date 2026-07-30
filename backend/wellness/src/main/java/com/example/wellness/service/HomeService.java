package com.example.wellness.service;

import com.example.wellness.model.Category;
import com.example.wellness.model.District;
import com.example.wellness.model.MainRoute;
import com.example.wellness.model.MainRouteDetail;
import com.example.wellness.model.OfficialArticle;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.HomeRepository;
import com.example.wellness.repository.MainRouteRepository;
import com.example.wellness.repository.WellnessHubRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class HomeService {

    private final HomeRepository homeRepository;
    private final MainRouteRepository mainRouteRepository;
    private final CategoryRepository categoryRepository;
    private final WellnessHubRepository wellnessHubRepository;
    private final ObjectMapper objectMapper;

    public HomeService(
            HomeRepository homeRepository,
            MainRouteRepository mainRouteRepository,
            CategoryRepository categoryRepository,
            WellnessHubRepository wellnessHubRepository,
            ObjectMapper objectMapper) {
        this.homeRepository = homeRepository;
        this.mainRouteRepository = mainRouteRepository;
        this.categoryRepository = categoryRepository;
        this.wellnessHubRepository = wellnessHubRepository;
        this.objectMapper = objectMapper;
    }

    /*
     * =====================================================
     * ดึงข้อมูลทั้งหมดที่ใช้ในหน้า Home
     * =====================================================
     */
    public Map<String, Object> getHomeData() {
        List<MainRoute> recommendedRoutes = homeRepository.findRecommendedRoutes();
        List<OfficialArticle> latestArticles = homeRepository.findLatestArticles();

        Map<String, Object> homeData = new LinkedHashMap<>();
        homeData.put("recommendedRoutes", recommendedRoutes);
        homeData.put("latestArticles", latestArticles);

        return homeData;
    }

    public List<MainRoute> getRecommendedRoutes() {
        return homeRepository.findRecommendedRoutes();
    }

    public List<OfficialArticle> getLatestArticles() {
        return homeRepository.findLatestArticles();
    }

    public List<MainRoute> getAllRoutes() {
        return homeRepository.findAllRoutes();
    }

    public List<OfficialArticle> getAllArticles() {
        return homeRepository.findAllArticles();
    }

    /*
     * =====================================================
     * รายละเอียดเส้นทางท่องเที่ยว
     * =====================================================
     */
    public Map<String, Object> getRouteDetail(Integer routeId) {
        if (routeId == null || routeId <= 0) {
            return null;
        }

        MainRoute route = mainRouteRepository.findById(routeId).orElse(null);
        if (route == null) {
            return null;
        }

        List<MainRouteDetail> sortedDetails = route.getDetails() == null
                ? new ArrayList<>()
                : route.getDetails()
                        .stream()
                        .filter(detail -> detail != null && detail.getDistrict() != null)
                        .sorted(
                                Comparator.comparing(
                                        MainRouteDetail::getOrderNumber,
                                        Comparator.nullsLast(Comparator.naturalOrder())))
                        .toList();

        List<String> categoryIds = parseCategoryIds(route.getCategoryId());

        List<Integer> districtIds = sortedDetails.stream()
                .map(MainRouteDetail::getDistrict)
                .map(District::getDistrictId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        List<Category> categories = categoryIds.isEmpty()
                ? new ArrayList<>()
                : categoryRepository.findAllById(categoryIds);

        List<WellnessHub> wellnessHubs;

        if (districtIds.isEmpty() || categoryIds.isEmpty()) {
            wellnessHubs = new ArrayList<>();
        } else {
            wellnessHubs = wellnessHubRepository
                    .findByDistrict_DistrictIdInAndCategory_CategoryIdIn(
                            districtIds,
                            categoryIds)
                    .stream()
                    .filter(hub -> hub.getWellnessHubLatitude() != null &&
                            hub.getWellnessHubLongitude() != null)
                    .toList();
        }

        List<Map<String, Object>> districtMaps = new ArrayList<>();

        for (MainRouteDetail detail : sortedDetails) {
            District district = detail.getDistrict();

            Map<String, Object> districtMap = new LinkedHashMap<>();
            districtMap.put("orderNumber", detail.getOrderNumber());
            districtMap.put("districtId", district.getDistrictId());
            districtMap.put("districtName", district.getDistrictName());
            districtMap.put("latitude", district.getLatitude());
            districtMap.put("longitude", district.getLongitude());

            long wellnessHubCount = wellnessHubs.stream()
                    .filter(hub -> hub.getDistrict() != null &&
                            district.getDistrictId().equals(hub.getDistrict().getDistrictId()))
                    .count();

            districtMap.put("wellnessHubCount", wellnessHubCount);
            districtMaps.add(districtMap);
        }

        List<Map<String, Object>> categoryMaps = categories.stream()
                .map(category -> {
                    Map<String, Object> categoryMap = new LinkedHashMap<>();
                    categoryMap.put("categoryId", category.getCategoryId());
                    categoryMap.put("categoryName", category.getCategoryName());
                    return categoryMap;
                })
                .toList();

        List<Map<String, Object>> wellnessHubMaps = wellnessHubs.stream()
                .map(this::convertWellnessHubToMap)
                .toList();

        String startDistrict = districtMaps.isEmpty()
                ? null
                : String.valueOf(districtMaps.get(0).get("districtName"));

        String endDistrict = districtMaps.isEmpty()
                ? null
                : String.valueOf(districtMaps.get(districtMaps.size() - 1).get("districtName"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("routeId", route.getRouteId());
        result.put("routeName", route.getRouteName());

        putIfNotBlank(result, "routeDescription", route.getRouteDescription());

        if (startDistrict != null) {
            result.put("startDistrict", startDistrict);
        }

        if (endDistrict != null) {
            result.put("endDistrict", endDistrict);
        }

        result.put("districtCount", districtMaps.size());
        result.put("wellnessHubCount", wellnessHubMaps.size());
        result.put("categories", categoryMaps);
        result.put("districts", districtMaps);
        result.put("wellnessHubs", wellnessHubMaps);

        if (route.getUpdatedAt() != null) {
            result.put("updatedAt", route.getUpdatedAt());
        }

        return result;
    }

    /*
     * =====================================================
     * รายละเอียดสถานประกอบการ
     * =====================================================
     */
    public Map<String, Object> getWellnessHubDetail(Integer licenseId) {
        if (licenseId == null || licenseId <= 0) {
            return null;
        }

        WellnessHub wellnessHub = wellnessHubRepository.findById(licenseId).orElse(null);

        if (wellnessHub == null) {
            return null;
        }

        return convertWellnessHubToMap(wellnessHub);
    }

    /*
     * =====================================================
     * Helper Methods
     * =====================================================
     */
    private List<String> parseCategoryIds(String categoryIdValue) {
        List<String> categoryIds = new ArrayList<>();

        if (categoryIdValue == null || categoryIdValue.trim().isEmpty()) {
            return categoryIds;
        }

        try {
            List<String> parsedCategoryIds = objectMapper.readValue(
                    categoryIdValue,
                    new TypeReference<List<String>>() {
                    });

            if (parsedCategoryIds != null) {
                parsedCategoryIds.stream()
                        .filter(id -> id != null && !id.trim().isEmpty())
                        .map(String::trim)
                        .distinct()
                        .forEach(categoryIds::add);
            }
        } catch (Exception exception) {
            categoryIds.add(categoryIdValue.trim());
        }

        return categoryIds;
    }

    private Map<String, Object> convertWellnessHubToMap(WellnessHub wellnessHub) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("licenseId", wellnessHub.getLicenseId());
        map.put("wellnessHubName", wellnessHub.getWellnessHubName());

        putIfNotBlank(map, "wellnessHubDescription", wellnessHub.getWellnessHubDescription());
        putIfNotBlank(map, "address", wellnessHub.getAddress());
        putIfNotBlank(map, "contactInformation", wellnessHub.getContactInformation());
        putIfNotBlank(map, "telInformation", wellnessHub.getTelInformation());
        putIfNotBlank(map, "googleMapsLink", wellnessHub.getGoogleMapsLink());
        putIfNotBlank(map, "wellnessHubImg", wellnessHub.getWellnessHubImg());
        putIfNotBlank(map, "certificateType", wellnessHub.getCertificateType());
        putIfNotBlank(map, "operatingHours", wellnessHub.getOperatingHours());

        if (wellnessHub.getWellnessHubLatitude() != null) {
            map.put("latitude", wellnessHub.getWellnessHubLatitude());
        }

        if (wellnessHub.getWellnessHubLongitude() != null) {
            map.put("longitude", wellnessHub.getWellnessHubLongitude());
        }

        if (wellnessHub.getCategory() != null) {
            map.put("categoryId", wellnessHub.getCategory().getCategoryId());
            map.put("categoryName", wellnessHub.getCategory().getCategoryName());
        }

        if (wellnessHub.getDistrict() != null) {
            map.put("districtId", wellnessHub.getDistrict().getDistrictId());
            map.put("districtName", wellnessHub.getDistrict().getDistrictName());
        }

        return map;
    }

    private void putIfNotBlank(Map<String, Object> map, String key, String value) {
        if (value != null && !value.trim().isEmpty()) {
            map.put(key, value.trim());
        }
    }
}