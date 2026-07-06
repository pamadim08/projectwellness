package com.example.wellness.service;

import com.example.wellness.model.Category;
import com.example.wellness.model.District;
import com.example.wellness.model.OperatingHour;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.WellnessHubRepository;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.OperatingHourRepository; // 👈 แทรกเพิ่มตรงนี้
import jakarta.annotation.PostConstruct; // 🌟 เพิ่ม Import ตัวนี้เพื่อใช้ทำระบบกวาดข้อมูลเก่าตอนรันเซิร์ฟเวอร์

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
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
    private CategoryRepository categoryRepository;
    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private OperatingHourRepository operatingHourRepository; // 👈 แทรกเพิ่มตรงนี้

    public List<WellnessHub> getAllHubs() {
        return wellnessHubRepository.findAll();
    }

    public List<WellnessHub> searchWellnessHubs(Map<String, Object> payload) {
        if (payload == null)
            return getAllHubs();
        String keyword = payload.get("search") != null ? payload.get("search").toString().trim() : null;
        String categoryIdStr = payload.get("categoryId") != null ? payload.get("categoryId").toString() : null;
        String districtIdStr = payload.get("districtId") != null ? payload.get("districtId").toString() : null;

        return getAllHubs().stream()
                .filter(w -> keyword == null || keyword.isEmpty()
                        || (w.getWellnessHubName() != null
                                && w.getWellnessHubName().toLowerCase().contains(keyword.toLowerCase())))
                .filter(w -> categoryIdStr == null || categoryIdStr.isEmpty()
                        || (w.getCategory() != null
                                && w.getCategory().getCategoryId().toString().equals(categoryIdStr)))
                .filter(w -> districtIdStr == null || districtIdStr.isEmpty()
                        || (w.getDistrict() != null
                                && w.getDistrict().getDistrictId().toString().equals(districtIdStr)))
                .toList();
    }

    public WellnessHub getHubById(Integer id) {
        return wellnessHubRepository.findById(id).orElse(null);
    }

    // 🌟 เมธอดบันทึกข้อมูลใหม่ (รองรับทั้งลิงก์เต็มและลิงก์ย่ออย่างปลอดภัย)
    public WellnessHub createWellnessHub(WellnessHub wellnessHub) {
        if (wellnessHub.getStatus() == null) {
            wellnessHub.setStatus("active");
        }

        if (wellnessHub.getGoogleMapsLink() != null && !wellnessHub.getGoogleMapsLink().isEmpty()) {
            extractCoordinates(wellnessHub);
        }

        return wellnessHubRepository.save(wellnessHub);
    }

    // ===================================================
    // 🛠️ ฟังก์ชันแกะพิกัดอัจฉริยะ (ตรวจจับและขยายลิงก์ย่อก่อน)
    // ===================================================
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

    // 1) พิกัดสถานที่จริงจาก Google Maps: !3d18.xxxxx!4d98.xxxxx
    Pattern patternPlace = Pattern.compile("!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)");
    Matcher matcherPlace = patternPlace.matcher(finalUrl);

    // 2) พิกัดจาก @ ส่วนใหญ่เป็น viewport / map center
    Pattern patternAt = Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
    Matcher matcherAt = patternAt.matcher(finalUrl);

    // 3) พิกัดจาก query q=lat,lng
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

