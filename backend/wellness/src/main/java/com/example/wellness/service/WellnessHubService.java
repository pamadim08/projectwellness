package com.example.wellness.service;

import com.example.wellness.model.Category;
import com.example.wellness.model.District;
import com.example.wellness.model.EmergencyService;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.AccountRequestRepository;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.EmergencyServiceRepository;
import com.example.wellness.repository.WellnessHubRepository;

import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WellnessHubService {

    private final WellnessHubRepository wellnessHubRepository;
    private final EmergencyServiceRepository emergencyServiceRepository;
    private final AccountRequestRepository accountRequestRepository;
    private final CategoryRepository categoryRepository;
    private final DistrictRepository districtRepository;
    private final AccountGeneratorService accountGeneratorService;

    public WellnessHubService(
            WellnessHubRepository wellnessHubRepository,
            EmergencyServiceRepository emergencyServiceRepository,
            AccountRequestRepository accountRequestRepository,
            CategoryRepository categoryRepository,
            DistrictRepository districtRepository,
            AccountGeneratorService accountGeneratorService) {
        this.wellnessHubRepository = wellnessHubRepository;
        this.emergencyServiceRepository = emergencyServiceRepository;
        this.accountRequestRepository = accountRequestRepository;
        this.categoryRepository = categoryRepository;
        this.districtRepository = districtRepository;
        this.accountGeneratorService = accountGeneratorService;
    }

    public Integer generateNextLicenseId() {
        List<WellnessHub> hubs = wellnessHubRepository.findAll();
        List<EmergencyService> services = emergencyServiceRepository.findAll();

        int maxId = 10000;
        for (WellnessHub h : hubs) {
            if (h.getLicenseId() != null && h.getLicenseId() > maxId) {
                maxId = h.getLicenseId();
            }
        }
        for (EmergencyService s : services) {
            if (s.getLicenseId() != null && s.getLicenseId() > maxId) {
                maxId = s.getLicenseId();
            }
        }
        return maxId + 1;
    }

    private static final Set<String> EMERGENCY_CATEGORY_IDS = Set.of("EM01", "EM02");

    private boolean isEmergencyCategory(Category category) {
        return category != null
                && category.getCategoryId() != null
                && EMERGENCY_CATEGORY_IDS.contains(
                        category.getCategoryId().toUpperCase());
    }

    private List<WellnessHub> sortWellnessHubList(List<WellnessHub> list) {
        if (list == null) {
            return new ArrayList<>();
        }

        return list.stream().sorted((a, b) -> {
            LocalDateTime timeA = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
            LocalDateTime timeB = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();

            if (timeA != null && timeB != null) {
                int cmp = timeB.compareTo(timeA);
                if (cmp != 0) {
                    return cmp;
                }
            } else if (timeA == null && timeB != null) {
                return 1;
            } else if (timeA != null && timeB == null) {
                return -1;
            }

            int idA = a.getLicenseId() != null ? a.getLicenseId() : 0;
            int idB = b.getLicenseId() != null ? b.getLicenseId() : 0;
            return Integer.compare(idB, idA);
        }).toList();
    }

    public List<WellnessHub> listWellnessHub() {
        List<WellnessHub> results = new ArrayList<>(wellnessHubRepository.findAll());

        List<WellnessHub> emergencyResults = emergencyServiceRepository.findAll()
                .stream()
                .map(this::convertEmergencyToWellnessHub)
                .toList();

        results.addAll(emergencyResults);

        return sortWellnessHubList(results);
    }

    public List<WellnessHub> listWellnessHub(Map<String, Object> payload) {
        if (payload == null) {
            return listWellnessHub();
        }

        String keyword = payload.get("search") != null
                ? payload.get("search").toString().trim()
                : null;

        String categoryIdStr = payload.get("categoryId") != null
                ? payload.get("categoryId").toString().trim()
                : null;

        String districtIdStr = payload.get("districtId") != null
                ? payload.get("districtId").toString().trim()
                : null;

        List<WellnessHub> filtered = listWellnessHub()
                .stream()
                .filter(hub -> keyword == null ||
                        keyword.isEmpty() ||
                        (hub.getWellnessHubName() != null &&
                                hub.getWellnessHubName()
                                        .toLowerCase()
                                        .contains(keyword.toLowerCase())))
                .filter(hub -> categoryIdStr == null ||
                        categoryIdStr.isEmpty() ||
                        (hub.getCategory() != null &&
                                categoryIdStr.equalsIgnoreCase(
                                        hub.getCategory().getCategoryId())))
                .filter(hub -> districtIdStr == null ||
                        districtIdStr.isEmpty() ||
                        (hub.getDistrict() != null &&
                                districtIdStr.equals(
                                        String.valueOf(
                                                hub.getDistrict().getDistrictId()))))
                .toList();

        return sortWellnessHubList(filtered);
    }

    public WellnessHub viewWellnessHubDetail(Integer id) {
        if (id == null || id <= 0) {
            return null;
        }

        WellnessHub wellnessHub = wellnessHubRepository
                .findById(id)
                .orElse(null);

        if (wellnessHub != null) {
            return wellnessHub;
        }

        EmergencyService emergencyService = emergencyServiceRepository
                .findById(id)
                .orElse(null);

        if (emergencyService != null) {
            return convertEmergencyToWellnessHub(emergencyService);
        }

        return null;
    }

    @Transactional
    public WellnessHub createWellnessHub(WellnessHub wellnessHub) {
        if (wellnessHub.getLicenseId() == null) {
            throw new RuntimeException("กรุณาระบุเลขใบอนุญาตประกอบกิจการ");
        }
        Integer licenseId = wellnessHub.getLicenseId();
        if (wellnessHubRepository.existsById(licenseId)
                || emergencyServiceRepository.existsById(licenseId)) {
            throw new RuntimeException("เลขใบอนุญาตนี้มีอยู่ในระบบแล้ว");
        }

        if (wellnessHub.getCategory() == null || wellnessHub.getCategory().getCategoryId() == null) {
            throw new RuntimeException("กรุณาเลือกหมวดหมู่");
        }
        String categoryId = wellnessHub.getCategory().getCategoryId().trim().toUpperCase();
        Category managedCategory = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่รหัส " + categoryId));
        wellnessHub.setCategory(managedCategory);

        if (wellnessHub.getDistrict() == null || wellnessHub.getDistrict().getDistrictId() == null) {
            throw new RuntimeException("กรุณาเลือกอำเภอ");
        }
        Integer districtId = wellnessHub.getDistrict().getDistrictId();
        District managedDistrict = districtRepository.findById(districtId)
                .orElseThrow(() -> new RuntimeException("ไม่พบอำเภอรหัส " + districtId));
        wellnessHub.setDistrict(managedDistrict);

        boolean isEmergency = isEmergencyCategory(wellnessHub.getCategory());

        // 🔑 Auto-generate Username if not provided
        if (wellnessHub.getUsername() == null || wellnessHub.getUsername().trim().isEmpty()) {
            String prefix = isEmergency ? "ES_" : "WH_";
            String candidateUsername = prefix + licenseId;
            int suffix = 1;
            while (wellnessHubRepository.existsByUsername(candidateUsername)
                    || emergencyServiceRepository.existsByUsername(candidateUsername)) {
                candidateUsername = prefix + licenseId + "_" + suffix++;
            }
            wellnessHub.setUsername(candidateUsername);
        }

        // 🔐 Auto-generate Password if not provided
        if (wellnessHub.getPassword() == null || wellnessHub.getPassword().trim().isEmpty()) {
            wellnessHub.setPassword(accountGeneratorService.generateRandomPassword());
        }

        if (wellnessHub.getCreatedAt() == null) {
            wellnessHub.setCreatedAt(LocalDateTime.now());
        }
        if (wellnessHub.getUpdatedAt() == null) {
            wellnessHub.setUpdatedAt(LocalDateTime.now());
        }
        if (wellnessHub.getStatus() == null || wellnessHub.getStatus().trim().isEmpty()) {
            wellnessHub.setStatus("ACTIVE");
        }

        if (wellnessHub.getGoogleMapsLink() != null && !wellnessHub.getGoogleMapsLink().trim().isEmpty()) {
            extractCoordinates(wellnessHub);
        }

        // 🛡️ ตรวจสอบชื่อซ้ำ และพิกัดแผนที่ซ้ำในระบบ
        List<WellnessHub> allHubs = listWellnessHub();
        String newName = wellnessHub.getWellnessHubName() != null ? wellnessHub.getWellnessHubName().trim() : "";

        for (WellnessHub existing : allHubs) {
            if (licenseId != null && licenseId.equals(existing.getLicenseId())) {
                continue;
            }

            if (!newName.isEmpty() && existing.getWellnessHubName() != null &&
                existing.getWellnessHubName().trim().equalsIgnoreCase(newName)) {
                throw new RuntimeException("ชื่อสถานประกอบการนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
            }

            if (wellnessHub.getGoogleMapsLink() != null && existing.getGoogleMapsLink() != null &&
                !wellnessHub.getGoogleMapsLink().trim().isEmpty() &&
                existing.getGoogleMapsLink().trim().equalsIgnoreCase(wellnessHub.getGoogleMapsLink().trim())) {
                throw new RuntimeException("ลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาใช้ลิงก์อื่น");
            }

            if (wellnessHub.getWellnessHubLatitude() != null && wellnessHub.getWellnessHubLongitude() != null &&
                existing.getWellnessHubLatitude() != null && existing.getWellnessHubLongitude() != null) {
                if (Math.abs(existing.getWellnessHubLatitude() - wellnessHub.getWellnessHubLatitude()) < 0.0001 &&
                    Math.abs(existing.getWellnessHubLongitude() - wellnessHub.getWellnessHubLongitude()) < 0.0001) {
                    throw new RuntimeException("พิกัดละติจูด/ลองจิจูดจาก Google Maps นี้มีอยู่ในระบบแล้ว");
                }
            }
        }

        if (isEmergency) {
            EmergencyService emergency = convertToEmergency(wellnessHub);
            emergencyServiceRepository.save(emergency);
            return wellnessHub;
        }

        return wellnessHubRepository.save(wellnessHub);
    }

    private void extractCoordinates(WellnessHub hub) {
        String originalUrl = hub.getGoogleMapsLink();

        if (originalUrl == null || originalUrl.trim().isEmpty()) {
            hub.setWellnessHubLatitude(null);
            hub.setWellnessHubLongitude(null);
            return;
        }

        String finalUrl = originalUrl.trim();

        if (finalUrl.contains("goo.gl") || finalUrl.contains("maps.app.goo.gl")) {
            finalUrl = expandShortUrl(finalUrl);
        }

        Pattern patternPlace = Pattern.compile("!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)");
        Matcher matcherPlace = patternPlace.matcher(finalUrl);

        Pattern patternAt = Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
        Matcher matcherAt = patternAt.matcher(finalUrl);

        Pattern patternQuery = Pattern.compile("[?&]q=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
        Matcher matcherQuery = patternQuery.matcher(finalUrl);

        Double lat = null;
        Double lng = null;

        if (matcherPlace.find()) {
            lat = Double.parseDouble(matcherPlace.group(1));
            lng = Double.parseDouble(matcherPlace.group(2));
            System.out.println("📌 ใช้ Pattern !3d!4d");
        } else if (matcherQuery.find()) {
            lat = Double.parseDouble(matcherQuery.group(1));
            lng = Double.parseDouble(matcherQuery.group(2));
            System.out.println("📌 ใช้ Pattern q");
        } else if (matcherAt.find()) {
            lat = Double.parseDouble(matcherAt.group(1));
            lng = Double.parseDouble(matcherAt.group(2));
            System.out.println("📌 ใช้ Pattern @ fallback");
        }

        if (isValidCoordinate(lat, lng)) {
            hub.setWellnessHubLatitude(lat);
            hub.setWellnessHubLongitude(lng);
        } else {
            hub.setWellnessHubLatitude(null);
            hub.setWellnessHubLongitude(null);
            System.out.println("⚠️ พิกัดไม่ถูกต้อง ตั้งค่าเป็น NULL");
        }
    }

    private void extractCoordinates(EmergencyService emergency) {
        String originalUrl = emergency.getGoogleMapsLink();

        if (originalUrl == null || originalUrl.trim().isEmpty()) {
            emergency.setWellnessHubLatitude(null);
            emergency.setWellnessHubLongitude(null);
            return;
        }

        String finalUrl = originalUrl.trim();

        if (finalUrl.contains("goo.gl") || finalUrl.contains("maps.app.goo.gl")) {
            finalUrl = expandShortUrl(finalUrl);
        }

        Pattern patternPlace = Pattern.compile("!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)");
        Pattern patternQuery = Pattern.compile("[?&]q=(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");
        Pattern patternAt = Pattern.compile("@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");

        Matcher matcherPlace = patternPlace.matcher(finalUrl);
        Matcher matcherQuery = patternQuery.matcher(finalUrl);
        Matcher matcherAt = patternAt.matcher(finalUrl);

        Double latitude = null;
        Double longitude = null;

        if (matcherPlace.find()) {
            latitude = Double.parseDouble(matcherPlace.group(1));
            longitude = Double.parseDouble(matcherPlace.group(2));
        } else if (matcherQuery.find()) {
            latitude = Double.parseDouble(matcherQuery.group(1));
            longitude = Double.parseDouble(matcherQuery.group(2));
        } else if (matcherAt.find()) {
            latitude = Double.parseDouble(matcherAt.group(1));
            longitude = Double.parseDouble(matcherAt.group(2));
        }

        if (isValidCoordinate(latitude, longitude)) {
            emergency.setWellnessHubLatitude(latitude);
            emergency.setWellnessHubLongitude(longitude);
        } else {
            emergency.setWellnessHubLatitude(null);
            emergency.setWellnessHubLongitude(null);
        }
    }

    private boolean isValidCoordinate(Double lat, Double lng) {
        return lat != null
                && lng != null
                && lat >= -90 && lat <= 90
                && lng >= -180 && lng <= 180;
    }

    private String expandShortUrl(String shortenedUrl) {
        if (shortenedUrl == null || (!shortenedUrl.startsWith("http://") && !shortenedUrl.startsWith("https://"))) {
            return shortenedUrl;
        }

        String currentUrl = shortenedUrl.trim();
        int maxRedirects = 5;

        for (int i = 0; i < maxRedirects; i++) {
            if (!currentUrl.contains("goo.gl") && !currentUrl.contains("maps.app")) {
                break;
            }

            try {
                URL url = new URL(currentUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.connect();

                String location = connection.getHeaderField("Location");
                connection.disconnect();

                if (location != null && !location.trim().isEmpty()) {
                    currentUrl = location.trim();
                } else {
                    break;
                }
            } catch (Exception e) {
                System.err.println("⚠️ ไม่สามารถขยาย Short URL: " + e.getMessage());
                break;
            }
        }

        return currentUrl;
    }

    @Transactional
    public WellnessHub editWellnessHub(
            Integer id,
            WellnessHub updatedData) {
        if (id == null || updatedData == null) {
            return null;
        }

        WellnessHub oldHub = wellnessHubRepository.findById(id).orElse(null);
        EmergencyService oldEmergency = emergencyServiceRepository.findById(id).orElse(null);

        if (oldHub == null && oldEmergency == null) {
            return null;
        }

        if (updatedData.getLicenseId() != null && !id.equals(updatedData.getLicenseId())) {
            throw new RuntimeException("ไม่สามารถเปลี่ยนเลขใบอนุญาตได้");
        }

        Category targetCategory;
        if (updatedData.getCategory() != null
                && updatedData.getCategory().getCategoryId() != null
                && !updatedData.getCategory().getCategoryId().trim().isEmpty()) {

            String categoryId = updatedData.getCategory().getCategoryId().trim().toUpperCase();
            targetCategory = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่รหัส " + categoryId));

        } else if (oldHub != null) {
            targetCategory = oldHub.getCategory();
        } else {
            targetCategory = oldEmergency.getCategory();
        }

        District targetDistrict;
        if (updatedData.getDistrict() != null
                && updatedData.getDistrict().getDistrictId() != null) {

            Integer districtId = updatedData.getDistrict().getDistrictId();
            targetDistrict = districtRepository.findById(districtId)
                    .orElseThrow(() -> new RuntimeException("ไม่พบอำเภอรหัส " + districtId));

        } else if (oldHub != null) {
            targetDistrict = oldHub.getDistrict();
        } else {
            targetDistrict = oldEmergency.getDistrict();
        }

        boolean targetIsEmergency = isEmergencyCategory(targetCategory);

        if (oldEmergency != null && targetIsEmergency) {
            updateEmergencyFields(oldEmergency, updatedData);

            oldEmergency.setCategory(targetCategory);
            oldEmergency.setDistrict(targetDistrict);

            if (updatedData.getGoogleMapsLink() != null) {
                extractCoordinates(oldEmergency);
            }

            EmergencyService savedEmergency = emergencyServiceRepository.save(oldEmergency);

            return convertEmergencyToWellnessHub(savedEmergency);
        }

        if (oldEmergency != null && !targetIsEmergency) {
            updateEmergencyFields(oldEmergency, updatedData);

            oldEmergency.setCategory(targetCategory);
            oldEmergency.setDistrict(targetDistrict);

            if (updatedData.getGoogleMapsLink() != null) {
                extractCoordinates(oldEmergency);
            }

            WellnessHub newHub = convertEmergencyToWellnessHub(oldEmergency);

            newHub.setLicenseId(id);
            newHub.setCategory(targetCategory);
            newHub.setDistrict(targetDistrict);

            emergencyServiceRepository.delete(oldEmergency);

            WellnessHub savedHub = wellnessHubRepository.save(newHub);

            return wellnessHubRepository.save(savedHub);
        }

        if (oldHub != null && targetIsEmergency) {
            applyWellnessHubUpdates(oldHub, updatedData);

            oldHub.setCategory(targetCategory);
            oldHub.setDistrict(targetDistrict);

            EmergencyService emergency = convertToEmergency(oldHub);

            emergency.setLicenseId(id);
            emergency.setCategory(targetCategory);
            emergency.setDistrict(targetDistrict);

            accountRequestRepository.deleteByLicenseId(id);

            wellnessHubRepository.delete(oldHub);

            EmergencyService savedEmergency = emergencyServiceRepository.save(emergency);

            return convertEmergencyToWellnessHub(savedEmergency);
        }

        applyWellnessHubUpdates(oldHub, updatedData);

        oldHub.setCategory(targetCategory);
        oldHub.setDistrict(targetDistrict);

        return wellnessHubRepository.save(oldHub);
    }

    private void applyWellnessHubUpdates(
            WellnessHub target,
            WellnessHub updatedData) {

        if (updatedData.getGoogleMapsLink() != null && !updatedData.getGoogleMapsLink().trim().isEmpty()) {
            if (!updatedData.getGoogleMapsLink().equals(target.getGoogleMapsLink())) {
                target.setGoogleMapsLink(updatedData.getGoogleMapsLink().trim());
                extractCoordinates(target);
            }
        } else if (updatedData.getGoogleMapsLink() != null && updatedData.getGoogleMapsLink().trim().isEmpty()) {
            target.setGoogleMapsLink(null);
            target.setWellnessHubLatitude(null);
            target.setWellnessHubLongitude(null);
        }

        if (updatedData.getWellnessHubName() != null && !updatedData.getWellnessHubName().trim().isEmpty()) {
            target.setWellnessHubName(updatedData.getWellnessHubName().trim());
        }

        // 🛡️ ตรวจสอบชื่อซ้ำ และพิกัดแผนที่ซ้ำในระบบเมื่อทำการแก้ไข
        List<WellnessHub> allHubs = listWellnessHub();
        String newName = target.getWellnessHubName();

        for (WellnessHub existing : allHubs) {
            if (target.getLicenseId() != null && target.getLicenseId().equals(existing.getLicenseId())) {
                continue;
            }

            if (newName != null && !newName.isEmpty() && existing.getWellnessHubName() != null &&
                existing.getWellnessHubName().trim().equalsIgnoreCase(newName.trim())) {
                throw new RuntimeException("ชื่อสถานประกอบการนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
            }

            if (target.getGoogleMapsLink() != null && existing.getGoogleMapsLink() != null &&
                !target.getGoogleMapsLink().trim().isEmpty() &&
                existing.getGoogleMapsLink().trim().equalsIgnoreCase(target.getGoogleMapsLink().trim())) {
                throw new RuntimeException("ลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาใช้ลิงก์อื่น");
            }

            if (target.getWellnessHubLatitude() != null && target.getWellnessHubLongitude() != null &&
                existing.getWellnessHubLatitude() != null && existing.getWellnessHubLongitude() != null) {
                if (Math.abs(existing.getWellnessHubLatitude() - target.getWellnessHubLatitude()) < 0.0001 &&
                    Math.abs(existing.getWellnessHubLongitude() - target.getWellnessHubLongitude()) < 0.0001) {
                    throw new RuntimeException("พิกัดละติจูด/ลองจิจูดจาก Google Maps นี้มีอยู่ในระบบแล้ว");
                }
            }
        }
        if (updatedData.getAddress() != null && !updatedData.getAddress().trim().isEmpty()) {
            target.setAddress(updatedData.getAddress().trim());
        }
        if (updatedData.getTelInformation() != null && !updatedData.getTelInformation().trim().isEmpty()) {
            target.setTelInformation(updatedData.getTelInformation().trim());
        }
        if (updatedData.getWellnessHubDescription() != null) {
            target.setWellnessHubDescription(updatedData.getWellnessHubDescription().trim());
        }
        if (updatedData.getWellnessHubImg() != null) {
            target.setWellnessHubImg(updatedData.getWellnessHubImg());
        }
        if (updatedData.getWellnessHubGallery() != null) {
            target.setWellnessHubGallery(updatedData.getWellnessHubGallery());
        }
        if (updatedData.getCertificateType() != null) {
            target.setCertificateType(updatedData.getCertificateType());
        }
        if (updatedData.getStatus() != null) {
            target.setStatus(updatedData.getStatus());
        }
        if (updatedData.getContactInformation() != null) {
            target.setContactInformation(updatedData.getContactInformation());
        }

        if (updatedData.getOperatingHours() != null) {
            target.setOperatingHours(updatedData.getOperatingHours());
        }

        target.setUpdatedAt(LocalDateTime.now());
    }

    private void updateEmergencyFields(EmergencyService target, WellnessHub source) {
        if (source.getWellnessHubName() != null)
            target.setWellnessHubName(source.getWellnessHubName());
        if (source.getAddress() != null)
            target.setAddress(source.getAddress());
        if (source.getContactInformation() != null)
            target.setContactInformation(source.getContactInformation());
        if (source.getTelInformation() != null)
            target.setTelInformation(source.getTelInformation());
        if (source.getGoogleMapsLink() != null)
            target.setGoogleMapsLink(source.getGoogleMapsLink());
        if (source.getWellnessHubDescription() != null)
            target.setWellnessHubDescription(source.getWellnessHubDescription());
        if (source.getWellnessHubImg() != null)
            target.setWellnessHubImg(source.getWellnessHubImg());
        if (source.getWellnessHubGallery() != null)
            target.setWellnessHubGallery(source.getWellnessHubGallery());
        if (source.getCertificateType() != null)
            target.setCertificateType(source.getCertificateType());
        if (source.getOperatingHours() != null)
            target.setOperatingHours(source.getOperatingHours());
        if (source.getStatus() != null)
            target.setStatus(source.getStatus());

        if (source.getWellnessHubLatitude() != null) {
            target.setWellnessHubLatitude(source.getWellnessHubLatitude());
        }
        if (source.getWellnessHubLongitude() != null) {
            target.setWellnessHubLongitude(source.getWellnessHubLongitude());
        }

        target.setUpdatedAt(LocalDateTime.now());
    }

    @Transactional
    public boolean deleteWellnessHub(Integer id) {
        if (emergencyServiceRepository.existsById(id)) {
            emergencyServiceRepository.deleteById(id);
            return true;
        }

        WellnessHub hub = wellnessHubRepository.findById(id).orElse(null);

        if (hub != null) {
            accountRequestRepository.deleteByLicenseId(id);
            wellnessHubRepository.delete(hub);
            return true;
        }
        return false;
    }

    private EmergencyService convertToEmergency(WellnessHub hub) {
        EmergencyService emergency = new EmergencyService();

        emergency.setLicenseId(hub.getLicenseId());
        emergency.setWellnessHubName(hub.getWellnessHubName());
        emergency.setAddress(hub.getAddress());
        emergency.setContactInformation(hub.getContactInformation());
        emergency.setTelInformation(hub.getTelInformation());
        emergency.setGoogleMapsLink(hub.getGoogleMapsLink());
        emergency.setWellnessHubDescription(hub.getWellnessHubDescription());
        emergency.setWellnessHubImg(hub.getWellnessHubImg());
        emergency.setWellnessHubGallery(hub.getWellnessHubGallery());
        emergency.setWellnessHubLatitude(hub.getWellnessHubLatitude());
        emergency.setWellnessHubLongitude(hub.getWellnessHubLongitude());
        emergency.setCertificateType(hub.getCertificateType());
        emergency.setOperatingHours(hub.getOperatingHours());
        emergency.setCategory(hub.getCategory());
        emergency.setDistrict(hub.getDistrict());
        emergency.setCreatedAt(hub.getCreatedAt());
        emergency.setUpdatedAt(hub.getUpdatedAt());
        emergency.setStatus(hub.getStatus() != null && !hub.getStatus().trim().isEmpty() ? hub.getStatus() : "ACTIVE");

        return emergency;
    }

    private WellnessHub convertEmergencyToWellnessHub(EmergencyService emergency) {
        WellnessHub hub = new WellnessHub();

        hub.setLicenseId(emergency.getLicenseId());
        hub.setWellnessHubName(emergency.getWellnessHubName());
        hub.setAddress(emergency.getAddress());
        hub.setContactInformation(emergency.getContactInformation());
        hub.setTelInformation(emergency.getTelInformation());
        hub.setGoogleMapsLink(emergency.getGoogleMapsLink());
        hub.setWellnessHubDescription(emergency.getWellnessHubDescription());
        hub.setWellnessHubImg(emergency.getWellnessHubImg());
        hub.setWellnessHubGallery(emergency.getWellnessHubGallery());
        hub.setWellnessHubLatitude(emergency.getWellnessHubLatitude());
        hub.setWellnessHubLongitude(emergency.getWellnessHubLongitude());
        hub.setCertificateType(emergency.getCertificateType());
        hub.setOperatingHours(emergency.getOperatingHours());
        hub.setCategory(emergency.getCategory());
        hub.setDistrict(emergency.getDistrict());
        hub.setCreatedAt(emergency.getCreatedAt());
        hub.setUpdatedAt(emergency.getUpdatedAt());
        hub.setStatus(emergency.getStatus() != null && !emergency.getStatus().trim().isEmpty() ? emergency.getStatus()
                : "ACTIVE");

        return hub;
    }

    // @PostConstruct
    // public void migrateOldGoogleMapsLinks() {
    // System.out.println("==================================================");
    // System.out.println("🔄 [Data Migration] เริ่มตรวจสอบพิกัดข้อมูลเก่า");

    // int wellnessSuccessCount = 0;
    // int wellnessFailedCount = 0;

    // int emergencySuccessCount = 0;
    // int emergencyFailedCount = 0;

    // List<WellnessHub> allHubs = wellnessHubRepository.findAll();

    // for (WellnessHub hub : allHubs) {
    // if (!shouldMigrateCoordinates(
    // hub.getGoogleMapsLink(),
    // hub.getWellnessHubLatitude(),
    // hub.getWellnessHubLongitude())) {
    // continue;
    // }

    // try {
    // extractCoordinates(hub);

    // if (hub.getWellnessHubLatitude() != null && hub.getWellnessHubLongitude() !=
    // null) {
    // wellnessSuccessCount++;
    // System.out.println("✅ Wellness Hub: [" + hub.getWellnessHubName() + "]
    // อัปเดตพิกัดสำเร็จ");
    // } else {
    // wellnessFailedCount++;
    // System.out.println("🟡 Wellness Hub: [" + hub.getWellnessHubName() + "]
    // ไม่สามารถสกัดพิกัดได้");
    // }

    // wellnessHubRepository.save(hub);
    // Thread.sleep(500);

    // } catch (InterruptedException exception) {
    // System.err.println("❌ การ Migration ถูกขัดจังหวะ: " +
    // exception.getMessage());
    // Thread.currentThread().interrupt();
    // break;
    // } catch (Exception exception) {
    // wellnessFailedCount++;
    // System.err.println("❌ เกิดข้อผิดพลาดที่ Wellness Hub [" +
    // hub.getWellnessHubName() + "]: "
    // + exception.getMessage());
    // }
    // }

    // List<EmergencyService> allEmergencyServices =
    // emergencyServiceRepository.findAll();

    // for (EmergencyService emergency : allEmergencyServices) {
    // if (!shouldMigrateCoordinates(
    // emergency.getGoogleMapsLink(),
    // emergency.getWellnessHubLatitude(),
    // emergency.getWellnessHubLongitude())) {
    // continue;
    // }

    // try {
    // extractCoordinates(emergency);

    // if (emergency.getWellnessHubLatitude() != null &&
    // emergency.getWellnessHubLongitude() != null) {
    // emergencySuccessCount++;
    // System.out
    // .println("✅ Emergency Service: [" + emergency.getWellnessHubName() + "]
    // อัปเดตพิกัดสำเร็จ");
    // } else {
    // emergencyFailedCount++;
    // System.out.println(
    // "🟡 Emergency Service: [" + emergency.getWellnessHubName() + "]
    // ไม่สามารถสกัดพิกัดได้");
    // }

    // emergencyServiceRepository.save(emergency);
    // Thread.sleep(500);

    // } catch (InterruptedException exception) {
    // System.err.println("❌ การ Migration ถูกขัดจังหวะ: " +
    // exception.getMessage());
    // Thread.currentThread().interrupt();
    // break;
    // } catch (Exception exception) {
    // emergencyFailedCount++;
    // System.err.println("❌ เกิดข้อผิดพลาดที่ Emergency Service [" +
    // emergency.getWellnessHubName() + "]: "
    // + exception.getMessage());
    // }
    // }

    // System.out.println("==================================================");
    // System.out.println("🎉 [Data Migration] ตรวจสอบข้อมูลเก่าเสร็จสิ้น");
    // System.out.println("🟢 Wellness Hub สำเร็จ: " + wellnessSuccessCount + "
    // รายการ");
    // System.out.println("🟡 Wellness Hub ไม่สำเร็จ: " + wellnessFailedCount + "
    // รายการ");
    // System.out.println("🟢 Emergency Service สำเร็จ: " + emergencySuccessCount +
    // " รายการ");
    // System.out.println("🟡 Emergency Service ไม่สำเร็จ: " + emergencyFailedCount
    // + " รายการ");
    // System.out.println("==================================================");
    // }

    private boolean shouldMigrateCoordinates(
            String googleMapsLink,
            Double latitude,
            Double longitude) {
        if (googleMapsLink == null || googleMapsLink.trim().isEmpty()) {
            return false;
        }

        String normalizedLink = googleMapsLink.trim().toLowerCase();

        boolean validUrl = normalizedLink.startsWith("http://") || normalizedLink.startsWith("https://");
        boolean missingCoordinates = latitude == null || longitude == null;

        return validUrl && missingCoordinates;
    }
}