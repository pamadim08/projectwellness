package com.example.wellness.service;

import com.example.wellness.model.AccountRequest;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.AccountRequestRepository;
import com.example.wellness.repository.WellnessHubRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AccountRequestService {

    private final AccountRequestRepository repository;
    private final WellnessHubRepository wellnessHubRepository;
    private final EmailService emailService;

    public AccountRequestService(
            AccountRequestRepository repository,
            WellnessHubRepository wellnessHubRepository,
            EmailService emailService) {
        this.repository = repository;
        this.wellnessHubRepository = wellnessHubRepository;
        this.emailService = emailService;
    }

    // =================================
    // List Account Request
    // =================================
    public List<AccountRequest> getAllRequests() {
        return repository.findAllByOrderByRequestIdDesc();
    }

    // =================================
    // Detail
    // =================================
    public AccountRequest getRequestById(Integer id) {
        return repository.findById(id).orElse(null);
    }

    // =================================
    // Approve Request
    // =================================
    @Transactional
    public AccountRequest approveRequest(Integer id) { // ปรับรับแค่ id ไม่รับ username/password จาก Frontend แล้ว
        AccountRequest request = repository.findById(id).orElse(null);

        if (request == null) {
            return null;
        }

        // ป้องกันอนุมัติซ้ำ
        if ("APPROVED".equals(request.getRequestStatus())
                || "REJECTED".equals(request.getRequestStatus())) {
            return request;
        }

        WellnessHub hub = request.getWellnessHub();

        // 2. ถ้าไม่มี ข้อมูลสถานประกอบการ (WellnessHub) ให้ Throw Error ทันที
        if (hub == null) {
            throw new RuntimeException("ไม่พบข้อมูลสถานประกอบการ");
        }

        // 3. ระบบสร้าง Username และ Password เองที่ฝั่ง Back-end เพื่อความปลอดภัย
        String username = "hub" + hub.getLicenseId();
        String password = UUID.randomUUID().toString().substring(0, 8);

        // 4. เช็ค Username ซ้ำในระบบ
        if (wellnessHubRepository.existsByUsername(username)) {
            throw new RuntimeException("Username ถูกใช้งานแล้ว");
        }

        // ==========================
        // บันทึก Account
        // ==========================
        hub.setUsername(username);
        hub.setPassword(password);
        hub.setStatus("ACTIVE");

        // ==========================
        // Update ข้อมูลเพิ่มเติม จากคำร้อง
        // ==========================
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

        wellnessHubRepository.save(hub);

        // ==========================
        // Update Request Status
        // ==========================
        request.setRequestStatus("APPROVED");
        request.setProcessedDate(LocalDateTime.now());

        // 1. ย้ายมาบันทึกข้อมูล AccountRequest ลง Database ให้เสร็จก่อน
        AccountRequest savedRequest = repository.save(request);

        // หลังจาก Database ผ่านฉลุยแล้ว ค่อยส่ง Email แจ้งข้อมูล Login
        emailService.sendApproveEmail(
                savedRequest.getUserEmail(),
                username,
                password);

        return savedRequest;
    }

    // =================================
    // Reject Request
    // =================================
    @Transactional
    public AccountRequest rejectRequest(Integer id, String reason) {
        AccountRequest request = repository.findById(id).orElse(null);

        if (request == null) {
            return null;
        }

        // ป้องกันปฏิเสธซ้ำ
        if ("APPROVED".equals(request.getRequestStatus())
                || "REJECTED".equals(request.getRequestStatus())) {
            return request;
        }

        // ต้องมีเหตุผล
        if (reason == null || reason.trim().isEmpty()) {
            throw new RuntimeException("กรุณาระบุเหตุผลการไม่อนุมัติ");
        }

        request.setRequestStatus("REJECTED");
        // 5. ตัดช่องว่าง (trim) เหตุผลที่ส่งมาจาก Frontend ป้องกันปัญหามี space
        // นำหน้า/ตามหลัง
        request.setRejectionReason(reason.trim());
        request.setProcessedDate(LocalDateTime.now());

        // บันทึกสถานะคำร้องที่ถูกปฏิเสธลงฐานข้อมูลให้เรียบร้อยก่อน
        AccountRequest savedRequest = repository.save(request);

        // ส่ง Email แจ้งผลการปฏิเสธพร้อมเหตุผลหลังเซฟเสร็จ
        emailService.sendRejectEmail(
                savedRequest.getUserEmail(),
                savedRequest.getRejectionReason());

        return savedRequest;
    }
}