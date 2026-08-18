package com.example.wellness.service;

import com.example.wellness.model.AccountRequest;
import com.example.wellness.model.Category;
import com.example.wellness.model.EmergencyService;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.AccountRequestRepository;
import com.example.wellness.repository.EmergencyServiceRepository;
import com.example.wellness.repository.WellnessHubRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AccountRequestService {

        private static final String STATUS_PENDING = "PENDING";
        private static final String STATUS_APPROVED = "APPROVED";
        private static final String STATUS_REJECTED = "REJECTED";

        private final AccountRequestRepository repository;
        private final WellnessHubRepository wellnessHubRepository;
        private final EmergencyServiceRepository emergencyServiceRepository;
        private final EmailService emailService;

        public AccountRequestService(
                        AccountRequestRepository repository,
                        WellnessHubRepository wellnessHubRepository,
                        EmergencyServiceRepository emergencyServiceRepository,
                        EmailService emailService) {
                this.repository = repository;
                this.wellnessHubRepository = wellnessHubRepository;
                this.emergencyServiceRepository = emergencyServiceRepository;
                this.emailService = emailService;
        }

        // =====================================================
        // รายการคำขอทั้งหมด
        // =====================================================

        @Transactional(readOnly = true)
        public List<AccountRequest> getAllRequests() {
                return repository.findAllByOrderByRequestIdDesc();
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
        // สร้างคำขอ
        // =====================================================

        @Transactional
        public AccountRequest createRequest(Map<String, Object> payload) {
                if (payload == null) {
                        throw new RuntimeException("ไม่พบข้อมูลคำขอ");
                }

                Integer licenseId = getRequiredInteger(
                                payload,
                                "licenseId",
                                "เลขใบอนุญาตสถานประกอบการไม่ถูกต้อง");

                /*
                 * ค้นหาเลขใบอนุญาตจากทั้งสองตาราง
                 */
                WellnessHub wellnessHub = wellnessHubRepository
                                .findById(licenseId)
                                .orElse(null);

                EmergencyService emergencyService = emergencyServiceRepository
                                .findById(licenseId)
                                .orElse(null);

                if (wellnessHub == null && emergencyService == null) {
                        throw new RuntimeException("ไม่พบข้อมูลสถานประกอบการ");
                }

                /*
                 * ป้องกันกรณีเลขใบอนุญาตซ้ำกันสองตาราง
                 */
                if (wellnessHub != null && emergencyService != null) {
                        throw new RuntimeException("พบเลขใบอนุญาตซ้ำกันในระบบ กรุณาติดต่อผู้ดูแลระบบ");
                }

                boolean isEmergency = emergencyService != null;

                /*
                 * ตรวจคำขอที่กำลังรอ
                 */
                boolean hasPendingRequest = isEmergency
                                ? repository.existsByEmergencyService_LicenseIdAndRequestStatus(licenseId,
                                                STATUS_PENDING)
                                : repository.existsByWellnessHub_LicenseIdAndRequestStatus(licenseId, STATUS_PENDING);

                if (hasPendingRequest) {
                        throw new RuntimeException("สถานประกอบการนี้มีคำขอที่กำลังรอตรวจสอบอยู่แล้ว");
                }

                /*
                 * ตรวจคำขอที่อนุมัติแล้ว
                 */
                boolean hasApprovedRequest = isEmergency
                                ? repository.existsByEmergencyService_LicenseIdAndRequestStatus(licenseId,
                                                STATUS_APPROVED)
                                : repository.existsByWellnessHub_LicenseIdAndRequestStatus(licenseId, STATUS_APPROVED);

                if (hasApprovedRequest) {
                        throw new RuntimeException("สถานประกอบการนี้ได้รับการอนุมัติสิทธิ์แล้ว");
                }

                /*
                 * ลบคำขอเดิมที่ถูกปฏิเสธ เพื่ออนุญาตให้ส่งคำขอใหม่
                 */
                long deletedRejectedRequests = isEmergency
                                ? repository.deleteByEmergencyService_LicenseIdAndRequestStatus(licenseId,
                                                STATUS_REJECTED)
                                : repository.deleteByWellnessHub_LicenseIdAndRequestStatus(licenseId, STATUS_REJECTED);

                if (deletedRejectedRequests > 0) {
                        System.out.println("ลบคำขอที่ถูกปฏิเสธเดิมจำนวน " + deletedRejectedRequests
                                        + " รายการ สำหรับ licenseId: " + licenseId);
                }

                // =================================================
                // ตรวจข้อมูลบังคับ
                // =================================================

                String requesterName = getRequiredString(payload, "requesterName", "กรุณาระบุชื่อผู้ยื่นคำขอ");
                String userEmail = getRequiredString(payload, "userEmail", "กรุณาระบุอีเมล");
                String wellnessHubName = getRequiredString(payload, "wellnessHubName", "กรุณาระบุชื่อสถานประกอบการ");
                String address = getRequiredString(payload, "address", "กรุณาระบุที่อยู่");
                String tellInformation = getRequiredString(payload, "tellInformation", "กรุณาระบุเบอร์โทรศัพท์");
                String wellnessHubDescription = getRequiredString(payload, "wellnessHubDescription",
                                "กรุณาระบุรายละเอียดบริการ");
                String verificationDocuments = getRequiredString(payload, "verificationDocuments",
                                "กรุณาแนบเอกสารยืนยันสิทธิ์");

                // =================================================
                // สร้าง Entity คำขอ
                // =================================================

                AccountRequest request = new AccountRequest();

                request.setRequesterName(requesterName);
                request.setUserEmail(userEmail);
                request.setContactInformation(getOptionalString(payload, "contactInformation"));
                request.setTellInformation(tellInformation);
                request.setWellnessHubName(wellnessHubName);
                request.setAddress(address);
                request.setGoogleMapsLink(getOptionalString(payload, "googleMapsLink"));
                request.setWellnessHubDescription(wellnessHubDescription);
                request.setWellnessHubImg(getOptionalString(payload, "wellnessHubImg"));
                request.setWellnessHubGallery(getOptionalString(payload, "wellnessHubGallery"));
                request.setWellnessHubLatitude(getOptionalDouble(payload, "wellnessHubLatitude"));
                request.setWellnessHubLongitude(getOptionalDouble(payload, "wellnessHubLongitude"));

                validateCoordinates(
                                request.getWellnessHubLatitude(),
                                request.getWellnessHubLongitude());

                request.setCertificateType(getOptionalString(payload, "certificateType"));
                request.setOperatingHours(getOptionalString(payload, "operatingHours"));
                request.setVerificationDocuments(verificationDocuments);
                request.setVerificationDocumentName(getOptionalString(payload, "verificationDocumentName"));

                /*
                 * ผูกกับสถานประกอบการตามตารางต้นทาง
                 */
                if (wellnessHub != null) {
                        request.setWellnessHub(wellnessHub);
                        request.setEmergencyService(null);
                        request.setCategory(wellnessHub.getCategory());
                        request.setDistrict(wellnessHub.getDistrict());
                } else {
                        request.setWellnessHub(null);
                        request.setEmergencyService(emergencyService);
                        request.setCategory(emergencyService.getCategory());
                        request.setDistrict(emergencyService.getDistrict());
                }

                request.setRequestStatus(STATUS_PENDING);
                request.setRejectionReason(null);
                request.setProcessedDate(null);

                return repository.save(request);
        }

        // =====================================================
        // อนุมัติคำขอ
        // =====================================================

        @Transactional
        public AccountRequest approveRequest(Integer id) {
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

                WellnessHub wellnessHub = request.getWellnessHub();
                EmergencyService emergencyService = request.getEmergencyService();

                if (wellnessHub == null && emergencyService == null) {
                        throw new RuntimeException("ไม่พบข้อมูลสถานประกอบการ");
                }

                if (wellnessHub != null && emergencyService != null) {
                        throw new RuntimeException("คำขอมีข้อมูลสถานประกอบการซ้ำกันสองประเภท");
                }

                Integer licenseId = wellnessHub != null ? wellnessHub.getLicenseId() : emergencyService.getLicenseId();
                Category category = wellnessHub != null ? wellnessHub.getCategory() : emergencyService.getCategory();

                String username = generateUsername(licenseId, category);
                String password = UUID.randomUUID().toString().replace("-", "").substring(0, 8);

                /*
                 * ตรวจ Username ซ้ำทั้งสองตาราง
                 */
                if (wellnessHubRepository.existsByUsername(username)
                                || emergencyServiceRepository.existsByUsername(username)) {
                        throw new RuntimeException("Username ถูกใช้งานแล้ว");
                }

                /*
                 * อัปเดตข้อมูลกลับไปยังตารางที่ถูกต้อง
                 */
                if (wellnessHub != null) {
                        updateWellnessHubFromRequest(wellnessHub, request, username, password);
                        wellnessHubRepository.save(wellnessHub);
                } else {
                        updateEmergencyFromRequest(emergencyService, request, username, password);
                        emergencyServiceRepository.save(emergencyService);
                }

                request.setRequestStatus(STATUS_APPROVED);
                request.setRejectionReason(null);
                request.setProcessedDate(LocalDateTime.now());

                AccountRequest savedRequest = repository.save(request);

                emailService.sendApproveEmail(
                                savedRequest.getUserEmail(),
                                savedRequest.getWellnessHubName(),
                                licenseId,
                                username,
                                password);

                return savedRequest;
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
                        throw new RuntimeException("ไม่สามารถปฏิเสธคำขอที่อนุมัติแล้วได้");
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

                WellnessHub wellnessHub = request.getWellnessHub();
                EmergencyService emergencyService = request.getEmergencyService();

                if (wellnessHub == null && emergencyService == null) {
                        throw new RuntimeException("ไม่พบข้อมูลสถานประกอบการ");
                }

                if (wellnessHub != null && emergencyService != null) {
                        throw new RuntimeException("คำขอมีข้อมูลสถานประกอบการซ้ำกันสองประเภท");
                }

                Integer licenseId = wellnessHub != null
                                ? wellnessHub.getLicenseId()
                                : emergencyService.getLicenseId();

                request.setRequestStatus(STATUS_REJECTED);
                request.setRejectionReason(reason.trim());
                request.setProcessedDate(LocalDateTime.now());

                AccountRequest savedRequest = repository.save(request);

                emailService.sendRejectEmail(
                                savedRequest.getUserEmail(),
                                savedRequest.getWellnessHubName(),
                                licenseId,
                                savedRequest.getRejectionReason());

                return savedRequest;
        }

        // =====================================================
        // ติดตามสถานะคำขอ
        // =====================================================

        @Transactional(readOnly = true)
        public List<AccountRequest> trackRequests(String query) {
                if (query == null || query.trim().isEmpty()) {
                        throw new RuntimeException("กรุณาระบุเลขใบอนุญาตหรือชื่อสถานประกอบการ");
                }

                String normalizedQuery = query.trim();

                /*
                 * ค้นหาด้วยเลขใบอนุญาต
                 */
                if (normalizedQuery.matches("\\d+")) {
                        try {
                                Integer licenseId = Integer.valueOf(normalizedQuery);

                                if (licenseId <= 0) {
                                        throw new RuntimeException("เลขใบอนุญาตต้องมากกว่า 0");
                                }

                                List<AccountRequest> results = new ArrayList<>();

                                results.addAll(repository.findByWellnessHub_LicenseIdOrderByRequestIdDesc(licenseId));
                                results.addAll(repository
                                                .findByEmergencyService_LicenseIdOrderByRequestIdDesc(licenseId));

                                results.sort(Comparator.comparing(
                                                AccountRequest::getRequestId,
                                                Comparator.nullsLast(Comparator.reverseOrder())));

                                return results;

                        } catch (NumberFormatException exception) {
                                throw new RuntimeException("รูปแบบเลขใบอนุญาตไม่ถูกต้อง");
                        }
                }

                /*
                 * ค้นหาด้วยชื่อที่เก็บใน AccountRequest จึงค้นหาได้ทั้ง Wellness และ Emergency
                 */
                if (normalizedQuery.length() < 2) {
                        throw new RuntimeException("กรุณากรอกชื่อสถานประกอบการอย่างน้อย 2 ตัวอักษร");
                }

                return repository.findByWellnessHubNameContainingIgnoreCaseOrderByRequestIdDesc(normalizedQuery);
        }

        // =====================================================
        // อัปเดต WellnessHub จากคำขอ
        // =====================================================

        private void updateWellnessHubFromRequest(
                        WellnessHub hub,
                        AccountRequest request,
                        String username,
                        String password) {
                hub.setUsername(username);
                hub.setPassword(password);
                hub.setStatus("ACTIVE");
                hub.setWellnessHubName(request.getWellnessHubName());
                hub.setContactInformation(request.getContactInformation());
                hub.setTelInformation(request.getTellInformation());
                hub.setAddress(request.getAddress());
                hub.setGoogleMapsLink(request.getGoogleMapsLink());
                hub.setWellnessHubDescription(request.getWellnessHubDescription());
                hub.setWellnessHubImg(request.getWellnessHubImg());
                hub.setWellnessHubLatitude(request.getWellnessHubLatitude());
                hub.setWellnessHubLongitude(request.getWellnessHubLongitude());
                hub.setCertificateType(request.getCertificateType());
                hub.setOperatingHours(request.getOperatingHours());
                hub.setCategory(request.getCategory());
                hub.setDistrict(request.getDistrict());
        }

        // =====================================================
        // อัปเดต EmergencyService จากคำขอ
        // =====================================================

        private void updateEmergencyFromRequest(
                        EmergencyService emergency,
                        AccountRequest request,
                        String username,
                        String password) {
                emergency.setUsername(username);
                emergency.setPassword(password);
                emergency.setStatus("ACTIVE");
                emergency.setWellnessHubName(request.getWellnessHubName());
                emergency.setContactInformation(request.getContactInformation());
                emergency.setTelInformation(request.getTellInformation());
                emergency.setAddress(request.getAddress());
                emergency.setGoogleMapsLink(request.getGoogleMapsLink());
                emergency.setWellnessHubDescription(request.getWellnessHubDescription());
                emergency.setWellnessHubImg(request.getWellnessHubImg());
                emergency.setWellnessHubLatitude(request.getWellnessHubLatitude());
                emergency.setWellnessHubLongitude(request.getWellnessHubLongitude());
                emergency.setCertificateType(request.getCertificateType());
                emergency.setOperatingHours(request.getOperatingHours());
                emergency.setCategory(request.getCategory());
                emergency.setDistrict(request.getDistrict());
        }

        // =====================================================
        // สร้าง Username
        // =====================================================

        private String generateUsername(Integer licenseId, Category category) {
                if (licenseId == null || licenseId <= 0) {
                        throw new RuntimeException("เลขใบอนุญาตสถานประกอบการไม่ถูกต้อง");
                }

                if (category == null || category.getCategoryId() == null) {
                        throw new RuntimeException("ไม่พบหมวดหมู่ของสถานประกอบการ");
                }

                String categoryId = category.getCategoryId().trim().toUpperCase();

                String categoryEnglish = switch (categoryId) {
                        case "C01" -> "spa";
                        case "C02" -> "clinic";
                        case "C03" -> "food";
                        case "C04" -> "stay";
                        case "C05" -> "attraction";
                        case "EM01" -> "rescue";
                        case "EM02" -> "hospital";
                        default -> throw new RuntimeException("ไม่รองรับหมวดหมู่รหัส " + categoryId);
                };

                String paddedLicenseId = String.format("%010d", licenseId);
                String username = categoryEnglish + paddedLicenseId;

                if (!username.matches("^[A-Za-z0-9]{13,20}$")) {
                        throw new RuntimeException("Username ที่ระบบสร้างไม่เป็นไปตามเงื่อนไข");
                }

                return username;
        }

        // =====================================================
        // Helper Methods
        // =====================================================

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
}