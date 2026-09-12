package com.example.wellness.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendApproveEmail(
            String email,
            String wellnessHubName,
            String licenseId,
            String username,
            String password) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("ผลการอนุมัติบัญชีสถานประกอบการ");
        message.setText("""
                ระบบได้อนุมัติบัญชีสถานประกอบการของคุณแล้ว

                ชื่อสถานประกอบการ:
                %s

                รหัสใบอนุญาตสถานประกอบการ:
                %s

                Username:
                %s

                Password:
                %s
                """.formatted(wellnessHubName, String.valueOf(licenseId), username, password));

        mailSender.send(message);
    }

    public void sendRejectEmail(
            String email,
            String wellnessHubName,
            String licenseId,
            String reason) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("ผลการพิจารณาคำร้องขอสิทธิ์สถานประกอบการ");
        message.setText("""
                คำร้องขอสิทธิ์สถานประกอบการของคุณไม่ได้รับการอนุมัติ

                ชื่อสถานประกอบการ:
                %s

                รหัสใบอนุญาตสถานประกอบการ:
                %s

                เหตุผลที่ไม่อนุมัติ:
                %s

                --------------------------------------------------
                คำแนะนำในการดำเนินการ:
                ท่านสามารถตรวจสอบและแก้ไขข้อมูลหรือเอกสารประกอบให้ถูกต้องครบถ้วน
                จากนั้นสามารถดำเนินการยื่นคำร้องขอสิทธิ์เข้ามาใหม่อีกครั้งผ่านทางเว็บไซต์ระบบได้
                เมื่อท่านส่งข้อมูลเข้ามาใหม่ ระบบจะนำข้อมูลเข้าสู่กระบวนการ "รอพิจารณา" อีกครั้ง
                """.formatted(wellnessHubName, String.valueOf(licenseId), reason));

        mailSender.send(message);
    }

    public void notifyRequestResult(
            String email,
            String wellnessHubName,
            String licenseId,
            boolean isApproved,
            String username,
            String password,
            String reason) {
        if (isApproved) {
            sendApproveEmail(email, wellnessHubName, licenseId, username, password);
        } else {
            sendRejectEmail(email, wellnessHubName, licenseId, reason);
        }
    }
}