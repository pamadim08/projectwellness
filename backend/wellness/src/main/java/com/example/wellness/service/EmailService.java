package com.example.wellness.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;


@Service
public class EmailService {


    private final JavaMailSender mailSender;


    public EmailService(
        JavaMailSender mailSender
    ){
        this.mailSender = mailSender;
    }



    public void sendApproveEmail(
        String email,
        String username,
        String password
    ){

        SimpleMailMessage message =
                new SimpleMailMessage();


        message.setTo(email);

        message.setSubject(
            "ผลการอนุมัติบัญชี Wellness Hub"
        );


        message.setText(
            """
            ระบบได้อนุมัติบัญชีของคุณแล้ว

            Username:
            %s

            Password:
            %s

            กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านเพื่อความปลอดภัย
            """
            .formatted(username,password)
        );


        mailSender.send(message);

    }



    public void sendRejectEmail(
        String email,
        String reason
    ){

        SimpleMailMessage message =
                new SimpleMailMessage();


        message.setTo(email);

        message.setSubject(
            "ผลการพิจารณาคำร้องบัญชี Wellness Hub"
        );


        message.setText(
            """
            คำร้องของคุณไม่ได้รับการอนุมัติ

            เหตุผล:
            %s

            กรุณาตรวจสอบข้อมูลและดำเนินการใหม่
            """
            .formatted(reason)
        );


        mailSender.send(message);

    }

}