private boolean isValidCoordinate(Double lat, Double lng) {
    return lat != null
            && lng != null
            && lat >= -90 && lat <= 90
            && lng >= -180 && lng <= 180;
}
    // ฟังก์ชันยิงแกะลิงก์ย่อด้วย HttpURLConnection ป้องกันเออร์เรอร์ค้างด้วย
    // try-catch
    private String expandShortUrl(String shortenedUrl) {
        try {
            if (!shortenedUrl.startsWith("http://") && !shortenedUrl.startsWith("https://")) {
                return shortenedUrl;
            }
            URL url = new URL(shortenedUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(false); // เอาแค่หัว Header ไม่เอาเนื้อหาหน้าเว็บ
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            connection.connect();

            String expandedUrl = connection.getHeaderField("Location");
            connection.disconnect();

            // ถ้าได้ลิงก์เต็มคืนมาให้ส่งออกไป ถ้าไม่ได้ให้ส่งลิงก์เดิมกลับไปลุ้นต่อ
            return (expandedUrl != null) ? expandedUrl : shortenedUrl;
        } catch (IOException e) {
            System.err.println("❌ ไม่สามารถเชื่อมต่อเพื่อขยายลิงก์ย่อได้: " + e.getMessage());
            return shortenedUrl;
        }
    }

    // 🌟 [เวอร์ชันแก้ไขสมบูรณ์] เมธอดแก้ไขอัปเดตข้อมูลสถานประกอบการ (Edit) แยก
    // DataType เคลียร์บั๊กหมวดหมู่และอำเภอ
    public WellnessHub updateWellnessHub(Integer id, WellnessHub updatedData) {
        // 1. ดึงข้อมูลเดิมในฐานข้อมูลมาตั้งต้นก่อนเสมอ
        WellnessHub oldHub = wellnessHubRepository.findById(id).orElse(null);
        if (oldHub == null)
            return null;

        // 2. จัดการเรื่องลิงก์ Google Maps และพิกัดภูมิศาสตร์
        if (updatedData.getGoogleMapsLink() != null && !updatedData.getGoogleMapsLink().trim().isEmpty()) {
            if (!updatedData.getGoogleMapsLink().equals(oldHub.getGoogleMapsLink())) {
                oldHub.setGoogleMapsLink(updatedData.getGoogleMapsLink().trim());
                // extractCoordinates(oldHub);
            }
        } else if (updatedData.getGoogleMapsLink() != null && updatedData.getGoogleMapsLink().trim().isEmpty()) {
            oldHub.setGoogleMapsLink(null);
            oldHub.setWellnessHubLatitude(null);
            oldHub.setWellnessHubLongitude(null);
        }

        // 🌟 3. ตรรกะตรวจเช็ค Category (หมวดหมู่) -> รองรับรหัสคีย์หลักที่เป็น String
        // ทรงประสิทธิภาพ
        if (updatedData.getCategory() != null) {
            String incomingCatId = updatedData.getCategory().getCategoryId();

            if (incomingCatId != null && !incomingCatId.trim().isEmpty()) {
                // อัปเดตเปลี่ยนหมวดหมู่ใหม่เฉพาะกรณีที่ของเดิมเป็น null
                // หรือรหัสใหม่ไม่ตรงกับรหัสเก่าใน DB เท่านั้น
                if (oldHub.getCategory() == null || !incomingCatId.equals(oldHub.getCategory().getCategoryId())) {
                    Category managedCategory = categoryRepository.findById(incomingCatId).orElse(null);
                    if (managedCategory != null) {
                        oldHub.setCategory(managedCategory);
                        System.out.println("✅ หลังบ้านผูกสัมพันธ์หมวดหมู่สำเร็จ คีย์รหัส (String): " + incomingCatId);
                    }
                }
            }
        }

        // 🌟 4. ตรรกะตรวจเช็ค District (อำเภอ) -> รองรับรหัสคีย์หลักที่เป็น Integer
        // ตามแอนทิตีจริง
        if (updatedData.getDistrict() != null) {
            Integer incomingDistId = updatedData.getDistrict().getDistrictId();

            if (incomingDistId != null) {
                // อัปเดตเปลี่ยนอำเภอใหม่เฉพาะกรณีที่ของเดิมเป็น null
                // หรือรหัสใหม่ไม่ตรงกับรหัสเก่าใน DB เท่านั้น
                if (oldHub.getDistrict() == null || !incomingDistId.equals(oldHub.getDistrict().getDistrictId())) {
                    District managedDistrict = districtRepository.findById(incomingDistId).orElse(null);
                    if (managedDistrict != null) {
                        oldHub.setDistrict(managedDistrict);
                        System.out.println("✅ หลังบ้านผูกสัมพันธ์อำเภอสำเร็จ คีย์รหัส (Integer): " + incomingDistId);
                    }
                }
            }
        }

        // 🌟 5. คัดลอกเฉพาะข้อมูลพื้นฐานทั่วไปด้วยมือตรงๆ เพื่อความแม่นยำ
        // ป้องกันบั๊กค่า null ล้างข้อมูลเก่า
        if (updatedData.getWellnessHubName() != null && !updatedData.getWellnessHubName().trim().isEmpty()) {
            oldHub.setWellnessHubName(updatedData.getWellnessHubName().trim());
        }
        if (updatedData.getAddress() != null && !updatedData.getAddress().trim().isEmpty()) {
            oldHub.setAddress(updatedData.getAddress().trim());
        }
        if (updatedData.getTelInformation() != null && !updatedData.getTelInformation().trim().isEmpty()) {
            oldHub.setTelInformation(updatedData.getTelInformation().trim());
        }
        if (updatedData.getWellnessHubDescription() != null) {
            oldHub.setWellnessHubDescription(updatedData.getWellnessHubDescription().trim());
        }
        if (updatedData.getWellnessHubImg() != null) {
            oldHub.setWellnessHubImg(updatedData.getWellnessHubImg());
        }
        if (updatedData.getCertificateType() != null) {
            oldHub.setCertificateType(updatedData.getCertificateType());
        }
        if (updatedData.getStatus() != null) {
            oldHub.setStatus(updatedData.getStatus());
        }
        if (updatedData.getContactInformation() != null) {
            oldHub.setContactInformation(updatedData.getContactInformation());
        }

        // 6. จัดการบันทึกข้อมูลเวลาทำการ (Operating Hours) สไตล์เคลียร์สล็อตเก่า
        if (updatedData.getOperatingHours() != null && !updatedData.getOperatingHours().trim().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Map<String, Object>> hoursMap = mapper.readValue(
                        updatedData.getOperatingHours(),
                        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Map<String, Object>>>() {
                        });

                operatingHourRepository.deleteByWellnessHub(oldHub);

                Map<String, String> dayNamesThai = new HashMap<>();
                dayNamesThai.put("monday", "วันจันทร์");
                dayNamesThai.put("tuesday", "วันอังคาร");
                dayNamesThai.put("wednesday", "วันพุธ");
                dayNamesThai.put("thursday", "วันพฤหัสบดี");
                dayNamesThai.put("friday", "วันศุกร์");
                dayNamesThai.put("saturday", "วันเสาร์");
                dayNamesThai.put("sunday", "วันอาทิตย์");

                for (Map.Entry<String, Map<String, Object>> entry : hoursMap.entrySet()) {
                    Map<String, Object> dayData = entry.getValue();
                    Boolean isActive = (Boolean) dayData.get("active");

                    if (isActive != null && isActive) {
                        OperatingHour oph = new OperatingHour();
                        oph.setDayOfWeek(dayNamesThai.get(entry.getKey()));
                        oph.setOpenTime(java.time.LocalTime.parse((String) dayData.get("open")));
                        oph.setCloseTime(java.time.LocalTime.parse((String) dayData.get("close")));
                        oph.setWellnessHub(oldHub);

                        operatingHourRepository.save(oph);
                    }
                }

                oldHub.setOperatingHours(updatedData.getOperatingHours());

            } catch (Exception e) {
                System.err.println("❌ ไม่สามารถบันทึกเวลาเปิดปิดลงตารางคู่ขนานได้: " + e.getMessage());
            }
        }

        // 7. บันทึกข้อมูลที่ประกอบและกรองเสร็จสิ้นลงตารางใน Supabase
        return wellnessHubRepository.save(oldHub);
    }
    // // // =========================================================================
    // // // ➕ ส่วนที่เพิ่มเข้าไปใหม่: จัดการกวาดข้อมูลเก่าในฐานข้อมูล (Data Migration)
    // // // =========================================================================
    // @PostConstruct
    // public void migrateOldGoogleMapsLinks() {
    // System.out.println("🔄 [Data Migration] เริ่มตรวจสอบและแปลงพิกัดสำหรับข้อมูลเก่าในตาราง...");
    // List<WellnessHub> allHubs = wellnessHubRepository.findAll();

    // int successCount = 0;
    // int failedCount = 0;

    // for (WellnessHub hub : allHubs) {
    // // เงื่อนไข: คัดเลือกเฉพาะแถวที่มี "ลิงก์แผนที่ตัวจริง" และ
    // // "พิกัดในฐานข้อมูลยังคงเป็นค่าว่าง (null)"
    // if (hub.getGoogleMapsLink() != null
    // && !hub.getGoogleMapsLink().isEmpty()
    // && (hub.getGoogleMapsLink().trim().startsWith("http://")
    // || hub.getGoogleMapsLink().trim().startsWith("https://"))
    // && (hub.getWellnessHubLatitude() == null || hub.getWellnessHubLongitude() ==
    // null)
    // ) {

    // try {
    // // เรียกใช้งานฟังก์ชันตัวเดิมของคุณแกะพิกัดให้
    // extractCoordinates(hub);

    // // เช็คผลลัพธ์: ถ้าพิกัดที่ได้กลับมาไม่เป็น null
    // // แปลว่าแกะพิกัดจริงจากลิงก์สำเร็จ
    // if (hub.getWellnessHubLatitude() != null) {
    // successCount++;
    // System.out.println("✅ ร้านเก่า: [" + hub.getWellnessHubName() + "] อัปเดตพิกัดจริงสำเร็จ");
    // } else {
    // failedCount++;
    // System.out.println("🟡 ร้านเก่า: [" + hub.getWellnessHubName() + "] สกัดพิกัดไม่สำเร็จ ➡️ ปล่อยเป็นค่าว่าง (NULL)");
    // }

    // // บันทึกความเปลี่ยนแปลงของร้านเก่ากลับลงตารางใน Supabase
    // wellnessHubRepository.save(hub);

    // // สั่งให้ระบบหยุดพักเป็นเวลา 500 มิลลิวินาที (0.5 วินาที)
    // // ก่อนก้าวไปทำรายการถัดไป เพื่อหลบการโดนตรวจจับจาก Google
    // Thread.sleep(500);

    // } catch (InterruptedException ie) {
    // System.err.println("❌ ระบบถูกขัดจังหวะการพักงาน (Thread interrupted): " +
    // ie.getMessage());
    // Thread.currentThread().interrupt();
    // } catch (Exception e) {
    // System.err.println(
    // "❌ เกิดข้อผิดพลาดที่ข้อมูลเก่าร้าน " + hub.getWellnessHubName() + " : " +
    // e.getMessage());
    // }
    // }
    // } // 🟢 ปิดบล็อกลูป for อย่างถูกต้องตรงนี้

    // // รายงานสถิติตัวเลขสรุปผลการ Migration ออกทางหน้าจอคอนโซลหลังบ้าน
    // System.out.println("==================================================");
    // System.out.println("🎉 [Data Migration] เสร็จสิ้นกระบวนการตรวจเช็คข้อมูลเก่า!");
    // System.out.println("🟢 ดึงพิกัดเฉพาะร้านเก่าสำเร็จ: " + successCount + " รายการ");
    // System.out.println("🟡 ดึงไม่สำเร็จ (ปล่อยเป็นค่าว่าง NULL): " + failedCount + " รายการ");
    // System.out.println("==================================================");
    // }
}