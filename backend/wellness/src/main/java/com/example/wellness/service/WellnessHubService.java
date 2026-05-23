package com.example.wellness.service;

import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.WellnessHubRepository;
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

    public List<WellnessHub> getAllHubs() {
        return wellnessHubRepository.findAll();
    }

    public List<WellnessHub> searchWellnessHubs(Map<String, Object> payload) {
        if (payload == null) return getAllHubs();
        String keyword = payload.get("search") != null ? payload.get("search").toString().trim() : null;
        String categoryIdStr = payload.get("categoryId") != null ? payload.get("categoryId").toString() : null;
        String districtIdStr = payload.get("districtId") != null ? payload.get("districtId").toString() : null;

        return getAllHubs().stream()
                .filter(w -> keyword == null || keyword.isEmpty() || (w.getWellnessHubName() != null && w.getWellnessHubName().toLowerCase().contains(keyword.toLowerCase())))
                .filter(w -> categoryIdStr == null || categoryIdStr.isEmpty() || (w.getCategory() != null && w.getCategory().getCategoryId().toString().equals(categoryIdStr)))
                .filter(w -> districtIdStr == null || districtIdStr.isEmpty() || (w.getDistrict() != null && w.getDistrict().getDistrictId().toString().equals(districtIdStr)))
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
        String originalUrl = hub.getGoogleMapsLink().trim();
        String finalUrl = originalUrl;

        // 1. ตรวจสอบก่อนว่าเช้าข่ายลิงก์ย่อหรือไม่ (เช่น มีคำว่า googleusercontent, goo.gl, maps.app)
        if (originalUrl.contains("googleusercontent.com") || originalUrl.contains("goo.gl") || originalUrl.contains("maps.app")) {
            System.out.println("🔄 ตรวจพบลิงก์ย่อ กำลังยิงเพื่อขอลิงก์เต็มปลายทาง...");
            finalUrl = expandShortUrl(originalUrl);
        }

        // 2. นำลิงก์ที่ได้ (ซึ่งควรจะเป็นลิงก์เต็มแล้ว) มาเข้ากระบวนการสกัดพิกัดด้วย Regex
        Pattern patternAt = Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
        Matcher matcherAt = patternAt.matcher(finalUrl);

        Pattern patternQuery = Pattern.compile("[?&]q=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
        Matcher matcherQuery = patternQuery.matcher(finalUrl);

        if (matcherAt.find()) {
            hub.setWellnessHubLatitude(Float.parseFloat(matcherAt.group(1)));
            hub.setWellnessHubLongitude(Float.parseFloat(matcherAt.group(2)));
            System.out.println("📌 แกะพิกัดสำเร็จ (Pattern @): " + hub.getWellnessHubLatitude() + ", " + hub.getWellnessHubLongitude());
        } else if (matcherQuery.find()) {
            hub.setWellnessHubLatitude(Float.parseFloat(matcherQuery.group(1)));
            hub.setWellnessHubLongitude(Float.parseFloat(matcherQuery.group(2)));
            System.out.println("📌 แกะพิกัดสำเร็จ (Pattern Q): " + hub.getWellnessHubLatitude() + ", " + hub.getWellnessHubLongitude());
        } else {
            // กรณีสุดท้ายถ้าสุดวิสัยแกะไม่เจอจริง ๆ ให้ใช้ค่าเริ่มต้นเชียงใหม่ป้องกันระบบพัง
            hub.setWellnessHubLatitude(18.7883f);
            hub.setWellnessHubLongitude(98.9853f);
            System.out.println("⚠️ แกะพิกัดไม่สำเร็จ เปลี่ยนไปใช้ค่าเริ่มต้นเชียงใหม่แทน");
        }
    }

    // ฟังก์ชันยิงแกะลิงก์ย่อด้วย HttpURLConnection ป้องกันเออร์เรอร์ค้างด้วย try-catch
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
}