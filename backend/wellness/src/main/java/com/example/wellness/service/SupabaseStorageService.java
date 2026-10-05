package com.example.wellness.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url:https://mzuwvqwcymwfyjdirhst.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.key:sb_publishable_BxMcrCpeUfrOFVnhzu-63w_t4ICY1k9}")
    private String supabaseKey;

    @Value("${supabase.bucket:WELLNESS-IMAGES}")
    private String supabaseBucket;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * อัปโหลดไบนารีไฟล์ตรงไปยัง Supabase Storage Bucket
     * @param bytes ข้อมูลไฟล์ในรูปแบบไบต์
     * @param contentType MIME type เช่น image/jpeg, image/png
     * @param folder โฟลเดอร์ปลายทาง เช่น articles, wellness_hubs, documents
     * @param filename ชื่อไฟล์ปลายทาง
     * @return Public URL ของไฟล์บน Supabase Storage
     */
    public String uploadBytes(byte[] bytes, String contentType, String folder, String filename) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        String cleanUrl = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
        String cleanFolder = (folder != null && !folder.trim().isEmpty()) ? folder.trim() + "/" : "";
        String fullPath = cleanFolder + filename;
        String uploadEndpoint = cleanUrl + "/storage/v1/object/" + supabaseBucket + "/" + fullPath;

        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", supabaseKey);
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.set("x-upsert", "true");
        headers.setContentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"));

        HttpEntity<byte[]> entity = new HttpEntity<>(bytes, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(uploadEndpoint, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                String publicUrl = cleanUrl + "/storage/v1/object/public/" + supabaseBucket + "/" + fullPath;
                log.info("✅ Uploaded file to Supabase Storage: {}", publicUrl);
                return publicUrl;
            } else {
                throw new RuntimeException("Supabase storage upload failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("❌ Failed to upload to Supabase Storage: {}", e.getMessage());
            throw new RuntimeException("ไม่สามารถอัปโหลดไฟล์ไปยัง Supabase Storage: " + e.getMessage(), e);
        }
    }

    /**
     * อัปโหลด Base64 Data URL หรือคืนค่าเดิมหากเป็น URL อยู่แล้ว
     * @param base64OrUrl สตริงรูปภาพ (Base64 data URL หรือ Public URL)
     * @param folder โฟลเดอร์ปลายทาง
     * @return Public URL
     */
    public String uploadBase64OrReturnUrl(String base64OrUrl, String folder) {
        if (base64OrUrl == null || base64OrUrl.trim().isEmpty()) {
            return null;
        }

        String trimmed = base64OrUrl.trim();

        // หากเป็น URL เดิมอยู่แล้ว ไม่ต้องอัปโหลดซ้ำ
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/uploads/")) {
            return trimmed;
        }

        // ตรวจสอบรูปแบบ Base64 Data URL เช่น data:image/png;base64,....
        String contentType = "image/jpeg";
        String extension = ".jpg";
        String base64Content = trimmed;

        if (trimmed.startsWith("data:")) {
            int commaIndex = trimmed.indexOf(',');
            if (commaIndex != -1) {
                String header = trimmed.substring(5, commaIndex);
                if (header.contains(";")) {
                    contentType = header.split(";")[0];
                }
                base64Content = trimmed.substring(commaIndex + 1);
            }
        }

        // ตรวจหานามสกุลไฟล์จาก MIME Type
        if (contentType.equalsIgnoreCase("image/png")) {
            extension = ".png";
        } else if (contentType.equalsIgnoreCase("image/jpeg") || contentType.equalsIgnoreCase("image/jpg")) {
            extension = ".jpg";
        } else if (contentType.equalsIgnoreCase("image/webp")) {
            extension = ".webp";
        } else if (contentType.equalsIgnoreCase("application/pdf")) {
            extension = ".pdf";
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(base64Content.replaceAll("\\s+", ""));
            String filename = UUID.randomUUID() + extension;
            return uploadBytes(decoded, contentType, folder, filename);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid base64 string, keeping raw value: {}", e.getMessage());
            return trimmed;
        }
    }

    /**
     * อัปโหลด Gallery ที่เป็น JSON Array ของ Base64 หรือ URLs
     * @param galleryJson JSON String array เช่น ["data:...", "https://..."]
     * @param folder โฟลเดอร์ปลายทาง
     * @return JSON String ของ URLs
     */
    public String uploadGalleryBase64OrReturnUrl(String galleryJson, String folder) {
        if (galleryJson == null || galleryJson.trim().isEmpty()) {
            return null;
        }

        String trimmed = galleryJson.trim();
        if (!trimmed.startsWith("[")) {
            // กรณีเป็น Base64 เดี่ยวๆ หรือ URL เดียว
            String url = uploadBase64OrReturnUrl(trimmed, folder);
            return url != null ? "[\"" + url + "\"]" : null;
        }

        try {
            List<Object> rawList = objectMapper.readValue(trimmed, new TypeReference<List<Object>>() {});
            List<String> uploadedUrls = new ArrayList<>();

            for (Object item : rawList) {
                if (item == null) continue;
                String itemStr = item.toString().trim();
                String url = uploadBase64OrReturnUrl(itemStr, folder);
                if (url != null) {
                    uploadedUrls.add(url);
                }
            }

            return objectMapper.writeValueAsString(uploadedUrls);
        } catch (Exception e) {
            log.warn("Failed to parse gallery JSON, handling as single: {}", e.getMessage());
            String singleUrl = uploadBase64OrReturnUrl(trimmed, folder);
            return singleUrl;
        }
    }

    /**
     * อัปโหลดรายการเอกสารยืนยันสิทธิ์ที่เป็น JSON Array ของ Objects [{type, name, data}] ไปยัง Supabase Storage
     * @param docsJson JSON String array เช่น [{"type":"...", "name":"...", "data":"data:..."}]
     * @param folder โฟลเดอร์ปลายทาง เช่น documents
     * @return JSON String ที่ data ถูกแทนที่ด้วย Supabase Public URLs
     */
    public String uploadVerificationDocumentsJsonOrReturnUrl(String docsJson, String folder) {
        if (docsJson == null || docsJson.trim().isEmpty()) {
            return null;
        }

        String trimmed = docsJson.trim();
        if (!trimmed.startsWith("[")) {
            // กรณีเป็น Base64 เดี่ยวๆ หรือ URL เดียว
            return uploadBase64OrReturnUrl(trimmed, folder);
        }

        try {
            List<Map<String, Object>> list = objectMapper.readValue(trimmed, new TypeReference<List<Map<String, Object>>>() {});
            List<Map<String, Object>> resultList = new ArrayList<>();

            for (Map<String, Object> doc : list) {
                if (doc == null) continue;
                Map<String, Object> newDoc = new LinkedHashMap<>(doc);
                Object dataObj = doc.get("data");
                if (dataObj != null && !dataObj.toString().trim().isEmpty()) {
                    String uploadedUrl = uploadBase64OrReturnUrl(dataObj.toString().trim(), folder);
                    newDoc.put("data", uploadedUrl);
                }
                resultList.add(newDoc);
            }

            return objectMapper.writeValueAsString(resultList);
        } catch (Exception e) {
            log.warn("Failed to process verification documents JSON, handling as raw/single: {}", e.getMessage());
            return uploadBase64OrReturnUrl(trimmed, folder);
        }
    }

    /**
     * อัปโหลด MultipartFile ไปยัง Supabase Storage
     * @param file MultipartFile จาก Form
     * @param folder โฟลเดอร์ปลายทาง
     * @return Public URL
     */
    public String uploadMultipartFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalName = file.getOriginalFilename();
        String extension = ".jpg";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.'));
        }

        String filename = UUID.randomUUID() + extension;
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        return uploadBytes(file.getBytes(), contentType, folder, filename);
    }
}
