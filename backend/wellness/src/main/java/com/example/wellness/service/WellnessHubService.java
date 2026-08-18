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
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WellnessHubService {

    @Autowired
    private WellnessHubRepository wellnessHubRepository;

    @Autowired
    private EmergencyServiceRepository emergencyServiceRepository;

    @Autowired
    private AccountRequestRepository accountRequestRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private DistrictRepository districtRepository;

    private static final Set<String> EMERGENCY_CATEGORY_IDS = Set.of("EM01", "EM02");

    private boolean isEmergencyCategory(Category category) {
        return category != null
                && category.getCategoryId() != null
                && EMERGENCY_CATEGORY_IDS.contains(
                        category.getCategoryId().toUpperCase());
    }

    public List<WellnessHub> getAllHubs() {
        List<WellnessHub> results = new ArrayList<>(wellnessHubRepository.findAll());

        List<WellnessHub> emergencyResults = emergencyServiceRepository.findAll()
                .stream()
                .map(this::convertEmergencyToWellnessHub)
                .toList();

        results.addAll(emergencyResults);

        return results;
    }

    public List<WellnessHub> searchWellnessHubs(Map<String, Object> payload) {
        if (payload == null) {
            return getAllHubs();
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

        return getAllHubs()
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
    }

    public WellnessHub getHubById(Integer id) {
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
            throw new RuntimeException("กรุณาระบุเลขใบอนุญาต");
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

        if (wellnessHub.getStatus() == null) {
            wellnessHub.setStatus("active");
        }

        if (wellnessHub.getGoogleMapsLink() != null && !wellnessHub.getGoogleMapsLink().trim().isEmpty()) {
            extractCoordinates(wellnessHub);
        }

        if (isEmergencyCategory(wellnessHub.getCategory())) {
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
        try {
            if (!shortenedUrl.startsWith("http://") && !shortenedUrl.startsWith("https://")) {
                return shortenedUrl;
            }
            URL url = new URL(shortenedUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            connection.connect();

            String expandedUrl = connection.getHeaderField("Location");
            connection.disconnect();

            return (expandedUrl != null) ? expandedUrl : shortenedUrl;
        } catch (IOException e) {
            System.err.println("❌ ไม่สามารถเชื่อมต่อเพื่อขยายลิงก์ย่อได้: " + e.getMessage());
            return shortenedUrl;
        }
    }

    @Transactional
    public WellnessHub updateWellnessHub(
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

            accountRequestRepository.deleteByWellnessHub_LicenseId(id);

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
    }

    @Transactional
    public boolean deleteWellnessHub(Integer id) {
        if (emergencyServiceRepository.existsById(id)) {
            emergencyServiceRepository.deleteById(id);
            return true;
        }

        WellnessHub hub = wellnessHubRepository.findById(id).orElse(null);

        if (hub != null) {
            accountRequestRepository.deleteByWellnessHub_LicenseId(id);
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
        emergency.setWellnessHubLatitude(hub.getWellnessHubLatitude());
        emergency.setWellnessHubLongitude(hub.getWellnessHubLongitude());
        emergency.setCertificateType(hub.getCertificateType());
        emergency.setOperatingHours(hub.getOperatingHours());
        emergency.setCategory(hub.getCategory());
        emergency.setDistrict(hub.getDistrict());
        emergency.setStatus(hub.getStatus() != null ? hub.getStatus() : "active");

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
        hub.setWellnessHubLatitude(emergency.getWellnessHubLatitude());
        hub.setWellnessHubLongitude(emergency.getWellnessHubLongitude());
        hub.setCertificateType(emergency.getCertificateType());
        hub.setOperatingHours(emergency.getOperatingHours());
        hub.setCategory(emergency.getCategory());
        hub.setDistrict(emergency.getDistrict());
        hub.setStatus(emergency.getStatus());

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