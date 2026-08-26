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
            Integer licenseId,
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
            Integer licenseId,
            String reason) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("ผลการพิจารณาคำร้องสถานประกอบการ");
        message.setText("""
                คำร้องของสถานประกอบการไม่ได้รับการอนุมัติ

                ชื่อสถานประกอบการ:
                %s

                รหัสใบอนุญาตสถานประกอบการ:
                %s

                เหตุผล:
                %s

                กรุณาตรวจสอบข้อมูลและดำเนินการใหม่
                """.formatted(wellnessHubName, String.valueOf(licenseId), reason));

        mailSender.send(message);
    }

    public void notifyRequestResult(
            String email,
            String wellnessHubName,
            Integer licenseId,
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