package com.example.wellness.service;

import com.example.wellness.model.MainRoute;
import com.example.wellness.model.MainRouteDetail;
import com.example.wellness.model.District;
import com.example.wellness.model.Category;
import com.example.wellness.repository.MainRouteRepository;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.WellnessHubRepository;
import com.example.wellness.repository.EmergencyServiceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MainRouteService {

    // 🌟 6. เพิ่มค่าคงที่สำหรับหมวดฉุกเฉิน
    private static final List<String> REQUIRED_EMERGENCY_CATEGORY_IDS = List.of("EM01", "EM02");

    @Autowired
    private MainRouteRepository mainRouteRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private WellnessHubRepository wellnessHubRepository;

    @Autowired
    private EmergencyServiceRepository emergencyServiceRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // 🌟 6. เพิ่ม Helper Normalize เพื่อรวม EM01 และ EM02 เสมอ
    private List<String> normalizeCategoryIds(Object categoryIdsRaw) {
        LinkedHashSet<String> categoryIds = new LinkedHashSet<>();

        if (categoryIdsRaw instanceof List<?> rawList) {
            rawList.stream()
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .forEach(categoryIds::add);
        } else if (categoryIdsRaw != null) {
            String value = categoryIdsRaw.toString().trim();
            if (!value.isEmpty()) {
                categoryIds.add(value);
            }
        }

        categoryIds.addAll(REQUIRED_EMERGENCY_CATEGORY_IDS);

        return new ArrayList<>(categoryIds);
    }

    public List<MainRoute> getAllMainRoutes() {
        return mainRouteRepository.findAll();
    }

    public MainRoute getMainRouteById(Integer id) {
        return mainRouteRepository.findById(id).orElse(null);
    }

    // 🏛️ เมธอดสำหรับดึงข้อมูลสรุปไปแสดงที่หน้าตาราง ListMainRoute
    public List<Map<String, Object>> listMainRoute() {

        List<MainRoute> routes = mainRouteRepository.findAll();
        List<Map<String, Object>> resultList = new ArrayList<>();

        List<Category> allCategories = categoryRepository.findAll();

        for (MainRoute route : routes) {

            Map<String, Object> map = new HashMap<>();

            map.put("routeId", route.getRouteId());
            map.put("routeName", route.getRouteName());
            map.put("routeDescription", route.getRouteDescription());
            map.put("routeImage", route.getRouteImage());

            String districtsPassed = route.getDetails().stream()
                    .sorted(Comparator.comparing(MainRouteDetail::getOrderNumber))
                    .map(d -> "อ." + d.getDistrict().getDistrictName())
                    .collect(Collectors.joining(" -> "));

            map.put(
                    "districtsPassed",
                    districtsPassed.isEmpty()
                            ? "ยังไม่ได้กำหนดอำเภอ"
                            : districtsPassed);

            List<String> catIds = new ArrayList<>();

            if (route.getCategoryId() != null && !route.getCategoryId().isEmpty()) {
                try {
                    catIds.addAll(
                            objectMapper.readValue(
                                    route.getCategoryId(),
                                    new TypeReference<List<String>>() {
                                    }));
                } catch (Exception e) {
                    catIds.add(route.getCategoryId());
                }
            }

            String categoriesPassed = allCategories.stream()
                    .filter(c -> catIds.contains(
                            String.valueOf(c.getCategoryId())))
                    .map(Category::getCategoryName)
                    .collect(Collectors.joining(", "));

            map.put(
                    "categoriesPassed",
                    categoriesPassed.isEmpty()
                            ? "ยังไม่ได้กำหนดหมวดหมู่"
                            : categoriesPassed);

            map.put("createdBy", route.getCreatedBy());
            map.put("createdAt", route.getCreatedAt());
            map.put("updatedAt", route.getUpdatedAt());

            // อ่านค่าที่คำนวณไว้แล้ว
            map.put("pinCount", route.getPinCount());

            resultList.add(map);
        }

        return resultList;
    }

    // 🌟 7. แก้การนับหมุดให้รวมทั้ง wellness_hubs และ emergency_services
    private void calculatePinCount(MainRoute route) {

        final List<String> categoryIds = new ArrayList<>();

        try {
            if (route.getCategoryId() != null
                    && !route.getCategoryId().trim().isEmpty()) {

                List<String> parsed = objectMapper.readValue(
                        route.getCategoryId(),
                        new TypeReference<List<String>>() {
                        });

                if (parsed != null) {
                    categoryIds.addAll(parsed);
                }
            }
        } catch (Exception e) {
            if (route.getCategoryId() != null) {
                categoryIds.add(route.getCategoryId());
            }
        }

        // รวม EM01 และ EM02 เสมอ
        categoryIds.addAll(REQUIRED_EMERGENCY_CATEGORY_IDS);

        List<String> distinctCategoryIds = categoryIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();

        List<Integer> districtIds = route.getDetails()
                .stream()
                .filter(detail -> detail.getDistrict() != null)
                .map(detail -> detail.getDistrict().getDistrictId())
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        long wellnessHubCount = wellnessHubRepository.findAll()
                .stream()
                .filter(h -> h.getDistrict() != null
                        && districtIds.contains(
                                h.getDistrict().getDistrictId()))
                .filter(h -> h.getCategory() != null
                        && distinctCategoryIds.contains(
                                String.valueOf(
                                        h.getCategory().getCategoryId())))
                .filter(h -> isValidCoordinate(
                        h.getWellnessHubLatitude(),
                        h.getWellnessHubLongitude()))
                .count();

        long emergencyServiceCount = emergencyServiceRepository.findAll()
                .stream()
                .filter(e -> e.getDistrict() != null
                        && districtIds.contains(
                                e.getDistrict().getDistrictId()))
                .filter(e -> e.getCategory() != null
                        && distinctCategoryIds.contains(
                                String.valueOf(
                                        e.getCategory().getCategoryId())))
                .filter(e -> isValidCoordinate(
                        e.getWellnessHubLatitude(),
                        e.getWellnessHubLongitude()))
                .count();

        route.setPinCount(
                (int) (wellnessHubCount + emergencyServiceCount));
    }

    private boolean isValidCoordinate(
            Double latitude,
            Double longitude) {
        return latitude != null
                && longitude != null
                && latitude >= -90
                && latitude <= 90
                && longitude >= -180
                && longitude <= 180;
    }

    // 🟢 เมธอดสร้างเส้นทางท่องเที่ยวใหม่
    @Transactional
    public MainRoute createMainRoute(Map<String, Object> payload) {
        MainRoute route = convertPayloadToEntity(payload);

        route.setCreatedAt(LocalDateTime.now());
        route.setUpdatedAt(LocalDateTime.now());
        route.setCreatedBy(
                payload.get("createdBy") != null ? payload.get("createdBy").toString() : "admin");

        if (route.getDetails() != null) {
            for (MainRouteDetail detail : route.getDetails()) {
                detail.setMainRoute(route);
            }
        }

        calculatePinCount(route);

        return mainRouteRepository.save(route);
    }

    // 🟡 เมธอดแก้ไขอัปเดตทับข้อมูลเดิม
    @Transactional
    public MainRoute editMainRoute(Integer id, Map<String, Object> payload) {
        MainRoute oldRoute = mainRouteRepository.findById(id).orElse(null);

        if (oldRoute != null) {
            MainRoute incomingRoute = convertPayloadToEntity(payload);

            oldRoute.setRouteName(incomingRoute.getRouteName());
            oldRoute.setRouteDescription(incomingRoute.getRouteDescription());
            oldRoute.setCategoryId(incomingRoute.getCategoryId());
            oldRoute.setRouteImage(incomingRoute.getRouteImage());

            oldRoute.getDetails().clear();

            if (incomingRoute.getDetails() != null) {
                for (MainRouteDetail detail : incomingRoute.getDetails()) {
                    detail.setMainRoute(oldRoute);
                    oldRoute.getDetails().add(detail);
                }
            }

            oldRoute.setUpdatedAt(LocalDateTime.now());

            calculatePinCount(oldRoute);

            return mainRouteRepository.save(oldRoute);
        }

        return null;
    }

    // 🛠️ 6. ปรับปรุงตรรกะแปลง Payload เป็น Entity ให้บังคับเซฟ EM01, EM02 เสมอ
    private MainRoute convertPayloadToEntity(Map<String, Object> payload) {
        MainRoute route = new MainRoute();

        route.setRouteName(payload.get("routeName").toString());
        route.setRouteDescription(
                payload.get("routeDescription") != null
                        ? payload.get("routeDescription").toString()
                        : "");

        // Set route image if provided in payload
        if (payload.get("routeImage") != null) {
            route.setRouteImage(payload.get("routeImage").toString());
        }

        try {
            List<String> categoryIds = normalizeCategoryIds(payload.get("categoryIds"));
            String jsonString = objectMapper.writeValueAsString(categoryIds);
            route.setCategoryId(jsonString);
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "ไม่สามารถบันทึกหมวดหมู่ของเส้นทางได้",
                    exception);
        }

        List<MainRouteDetail> detailList = new ArrayList<>();
        List<Map<String, Object>> detailsRaw = (List<Map<String, Object>>) payload.get("details");

        if (detailsRaw != null) {
            for (Map<String, Object> raw : detailsRaw) {
                MainRouteDetail detail = new MainRouteDetail();

                detail.setOrderNumber(
                        Integer.parseInt(
                                raw.get("orderNumber").toString()));

                District dist = districtRepository.findById(
                        Integer.parseInt(
                                raw.get("districtId").toString()))
                        .orElse(null);

                if (dist != null) {
                    detail.setDistrict(dist);
                    detailList.add(detail);
                }
            }
        }

        route.setDetails(detailList);

        return route;
    }

    // 🗑️ เมธอดสำหรับลบข้อมูลเส้นทางสุขภาพหลัก
    @Transactional
    public boolean deleteMainRoute(Integer id) {
        if (mainRouteRepository.existsById(id)) {
            mainRouteRepository.deleteById(id);
            return true;
        }

        return false;
    }
}