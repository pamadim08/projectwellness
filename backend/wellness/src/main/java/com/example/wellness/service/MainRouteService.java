package com.example.wellness.service;

import com.example.wellness.model.MainRoute;
import com.example.wellness.model.MainRouteDetail;
import com.example.wellness.model.District;
import com.example.wellness.model.Category;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.MainRouteRepository;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.WellnessHubRepository;
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

    @Autowired
    private MainRouteRepository mainRouteRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private CategoryRepository categoryRepository; // 🌟 ดึงข้อมูลมาแปลงชื่อหมวดหมู่จาก JSON

    @Autowired
    private WellnessHubRepository wellnessHubRepository; // 🌟 ดึงข้อมูลมานับจำนวนเวลเนสในอำเภอ

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<MainRoute> getAllMainRoutes() {
        return mainRouteRepository.findAll();
    }

    public MainRoute getMainRouteById(Integer id) {
        return mainRouteRepository.findById(id).orElse(null);
    }

    // 🏛️ เมธอดใหม่: สำหรับดึงข้อมูลสรุปไปแสดงที่หน้าตาราง ListMainRoute
    // (นับรวมสถานประกอบการตรงๆ ไม่กรองหมวดหมู่)
    public List<Map<String, Object>> getAllMainRoutesForList() {
        List<MainRoute> routes = mainRouteRepository.findAll();
        List<Map<String, Object>> resultList = new ArrayList<>();

        List<WellnessHub> allHubs = wellnessHubRepository.findAll();
        List<Category> allCategories = categoryRepository.findAll();

        for (MainRoute route : routes) {
            Map<String, Object> map = new HashMap<>();
            map.put("routeId", route.getRouteId());
            map.put("routeName", route.getRouteName());
            map.put("routeDescription", route.getRouteDescription());

            // 🗺️ 1. รายชื่ออำเภอที่วิ่งผ่านตามลำดับ (เช่น "อ.เมืองเชียงใหม่ -> อ.แม่ริม")
            String districtsPassed = route.getDetails().stream()
                    .sorted(Comparator.comparing(MainRouteDetail::getOrderNumber))
                    .map(d -> "อ." + d.getDistrict().getDistrictName())
                    .collect(Collectors.joining(" -> "));
            map.put("districtsPassed", districtsPassed.isEmpty() ? "ยังไม่ได้กำหนดอำเภอ" : districtsPassed);

            // 🎨 2. แกะข้อความ JSON หมวดหมู่ผูกเป็นชื่อประเภทบริการแสดงบนตาราง
            final List<String> catIds = new ArrayList<>();
            if (route.getCategoryId() != null && !route.getCategoryId().trim().isEmpty()) {
                try {
                    List<String> parsed = objectMapper.readValue(route.getCategoryId(),
                            new TypeReference<List<String>>() {
                            });
                    if (parsed != null) {
                        catIds.addAll(parsed);
                    }
                } catch (Exception e) {
                    catIds.add(route.getCategoryId());
                }
            }

            String categoriesPassed = allCategories.stream()
                    .filter(c -> catIds.contains(String.valueOf(c.getCategoryId())))
                    .map(Category::getCategoryName)
                    .collect(Collectors.joining(", "));
            map.put("categoriesPassed", categoriesPassed.isEmpty() ? "ยังไม่ได้กำหนดหมวดหมู่" : categoriesPassed);
            map.put("createdBy", route.getCreatedBy());
            map.put("createdAt", route.getCreatedAt());
            map.put("updatedAt", route.getUpdatedAt());

            // 🏢 3. นับจำนวนสถานประกอบการในอำเภอที่วิ่งผ่านตรงๆ
            // (ไม่มีการกรองหมวดหมู่ซ้ำซ้อน)
            List<Integer> activeDistrictIds = route.getDetails().stream()
                    .filter(d -> d.getDistrict() != null)
                    .map(d -> d.getDistrict().getDistrictId())
                    .collect(Collectors.toList());

            long pinCount = allHubs.stream()
                    .filter(h -> h.getDistrict() != null)
                    .filter(h -> activeDistrictIds.contains(h.getDistrict().getDistrictId()))
                    .filter(h -> h.getCategory() != null)
                    .filter(h -> catIds.contains(String.valueOf(h.getCategory().getCategoryId())))
                    .filter(h -> h.getWellnessHubLatitude() != null && h.getWellnessHubLongitude() != null)
                    .count();

            map.put("pinCount", pinCount);

            resultList.add(map);
        }
        return resultList;
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

        return mainRouteRepository.save(route);
    }

    
    // 🟡 เมธอดแก้ไขอัปเดตทับข้อมูลเดิม
    @Transactional
    public MainRoute updateMainRoute(Integer id, Map<String, Object> payload) {
        MainRoute oldRoute = mainRouteRepository.findById(id).orElse(null);
        if (oldRoute != null) {
            MainRoute incomingRoute = convertPayloadToEntity(payload);

            oldRoute.setRouteName(incomingRoute.getRouteName());
            oldRoute.setRouteDescription(incomingRoute.getRouteDescription());
            oldRoute.setCategoryId(incomingRoute.getCategoryId());

            oldRoute.getDetails().clear();
            if (incomingRoute.getDetails() != null) {
                for (MainRouteDetail detail : incomingRoute.getDetails()) {
                    detail.setMainRoute(oldRoute);
                    oldRoute.getDetails().add(detail);
                }
            }
            oldRoute.setUpdatedAt(LocalDateTime.now());
            return mainRouteRepository.save(oldRoute);
        }
        return null;
    }

    // 🛠️ ตรรกะแปลงร่างแมปข้อมูล
    private MainRoute convertPayloadToEntity(Map<String, Object> payload) {
        MainRoute route = new MainRoute();
        route.setRouteName(payload.get("routeName").toString());
        route.setRouteDescription(
                payload.get("routeDescription") != null ? payload.get("routeDescription").toString() : "");

        try {
            Object catIdsRaw = payload.get("categoryIds");
            if (catIdsRaw != null) {
                String jsonString = objectMapper.writeValueAsString(catIdsRaw);
                route.setCategoryId(jsonString);
            }
        } catch (Exception e) {
            System.err.println("⚠️ ไม่สามารถแปลงกลุ่มหมวดหมู่เป็น JSON String ได้: " + e.getMessage());
        }

        List<MainRouteDetail> detailList = new ArrayList<>();
        List<Map<String, Object>> detailsRaw = (List<Map<String, Object>>) payload.get("details");
        if (detailsRaw != null) {
            for (Map<String, Object> raw : detailsRaw) {
                MainRouteDetail detail = new MainRouteDetail();
                detail.setOrderNumber(Integer.parseInt(raw.get("orderNumber").toString()));

                District dist = districtRepository.findById(Integer.parseInt(raw.get("districtId").toString()))
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

    // 🗑️ เมธอดสำหรับลบข้อมูลเส้นทางสุขภาพหลัก (ล้างตารางลูกรายละเอียดอัตโนมัติ)
    @Transactional
    public boolean deleteMainRoute(Integer id) {
        if (mainRouteRepository.existsById(id)) {
            mainRouteRepository.deleteById(id);
            return true;
        }
        return false;
    }
}