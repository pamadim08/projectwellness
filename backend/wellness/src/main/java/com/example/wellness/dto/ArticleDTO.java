package com.example.wellness.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class ArticleDTO {
    private int articleId;
    private String content;
    private List<String> images;
    private Date postDate;

    // ข้อมูลคนโพสต์
    private String firstName;
    private String lastName;
    private String profileImage; // 🆕 รูปโปรไฟล์ผู้เขียน (null สำหรับบทความทางการ/user ที่ยังไม่ได้ตั้งรูป)

    // TravelTrip (บังคับแนบเสมอสำหรับบทความใหม่ แต่บทความเก่าก่อนหน้านี้อาจไม่มี)
    private int travelTripId;
    private String tripName;
    private String originName;
    private String destinationName;

    // 🆕 หมวดหมู่สถานประกอบการทั้งหมดที่อยู่ในเส้นทางที่แนบ (คำนวณสดทุกครั้ง ไม่ cache)
    // เป็น list เพราะเส้นทางหนึ่งอาจมีสถานประกอบการหลายหมวดหมู่ปนกันได้
    private List<String> categoryIds;
    private List<String> categoryNames;

    // 🆕 อำเภอต้นทาง-ปลายทางของเส้นทางที่แนบ ใช้กรองบทความตามอำเภอได้
    private List<Integer> districtIds;
    private List<String> districtNames;

    // 🆕 บทความทางการ (จาก OfficialArticle ของเพื่อน) — false เสมอสำหรับบทความ user ปกติ
    private boolean isOfficial;
    private String articleTitle; // มีค่าเฉพาะบทความทางการเท่านั้น (บทความ user ไม่มีหัวข้อ)
}