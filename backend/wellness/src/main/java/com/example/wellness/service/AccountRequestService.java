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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

        public AccountRequestService(
                        AccountRequestRepository repository,
                        WellnessHubRepository wellnessHubRepository,
                        EmergencyServiceRepository emergencyServiceRepository,
                        EmailService emailService,
                        CategoryRepository categoryRepository,
                        DistrictRepository districtRepository) {
                this.repository = repository;
                this.wellnessHubRepository = wellnessHubRepository;
                this.emergencyServiceRepository = emergencyServiceRepository;
                this.emailService = emailService;
                this.categoryRepository = categoryRepository;
                this.districtRepository = districtRepository;
        }

        // =====================================================
        // รายการคำขอทั้งหมด
        // =====================================================

        @Transactional(readOnly = true)
        public List<AccountRequest> listAccountRequest() {
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
        // สร้างคำขอ (ส่วนที่ 1)
        // =====================================================

        @Transactional
        public AccountRequest requestWellnessHubAccount(Map<String, Object> payload) {
                if (payload == null) {
                        throw new RuntimeException("ไม่พบข้อมูลคำขอ");
                }

                Integer licenseId = getRequiredInteger(
                                payload,
                                "licenseId",
                                "เลขใบอนุญาตสถานประกอบการไม่ถูกต้อง");

                /*
                 * ตรวจคำขอที่กำลังรอ / อนุมัติแล้ว
                 */
                boolean hasPendingRequest = repository.existsByLicenseIdAndRequestStatus(licenseId, STATUS_PENDING);
                if (hasPendingRequest) {
                        throw new RuntimeException("สถานประกอบการนี้มีคำขอที่กำลังรอตรวจสอบอยู่แล้ว");
                }

                boolean hasApprovedRequest = repository.existsByLicenseIdAndRequestStatus(licenseId, STATUS_APPROVED);
                if (hasApprovedRequest) {
                        throw new RuntimeException("สถานประกอบการนี้ได้รับการอนุมัติสิทธิ์แล้ว");
                }

                /*
                 * ลบคำขอเดิมที่ถูกปฏิเสธ เพื่ออนุญาตให้ส่งคำขอใหม่
                 */
                long deletedRejectedRequests = repository.deleteByLicenseIdAndRequestStatus(licenseId, STATUS_REJECTED);
                if (deletedRejectedRequests > 0) {
                        System.out.println("ลบคำขอที่ถูกปฏิเสธเดิมจำนวน " + deletedRejectedRequests
                                        + " รายการ สำหรับ licenseId: " + licenseId);
                }

                // =================================================
                // ตรวจข้อมูลบังคับ
                // =================================================

                String requesterName = getRequiredString(payload, "requesterName", "กรุณาระบุชื่อผู้ยื่นคำขอ");
                String userEmail = getRequiredString(payload, "userEmail", "กรุณาระบุอีเมล");
                String username = getRequiredString(payload, "username", "กรุณาระบุ Username").trim();
                if (username.contains(" ")) {
                        throw new RuntimeException("Username ต้องไม่มีช่องว่าง");
                }
                if (!username.matches("^[\\x21-\\x7E]{4,20}$")) {
                        throw new RuntimeException("Username ต้องเป็นภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษ ความยาว 4–20 ตัวอักษร");
                }
                String password = getRequiredString(payload, "password", "กรุณาระบุ Password");
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

                request.setLicenseId(licenseId);
                request.setUsername(username);
                request.setPassword(password);
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

                AccountRequest savedRequest = repository.save(request);

                emailService.sendApproveEmail(
                                savedRequest.getUserEmail(),
                                savedRequest.getWellnessHubName(),
                                savedRequest.getLicenseId(),
                                savedRequest.getUsername(),
                                savedRequest.getPassword());

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

                request.setRequestStatus(STATUS_REJECTED);
                request.setRejectionReason(reason.trim());
                request.setProcessedDate(LocalDateTime.now());

                AccountRequest savedRequest = repository.save(request);

                emailService.sendRejectEmail(
                                savedRequest.getUserEmail(),
                                savedRequest.getWellnessHubName(),
                                savedRequest.getLicenseId(),
                                savedRequest.getRejectionReason());

                return savedRequest;
        }

        // =====================================================
        // ติดตามสถานะคำขอ (ค้นหาด้วย Username)
        // =====================================================

        @Transactional(readOnly = true)
        public List<AccountRequest> trackRequestStatus(String username) {
                if (username == null || username.trim().isEmpty()) {
                        throw new RuntimeException("กรุณาระบุชื่อผู้ใช้งาน (Username)");
                }

                String normalizedUsername = username.trim();

                return repository.findByUsernameIgnoreCaseOrderByRequestIdDesc(normalizedUsername);
        }

        // =====================================================
        // Helper Methods
        // =====================================================

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
}