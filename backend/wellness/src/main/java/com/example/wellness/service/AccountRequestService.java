package com.example.wellness.service;

import com.example.wellness.model.AccountRequest;
import com.example.wellness.model.Category;
import com.example.wellness.model.District;
import com.example.wellness.model.EmergencyService;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.AccountRequestRepository;
import com.example.wellness.repository.CategoryRepository;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.EmergencyServiceRepository;
import com.example.wellness.repository.WellnessHubRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AccountRequestService {

        private static final String STATUS_PENDING = "PENDING";
        private static final String STATUS_APPROVED = "APPROVED";
        private static final String STATUS_REJECTED = "REJECTED";

        private final AccountRequestRepository repository;
        private final WellnessHubRepository wellnessHubRepository;
        private final EmergencyServiceRepository emergencyServiceRepository;
        private final EmailService emailService;
        private final CategoryRepository categoryRepository;
        private final DistrictRepository districtRepository;
        private final com.example.wellness.repository.NotificationRepository notificationRepository;

        public AccountRequestService(
                        AccountRequestRepository repository,
                        WellnessHubRepository wellnessHubRepository,
                        EmergencyServiceRepository emergencyServiceRepository,
                        EmailService emailService,
                        CategoryRepository categoryRepository,
                        DistrictRepository districtRepository,
                        com.example.wellness.repository.NotificationRepository notificationRepository) {
                this.repository = repository;
                this.wellnessHubRepository = wellnessHubRepository;
                this.emergencyServiceRepository = emergencyServiceRepository;
                this.emailService = emailService;
                this.categoryRepository = categoryRepository;
                this.districtRepository = districtRepository;
                this.notificationRepository = notificationRepository;
        }

        // =====================================================
        // รายการคำขอทั้งหมด (Summary เฉพาะฟิลด์ที่หน้า List ใช้งาน)
        // =====================================================

        @Transactional(readOnly = true)
        public List<Map<String, Object>> listAccountRequest(String keyword, String status) {
                String trimmedKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
                String trimmedStatus = (status != null && !status.trim().isEmpty()) ? status.trim() : null;

                List<Object[]> rows;
                if (trimmedKeyword == null && trimmedStatus == null) {
                        rows = repository.findAllSummariesByOrderByRequestIdDesc();
                } else {
                        rows = repository.searchAccountRequestSummaries(trimmedKeyword, trimmedStatus);
                }

                return rows.stream()
                                .map(this::mapRowToSummaryMap)
                                .toList();
        }

        private Map<String, Object> mapRowToSummaryMap(Object[] row) {
                Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("requestId", row[0]);
                map.put("licenseId", row[1]);
                map.put("wellnessHubName", row[2]);
                map.put("requesterName", row[3]);
                map.put("contactInformation", row[4]);
                map.put("tellInformation", row[5]);
                map.put("userEmail", row[6]);
                map.put("requestStatus", row[7]);
                map.put("rejectionReason", row[8]);
                map.put("processedDate", row[9]);
                return map;
        }

        // =====================================================
        // รายละเอียดคำขอ
        // =====================================================

        @Transactional(readOnly = true)
        public AccountRequest getRequestById(Integer id) {
                if (id == null || id <= 0) {
                        return null;
                }

                return repository.findById(id).orElse(null);
        }

        // =====================================================
        // สร้าง / ยื่นคำขอใหม่ (หากเคยถูกปฏิเสธ จะอัปเดตข้อมูลและเปลี่ยนเป็น PENDING)
        // =====================================================

        @Transactional
        public AccountRequest requestWellnessHubAccount(Map<String, Object> payload) {
                if (payload == null) {
                        throw new RuntimeException("ไม่พบข้อมูลคำขอ");
                }

                String licenseId = getRequiredString(
                                payload,
                                "licenseId",
                                "กรุณาระบุเลขที่ใบอนุญาต");

                if (licenseId.contains(" ") || !licenseId.matches("^[A-Za-z0-9]{10,13}$")) {
                        throw new RuntimeException("เลขที่ใบอนุญาตต้องเป็นภาษาอังกฤษหรือตัวเลข 10–13 ตัวอักษรและไม่มีช่องว่าง");
                }

                /*
                 * ตรวจคำขอที่กำลังรอ / อนุมัติแล้ว หรือมีเลขใบอนุญาตในระบบแล้ว
                 */
                boolean hasPendingRequest = repository.existsByLicenseIdAndRequestStatus(licenseId, STATUS_PENDING);
                if (hasPendingRequest) {
                        throw new RuntimeException("เลขที่ใบอนุญาตสถานประกอบการนี้มีคำขอที่กำลังรอตรวจสอบในระบบอยู่แล้ว");
                }

                boolean hasApprovedRequest = repository.existsByLicenseIdAndRequestStatus(licenseId, STATUS_APPROVED);
                if (hasApprovedRequest
                                || wellnessHubRepository.existsById(licenseId)
                                || emergencyServiceRepository.existsById(licenseId)) {
                        throw new RuntimeException("เลขที่ใบอนุญาตสถานประกอบการนี้มีอยู่ในระบบแล้ว");
                }

                // =================================================
                // ตรวจข้อมูลบังคับ
                // =================================================

                String requesterName = getRequiredString(payload, "requesterName", "กรุณาระบุชื่อผู้ยื่นคำขอ");
                if (requesterName.length() < 4 || requesterName.length() > 255) {
                        throw new RuntimeException("ชื่อผู้ยื่นคำขอต้องมีความยาว 4–255 ตัวอักษร");
                }

                String userEmail = getRequiredString(payload, "userEmail", "กรุณาระบุอีเมล");
                if (userEmail.contains(" ") || userEmail.length() < 5 || userEmail.length() > 255 || !userEmail.matches("^[\\w!#$%&'*+/=?`{|}~^-]+(?:\\.[\\w!#$%&'*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}$")) {
                        throw new RuntimeException("รูปแบบอีเมลไม่ถูกต้องหรือความยาวไม่อยู่ในช่วง 5–255 ตัวอักษร");
                }

                String username = getRequiredString(payload, "username", "กรุณาระบุ Username").trim();
                if (username.contains(" ") || username.matches(".*\\s+.*")) {
                        throw new RuntimeException("Username ต้องไม่มีช่องว่าง");
                }
                if (username.length() < 4 || username.length() > 20) {
                        throw new RuntimeException("Username ต้องมีความยาว 4–20 ตัวอักษร");
                }

                if (repository.existsByUsernameIgnoreCaseAndRequestStatus(username, STATUS_PENDING)) {
                        throw new RuntimeException("ชื่อผู้ใช้ (Username) นี้มีคำขอที่กำลังรอตรวจสอบในระบบอยู่แล้ว กรุณาใช้ชื่ออื่น");
                }

                if (repository.existsByUsernameIgnoreCaseAndRequestStatus(username, STATUS_APPROVED)
                                || wellnessHubRepository.existsByUsername(username)
                                || emergencyServiceRepository.existsByUsername(username)) {
                        throw new RuntimeException("ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น");
                }

                String password = getRequiredString(payload, "password", "กรุณาระบุ Password");
                if (password.contains(" ") || password.length() != 8) {
                        throw new RuntimeException("รหัสผ่านต้องมีความยาว 8 ตัวอักษรและไม่มีช่องว่าง");
                }

                String wellnessHubName = getRequiredString(payload, "wellnessHubName", "กรุณาระบุชื่อสถานประกอบการ");
                if (wellnessHubName.length() < 5 || wellnessHubName.length() > 100) {
                        throw new RuntimeException("ชื่อสถานประกอบการต้องมีความยาว 5–100 ตัวอักษร");
                }

                String address = getRequiredString(payload, "address", "กรุณาระบุที่อยู่");
                if (address.length() < 10 || address.length() > 255) {
                        throw new RuntimeException("ที่อยู่ต้องมีความยาว 10–255 ตัวอักษร");
                }

                String tellInformation = getRequiredString(payload, "tellInformation", "กรุณาระบุเบอร์โทรศัพท์");
                if (!tellInformation.matches("^[0-9]{9,10}$")) {
                        throw new RuntimeException("เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลักและไม่มีช่องว่างหรือสัญลักษณ์พิเศษ");
                }

                String contactInfo = getOptionalString(payload, "contactInformation");
                if (contactInfo != null && (contactInfo.length() < 3 || contactInfo.length() > 255)) {
                        throw new RuntimeException("ช่องทางติดต่อเพิ่มเติมต้องมีความยาว 3–255 ตัวอักษร");
                }

                String wellnessHubDescription = getOptionalString(payload, "wellnessHubDescription");
                if (wellnessHubDescription != null && wellnessHubDescription.length() > 255) {
                        throw new RuntimeException("รายละเอียดสถานประกอบการต้องมีความยาวไม่เกิน 255 ตัวอักษร");
                }

                String verificationDocuments = getRequiredString(payload, "verificationDocuments",
                                "กรุณาแนบเอกสารยืนยันสิทธิ์");
                validateBase64File(verificationDocuments, new String[] { "application/pdf", "image/jpeg", "image/png" }, 10 * 1024 * 1024L, "เอกสารยืนยันสิทธิ์");

                String wellnessHubImg = getOptionalString(payload, "wellnessHubImg");
                if (wellnessHubImg != null) {
                        validateBase64File(wellnessHubImg, new String[] { "image/jpeg", "image/png" }, 20 * 1024 * 1024L, "รูปหน้าปก");
                }

                String wellnessHubGallery = getOptionalString(payload, "wellnessHubGallery");
                if (wellnessHubGallery != null && !wellnessHubGallery.trim().isEmpty()) {
                        validateGalleryBase64(wellnessHubGallery, 20 * 1024 * 1024L);
                }

                String gmapsLink = getRequiredString(payload, "googleMapsLink", "กรุณาระบุลิงก์ Google Maps");
                if (gmapsLink.contains(" ")) {
                        throw new RuntimeException("ลิงก์ Google Maps ต้องไม่มีช่องว่าง");
                }
                if (!gmapsLink.startsWith("http://") && !gmapsLink.startsWith("https://")) {
                        throw new RuntimeException("รูปแบบลิงก์ Google Maps ไม่ถูกต้อง");
                }
                String cleanGmaps = gmapsLink.trim();
                boolean dupHubLink = wellnessHubRepository.findAll().stream()
                                .anyMatch(h -> h.getGoogleMapsLink() != null
                                                && cleanGmaps.equalsIgnoreCase(h.getGoogleMapsLink().trim()));
                boolean dupEmerLink = emergencyServiceRepository.findAll().stream()
                                .anyMatch(e -> e.getGoogleMapsLink() != null
                                                && cleanGmaps.equalsIgnoreCase(e.getGoogleMapsLink().trim()));
                if (dupHubLink || dupEmerLink) {
                        throw new RuntimeException("ลิงก์ Google Maps นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง");
                }

                // =================================================
                // ตรวจสอบว่าเคยมีคำขอเดิมที่ถูกปฏิเสธ (REJECTED) หรือไม่
                // หากมี ให้อัปเดตข้อมูลใหม่ลงในคำขอเดิมและเปลี่ยนสถานะกลับเป็น PENDING (รอพิจารณา)
                // =================================================
                List<AccountRequest> rejectedList = repository
                                .findByLicenseIdAndRequestStatusOrderByRequestIdDesc(licenseId, STATUS_REJECTED);
                AccountRequest request;
                if (rejectedList != null && !rejectedList.isEmpty()) {
                        request = rejectedList.get(0);
                        // หากมีคำขอที่ถูกปฏิเสธซ้ำซ้อนมากกว่า 1 รายการ ให้ลบรายการเก่าที่เหลือ
                        if (rejectedList.size() > 1) {
                                for (int i = 1; i < rejectedList.size(); i++) {
                                        repository.delete(rejectedList.get(i));
                                }
                        }
                } else {
                        request = new AccountRequest();
                }

                request.setLicenseId(licenseId);
                request.setUsername(username);
                request.setPassword(password);
                request.setRequesterName(requesterName);
                request.setUserEmail(userEmail);
                request.setContactInformation(contactInfo);
                request.setTellInformation(tellInformation);
                request.setWellnessHubName(wellnessHubName);
                request.setAddress(address);
                request.setGoogleMapsLink(cleanGmaps);
                request.setWellnessHubDescription(wellnessHubDescription);
                request.setWellnessHubImg(wellnessHubImg);
                request.setWellnessHubGallery(wellnessHubGallery);
                request.setWellnessHubLatitude(getOptionalDouble(payload, "wellnessHubLatitude"));
                request.setWellnessHubLongitude(getOptionalDouble(payload, "wellnessHubLongitude"));

                // หากพิกัดยังเป็น null แต่มี Google Maps Link ให้ทำการสกัดพิกัดอัตโนมัติ
                if ((request.getWellnessHubLatitude() == null || request.getWellnessHubLongitude() == null)
                                && request.getGoogleMapsLink() != null) {
                        extractCoordinates(request);
                }

                validateCoordinates(
                                request.getWellnessHubLatitude(),
                                request.getWellnessHubLongitude());

                if (request.getWellnessHubLatitude() != null && request.getWellnessHubLongitude() != null) {
                        double lat = request.getWellnessHubLatitude();
                        double lng = request.getWellnessHubLongitude();
                        boolean dupHubCoords = wellnessHubRepository.findAll().stream().anyMatch(h -> {
                                if (h.getWellnessHubLatitude() == null || h.getWellnessHubLongitude() == null)
                                        return false;
                                return Math.abs(h.getWellnessHubLatitude() - lat) < 0.0001
                                                && Math.abs(h.getWellnessHubLongitude() - lng) < 0.0001;
                        });
                        boolean dupEmerCoords = emergencyServiceRepository.findAll().stream().anyMatch(e -> {
                                if (e.getWellnessHubLatitude() == null || e.getWellnessHubLongitude() == null)
                                        return false;
                                return Math.abs(e.getWellnessHubLatitude() - lat) < 0.0001
                                                && Math.abs(e.getWellnessHubLongitude() - lng) < 0.0001;
                        });
                        if (dupHubCoords || dupEmerCoords) {
                                throw new RuntimeException("พิกัดแผนที่จาก Google Maps นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง");
                        }
                }

                request.setCertificateType(getOptionalString(payload, "certificateType"));
                request.setOperatingHours(getOptionalString(payload, "operatingHours"));
                request.setVerificationDocuments(verificationDocuments);
                request.setVerificationDocumentName(getOptionalString(payload, "verificationDocumentName"));

                request.setCategory(getCategory(payload));
                request.setDistrict(getDistrict(payload));

                request.setRequestStatus(STATUS_PENDING);
                request.setRejectionReason(null);
                request.setProcessedDate(null);

                return repository.save(request);
        }

        // =====================================================
        // อนุมัติคำขอ (ส่วนที่ 2 - รองรับทั้ง WellnessHub & EmergencyService)
        // =====================================================

        @Transactional
        public AccountRequest approveAccountRequest(Integer id) {
                if (id == null || id <= 0) {
                        return null;
                }

                AccountRequest request = repository.findById(id).orElse(null);

                if (request == null) {
                        return null;
                }

                if (STATUS_APPROVED.equalsIgnoreCase(request.getRequestStatus())) {
                        throw new RuntimeException("คำขอนี้ได้รับการอนุมัติแล้ว");
                }

                if (STATUS_REJECTED.equalsIgnoreCase(request.getRequestStatus())) {
                        throw new RuntimeException("ไม่สามารถอนุมัติคำขอที่ถูกปฏิเสธแล้วได้");
                }

                /*
                 * ตรวจ Username ซ้ำทั้งสองตาราง
                 */
                if (wellnessHubRepository.existsByUsername(request.getUsername())
                                || emergencyServiceRepository.existsByUsername(request.getUsername())) {
                        throw new RuntimeException("Username ถูกใช้งานแล้ว");
                }

                Category category = request.getCategory();
                if (category == null || category.getCategoryId() == null) {
                        throw new RuntimeException("ไม่พบข้อมูลหมวดหมู่ในคำขอ");
                }

                // สกัดพิกัดหากยังไม่มีในคำขอ
                if ((request.getWellnessHubLatitude() == null || request.getWellnessHubLongitude() == null)
                                && request.getGoogleMapsLink() != null) {
                        extractCoordinates(request);
                }

                /*
                 * แยกบันทึกตามหมวดหมู่ (Emergency Service vs Wellness Hub)
                 */
                boolean isEmergency = isEmergencyCategory(category.getCategoryId());

                if (isEmergency) {
                        EmergencyService emergencyService = new EmergencyService();
                        emergencyService.setLicenseId(request.getLicenseId());
                        emergencyService.setUsername(request.getUsername());
                        emergencyService.setPassword(request.getPassword());
                        emergencyService.setStatus("ACTIVE");
                        emergencyService.setWellnessHubName(request.getWellnessHubName());
                        emergencyService.setAddress(request.getAddress());
                        emergencyService.setContactInformation(request.getContactInformation());
                        emergencyService.setTelInformation(request.getTellInformation());
                        emergencyService.setGoogleMapsLink(request.getGoogleMapsLink());
                        emergencyService.setWellnessHubDescription(request.getWellnessHubDescription());
                        emergencyService.setWellnessHubImg(request.getWellnessHubImg());
                        emergencyService.setWellnessHubGallery(request.getWellnessHubGallery());
                        emergencyService.setWellnessHubLatitude(request.getWellnessHubLatitude());
                        emergencyService.setWellnessHubLongitude(request.getWellnessHubLongitude());
                        emergencyService.setCertificateType(request.getCertificateType());
                        emergencyService.setOperatingHours(request.getOperatingHours());
                        emergencyService.setCategory(request.getCategory());
                        emergencyService.setDistrict(request.getDistrict());

                        emergencyServiceRepository.save(emergencyService);
                } else {
                        WellnessHub wellnessHub = new WellnessHub();
                        wellnessHub.setLicenseId(request.getLicenseId());
                        wellnessHub.setUsername(request.getUsername());
                        wellnessHub.setPassword(request.getPassword());
                        wellnessHub.setStatus("ACTIVE");
                        wellnessHub.setWellnessHubName(request.getWellnessHubName());
                        wellnessHub.setAddress(request.getAddress());
                        wellnessHub.setContactInformation(request.getContactInformation());
                        wellnessHub.setTelInformation(request.getTellInformation());
                        wellnessHub.setGoogleMapsLink(request.getGoogleMapsLink());
                        wellnessHub.setWellnessHubDescription(request.getWellnessHubDescription());
                        wellnessHub.setWellnessHubImg(request.getWellnessHubImg());
                        wellnessHub.setWellnessHubGallery(request.getWellnessHubGallery());
                        wellnessHub.setWellnessHubLatitude(request.getWellnessHubLatitude());
                        wellnessHub.setWellnessHubLongitude(request.getWellnessHubLongitude());
                        wellnessHub.setCertificateType(request.getCertificateType());
                        wellnessHub.setOperatingHours(request.getOperatingHours());
                        wellnessHub.setCategory(request.getCategory());
                        wellnessHub.setDistrict(request.getDistrict());

                        wellnessHubRepository.save(wellnessHub);
                }

                request.setRequestStatus(STATUS_APPROVED);
                request.setRejectionReason(null);
                request.setProcessedDate(LocalDateTime.now());

                return repository.save(request);
        }

        // =====================================================
        // ปฏิเสธคำขอ
        // =====================================================

        @Transactional
        public AccountRequest rejectRequest(Integer id, String reason) {
                if (id == null || id <= 0) {
                        return null;
                }

                AccountRequest request = repository.findById(id).orElse(null);

                if (request == null) {
                        return null;
                }

                if (STATUS_APPROVED.equalsIgnoreCase(request.getRequestStatus())) {
                        throw new RuntimeException("คำขอนี้ได้รับการอนุมัติแล้ว");
                }

                if (STATUS_REJECTED.equalsIgnoreCase(request.getRequestStatus())) {
                        throw new RuntimeException("คำขอนี้ถูกปฏิเสธไปแล้ว");
                }

                if (reason == null || reason.trim().isEmpty()) {
                        throw new RuntimeException("กรุณาระบุเหตุผลการไม่อนุมัติ");
                }

                if (reason.trim().length() > 255) {
                        throw new RuntimeException("เหตุผลการไม่อนุมัติต้องไม่เกิน 255 ตัวอักษร");
                }

                request.setRequestStatus(STATUS_REJECTED);
                request.setRejectionReason(reason.trim());
                request.setProcessedDate(LocalDateTime.now());

                return repository.save(request);
        }

        // =====================================================
        // แจ้งผลการพิจารณาคำขอ (Notify Request Result)
        // =====================================================

        public com.example.wellness.model.Notification notifyRequestResult(Integer id) {
                if (id == null || id <= 0) {
                        throw new RuntimeException("ไม่พบข้อมูลคำขออนุมัติ");
                }

                AccountRequest request = repository.findById(id).orElse(null);
                if (request == null) {
                        throw new RuntimeException("ไม่พบข้อมูลคำขออนุมัติ");
                }

                String status = request.getRequestStatus();
                if (STATUS_PENDING.equalsIgnoreCase(status)) {
                        throw new RuntimeException("คำขอนี้ยังอยู่ระหว่างรอพิจารณา (PENDING) ไม่สามารถส่งแจ้งผลได้");
                }

                if (!STATUS_APPROVED.equalsIgnoreCase(status) && !STATUS_REJECTED.equalsIgnoreCase(status)) {
                        throw new RuntimeException("สถานะคำขอไม่ถูกต้องสำหรับการแจ้งผล");
                }

                // ตรวจสอบว่าเคยส่ง Notification status = SENT สำหรับคำขอนี้สำเร็จแล้วหรือไม่ (ป้องกันการส่งซ้ำ)
                boolean alreadySent = notificationRepository.existsByAccountRequestRequestIdAndNotificationStatus(id, "SENT");
                if (alreadySent) {
                        throw new RuntimeException("ได้ส่งอีเมลแจ้งผลการพิจารณาไปแล้ว");
                }

                String userEmail = request.getUserEmail();
                if (userEmail == null || userEmail.trim().isEmpty() || !userEmail.contains("@")) {
                        throw new RuntimeException("อีเมลผู้ยื่นคำขอไม่ถูกต้อง");
                }

                boolean isApproved = STATUS_APPROVED.equalsIgnoreCase(status);
                if (!isApproved) {
                        String rejectionReason = request.getRejectionReason();
                        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
                                throw new RuntimeException("ไม่พบเหตุผลการไม่อนุมัติในคำขอ");
                        }
                }

                // ส่ง Email
                try {
                        if (isApproved) {
                                emailService.sendApproveEmail(
                                                request.getUserEmail(),
                                                request.getWellnessHubName(),
                                                request.getLicenseId(),
                                                request.getUsername(),
                                                request.getPassword());
                        } else {
                                emailService.sendRejectEmail(
                                                request.getUserEmail(),
                                                request.getWellnessHubName(),
                                                request.getLicenseId(),
                                                request.getRejectionReason());
                        }
                } catch (Exception e) {
                        // บันทึกประวัติกรณีส่งล้มเหลว (FAILED)
                        try {
                                com.example.wellness.model.Notification failedNotification = new com.example.wellness.model.Notification();
                                failedNotification.setAccountRequest(request);
                                failedNotification.setNotifydate(LocalDateTime.now());
                                failedNotification.setNotificationStatus("FAILED");
                                failedNotification.setMessageBody("การส่งอีเมลล้มเหลว");
                                notificationRepository.save(failedNotification);
                        } catch (Exception ignored) {
                        }
                        throw new RuntimeException("การส่งล้มเหลว");
                }

                // บันทึกประวัติกรณีส่งสำเร็จ (SENT)
                try {
                        com.example.wellness.model.Notification sentNotification = new com.example.wellness.model.Notification();
                        sentNotification.setAccountRequest(request);
                        sentNotification.setNotifydate(LocalDateTime.now());
                        sentNotification.setNotificationStatus("SENT");
                        String message = isApproved
                                        ? "ส่งอีเมลแจ้งผลการอนุมัติสำเร็จ: " + request.getWellnessHubName()
                                        : "ส่งอีเมลแจ้งผลการไม่อนุมัติสำเร็จ: " + request.getWellnessHubName() + " (" + request.getRejectionReason() + ")";
                        if (message.length() > 255) {
                                message = message.substring(0, 252) + "...";
                        }
                        sentNotification.setMessageBody(message);
                        return notificationRepository.save(sentNotification);
                } catch (Exception e) {
                        throw new RuntimeException("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
        }

        // =====================================================
        // ติดตามสถานะคำขอ (ค้นหาด้วย Username)
        // =====================================================

        @Transactional(readOnly = true)
        public List<AccountRequest> trackRequestStatus(String username) {
                if (username == null || username.trim().isEmpty() || username.contains(" ") || username.matches(".*\\s+.*")) {
                        throw new RuntimeException("กรุณากรอกชื่อผู้ใช้งาน (Username)");
                }

                String normalizedUsername = username.trim();
                if (normalizedUsername.length() < 4 || normalizedUsername.length() > 20) {
                        throw new RuntimeException("กรุณากรอกชื่อผู้ใช้งาน (Username) 4–20 ตัวอักษร");
                }

                return repository.findByUsernameIgnoreCaseOrderByRequestIdDesc(normalizedUsername);
        }

        // =====================================================
        // Coordinates Extraction & Helpers
        // =====================================================

        private void extractCoordinates(AccountRequest request) {
                String originalUrl = request.getGoogleMapsLink();
                if (originalUrl == null || originalUrl.trim().isEmpty()) {
                        return;
                }

                String finalUrl = originalUrl.trim();
                if (finalUrl.contains("goo.gl") || finalUrl.contains("maps.app.goo.gl") || finalUrl.contains("maps.app")) {
                        finalUrl = expandShortUrl(finalUrl);
                }

                Pattern patternPlace = Pattern.compile("!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)");
                Pattern patternQuery = Pattern.compile("[?&]q=(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");
                Pattern patternAt = Pattern.compile("@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)");

                Matcher matcherPlace = patternPlace.matcher(finalUrl);
                Matcher matcherQuery = patternQuery.matcher(finalUrl);
                Matcher matcherAt = patternAt.matcher(finalUrl);

                Double lat = null;
                Double lng = null;

                if (matcherPlace.find()) {
                        lat = Double.parseDouble(matcherPlace.group(1));
                        lng = Double.parseDouble(matcherPlace.group(2));
                } else if (matcherQuery.find()) {
                        lat = Double.parseDouble(matcherQuery.group(1));
                        lng = Double.parseDouble(matcherQuery.group(2));
                } else if (matcherAt.find()) {
                        lat = Double.parseDouble(matcherAt.group(1));
                        lng = Double.parseDouble(matcherAt.group(2));
                }

                if (isValidCoordinate(lat, lng)) {
                        request.setWellnessHubLatitude(lat);
                        request.setWellnessHubLongitude(lng);
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

        private boolean isEmergencyCategory(String categoryId) {
                if (categoryId == null) {
                        return false;
                }
                String normalized = categoryId.trim().toUpperCase();
                return normalized.startsWith("EM") || normalized.equals("EM01") || normalized.equals("EM02");
        }

        private Category getCategory(Map<String, Object> payload) {
                Object catVal = payload.get("categoryId");
                if (catVal == null || catVal.toString().trim().isEmpty()) {
                        throw new RuntimeException("กรุณาระบุรหัสหมวดหมู่ (categoryId)");
                }
                String categoryId = catVal.toString().trim();

                return categoryRepository.findById(categoryId)
                                .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่รหัส " + categoryId));
        }

        private District getDistrict(Map<String, Object> payload) {
                Object distVal = payload.get("districtId");
                if (distVal == null || distVal.toString().trim().isEmpty()) {
                        throw new RuntimeException("กรุณาระบุรหัสอำเภอ (districtId)");
                }

                try {
                        Integer districtId = Integer.valueOf(distVal.toString().trim());
                        return districtRepository.findById(districtId)
                                        .orElseThrow(() -> new RuntimeException("ไม่พบอำเภอรหัส " + districtId));
                } catch (NumberFormatException exception) {
                        throw new RuntimeException("รูปแบบรหัสอำเภอไม่ถูกต้อง");
                }
        }

        private String getRequiredString(Map<String, Object> payload, String key, String errorMessage) {
                Object value = payload.get(key);
                if (value == null || value.toString().trim().isEmpty()) {
                        throw new RuntimeException(errorMessage);
                }
                return value.toString().trim();
        }

        private String getOptionalString(Map<String, Object> payload, String key) {
                Object value = payload.get(key);
                if (value == null) {
                        return null;
                }
                String normalized = value.toString().trim();
                return normalized.isEmpty() ? null : normalized;
        }

        private Integer getRequiredInteger(Map<String, Object> payload, String key, String errorMessage) {
                Object value = payload.get(key);
                if (value == null) {
                        throw new RuntimeException(errorMessage);
                }
                try {
                        Integer number = Integer.valueOf(value.toString().trim());
                        if (number <= 0) {
                                throw new NumberFormatException();
                        }
                        return number;
                } catch (NumberFormatException exception) {
                        throw new RuntimeException(errorMessage);
                }
        }

        private Double getOptionalDouble(Map<String, Object> payload, String key) {
                Object value = payload.get(key);
                if (value == null || value.toString().trim().isEmpty()) {
                        return null;
                }
                try {
                        return Double.valueOf(value.toString().trim());
                } catch (NumberFormatException exception) {
                        throw new RuntimeException("รูปแบบพิกัดไม่ถูกต้อง");
                }
        }

        private void validateCoordinates(Double latitude, Double longitude) {
                if (latitude == null && longitude == null) {
                        return;
                }
                if (latitude == null || longitude == null) {
                        throw new RuntimeException("กรุณาระบุละติจูดและลองจิจูดให้ครบ");
                }
                if (latitude < -90 || latitude > 90) {
                        throw new RuntimeException("ละติจูดต้องอยู่ระหว่าง -90 ถึง 90");
                }
                if (longitude < -180 || longitude > 180) {
                        throw new RuntimeException("ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180");
                }
        }

        private void validateBase64File(String dataUrl, String[] allowedMimes, long maxSizeBytes, String fieldLabel) {
                if (dataUrl == null || dataUrl.trim().isEmpty()) {
                        return;
                }
                String trimmed = dataUrl.trim();
                if (!trimmed.startsWith("data:")) {
                        throw new RuntimeException("รูปแบบไฟล์" + fieldLabel + "ไม่ถูกต้อง");
                }
                int commaIndex = trimmed.indexOf(',');
                if (commaIndex == -1) {
                        throw new RuntimeException("รูปแบบไฟล์" + fieldLabel + "ไม่ถูกต้อง");
                }
                String metadata = trimmed.substring(5, commaIndex);
                String mime = metadata.split(";")[0].trim().toLowerCase();

                boolean mimeAllowed = false;
                for (String allowed : allowedMimes) {
                        if (allowed.equalsIgnoreCase(mime)) {
                                mimeAllowed = true;
                                break;
                        }
                }
                if (!mimeAllowed) {
                        throw new RuntimeException("ชนิดไฟล์" + fieldLabel + "ไม่รองรับ (รองรับเฉพาะ " + String.join(", ", allowedMimes) + ")");
                }

                String base64Data = trimmed.substring(commaIndex + 1);
                try {
                        byte[] decoded = java.util.Base64.getDecoder().decode(base64Data);
                        if (decoded.length > maxSizeBytes) {
                                long maxMb = maxSizeBytes / (1024 * 1024);
                                throw new RuntimeException("ขนาดไฟล์" + fieldLabel + "ต้องไม่เกิน " + maxMb + " MB");
                        }
                } catch (IllegalArgumentException e) {
                        throw new RuntimeException("รูปแบบ Base64 ของไฟล์" + fieldLabel + "ไม่ถูกต้อง");
                }
        }

        private void validateGalleryBase64(String galleryJson, long maxSizeBytes) {
                if (galleryJson == null || galleryJson.trim().isEmpty()) {
                        return;
                }
                try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        List<?> list = mapper.readValue(galleryJson, List.class);
                        if (list != null) {
                                for (Object item : list) {
                                        if (item instanceof String dataUrl) {
                                                validateBase64File(dataUrl, new String[] { "image/jpeg", "image/png" }, maxSizeBytes, "รูปภาพบรรยากาศ");
                                        }
                                }
                        }
                } catch (Exception e) {
                        if (e instanceof RuntimeException re) {
                                throw re;
                        }
                        throw new RuntimeException("รูปแบบข้อมูลรูปภาพบรรยากาศไม่ถูกต้อง");
                }
        }
}