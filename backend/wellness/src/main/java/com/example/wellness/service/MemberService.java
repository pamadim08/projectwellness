package com.example.wellness.service;

import com.example.wellness.dto.ArticleDTO;
import com.example.wellness.dto.MyTravelTripDTO;
import com.example.wellness.dto.UserProfileResponse;
import com.example.wellness.model.Member;
import com.example.wellness.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class MemberService {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private MyTravelTripService myTravelTripService;

    @Autowired
    private ArticleService articleService;

    // path บนดิสก์ที่เก็บไฟล์ (ตั้งค่าใน application.properties ตัวเดียวกับที่ ArticleService ใช้)
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    // 🆕 Pattern ตาม requirement — ชื่อ/นามสกุล: 2-50 ตัวอักษร ตัวอักษรล้วน (ไทย/อังกฤษ)
    // ห้ามมีตัวเลขหรืออักขระพิเศษ (รวมถึงเว้นวรรค ถือเป็นอักขระพิเศษตาม requirement)
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Zก-๙]{2,50}$");

    // อีเมล — รูปแบบมาตรฐาน เช่น example@email.com
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$");

    // รหัสผ่าน — 8-30 ตัวอักษร ต้องมีตัวอักษรอย่างน้อย 1 ตัว, ตัวเลขอย่างน้อย 1 ตัว,
    // และอักขระพิเศษ (ไม่ใช่ตัวอักษร/ตัวเลข) อย่างน้อย 1 ตัว
    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,30}$");

    public boolean isEmailTaken(String email) {
        return memberRepository.existsByEmail(email);
    }

    // 🆕 ดักทุก requirement ก่อนบันทึกจริง — เป็นด่านสุดท้ายที่พึ่งพาได้เสมอ
    // (ฝั่ง Flutter เช็คก่อนแล้วเช่นกัน แต่ backend ต้องเช็คซ้ำ กันมีคนยิง API ข้าม UI)
    public Member registerMember(Member member) {
        // --- อีเมล ---
        if (member.getEmail() == null || member.getEmail().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอกอีเมล");
        }
        String email = member.getEmail().trim();
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("รูปแบบอีเมลไม่ถูกต้อง");
        }
        // 5.1.1 — alternate flow: อีเมลซ้ำ
        if (memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("บัญชีนี้มีผู้ใช้แล้ว กรุณาลองบัญชีอื่น");
        }
        member.setEmail(email);

        // --- ชื่อ ---
        if (member.getFirstName() == null || member.getFirstName().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอกชื่อ");
        }
        String firstName = member.getFirstName().trim();
        if (!NAME_PATTERN.matcher(firstName).matches()) {
            throw new IllegalArgumentException(
                    "ชื่อต้องเป็นตัวอักษร 2-50 ตัว ห้ามมีตัวเลขหรืออักขระพิเศษ");
        }
        member.setFirstName(firstName);

        // --- นามสกุล ---
        if (member.getLastName() == null || member.getLastName().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอกนามสกุล");
        }
        String lastName = member.getLastName().trim();
        if (!NAME_PATTERN.matcher(lastName).matches()) {
            throw new IllegalArgumentException(
                    "นามสกุลต้องเป็นตัวอักษร 2-50 ตัว ห้ามมีตัวเลขหรืออักขระพิเศษ");
        }
        member.setLastName(lastName);

        // --- รหัสผ่าน ---
        if (member.getPassword() == null || member.getPassword().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอกรหัสผ่าน");
        }
        if (!PASSWORD_PATTERN.matcher(member.getPassword()).matches()) {
            throw new IllegalArgumentException(
                    "รหัสผ่านต้องมี 8-30 ตัวอักษร ประกอบด้วยตัวอักษร ตัวเลข "
                            + "และอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว");
        }

        return memberRepository.save(member);
    }

    // 🆕 5.1.1 — แยก 2 alternate flow ชัดเจน: ไม่มีบัญชี vs รหัสผ่านผิด
    public Member loginMember(String email, String password) {
        Member member = memberRepository.findByEmail(email).orElse(null);

        if (member == null) {
            throw new NoSuchElementException("ไม่พบบัญชีของท่าน กรุณาลงทะเบียนก่อนเข้าสู่ระบบ");
        }
        if (!member.getPassword().equals(password)) {
            throw new IllegalArgumentException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
        return member;
    }


    public void editProfile(Integer memberId, String firstName, String lastName) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));
        member.setFirstName(firstName);
        member.setLastName(lastName);
        memberRepository.save(member);
    }

    // 🆕 อัพโหลด/แก้ไขรูปโปรไฟล์ — ลบรูปเก่าทิ้งจากดิสก์ด้วย (ถ้ามี) กันไฟล์ค้างสะสม
    public String updateProfileImage(Integer memberId, MultipartFile image) throws IOException {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("กรุณาเลือกรูปภาพ");
        }

        // ลบรูปเก่าทิ้งก่อน (best-effort — ไม่ให้พัง request ถ้าลบไม่สำเร็จ)
        String oldImage = member.getProfileImage();
        if (oldImage != null && !oldImage.isEmpty()) {
            try {
                String oldFilename = oldImage.substring(oldImage.lastIndexOf('/') + 1);
                Files.deleteIfExists(Paths.get(uploadDir, "profiles", oldFilename));
            } catch (Exception ignored) {
            }
        }

        Path uploadPath = Paths.get(uploadDir, "profiles");
        Files.createDirectories(uploadPath);

        String original = image.getOriginalFilename();
        String extension = "";
        if (original != null && original.contains(".")) {
            extension = original.substring(original.lastIndexOf('.'));
        }
        String filename = UUID.randomUUID() + extension;

        Path filePath = uploadPath.resolve(filename);
        image.transferTo(filePath);

        String newImagePath = "/uploads/profiles/" + filename;
        member.setProfileImage(newImagePath);
        memberRepository.save(member);

        return newImagePath;
    }


    public UserProfileResponse getMember(Integer memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานนี้ในระบบ"));

        String fullName = member.getFirstName() + " " + member.getLastName();

        List<Object> favorites = new ArrayList<>();
        List<MyTravelTripDTO> routes = myTravelTripService.getMyTrips(memberId);
        List<ArticleDTO> posts = articleService.getMyArticles(memberId);

        return new UserProfileResponse(
                fullName,
                member.getEmail(),
                member.getProfileImage(), // 🆕
                favorites,
                routes,
                posts
        );
    }
}