package com.example.wellness.service;

import com.example.wellness.dto.ArticleDTO;
import com.example.wellness.model.Article;
import com.example.wellness.model.Member;
import com.example.wellness.model.MyTravelTrip;
import com.example.wellness.model.MyTravelTripDetail;
import com.example.wellness.model.OfficialArticle;
import com.example.wellness.repository.ArticleRepository;
import com.example.wellness.repository.MemberRepository;
import com.example.wellness.repository.MyTravelTripRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final MemberRepository memberRepository;
    private final MyTravelTripRepository tripRepository;
    private final OfficialArticleService officialArticleService; // 🆕 ไม่แตะไฟล์เพื่อนเลย แค่ inject มาใช้

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    // 🆕 ดึงบทความ user + บทความทางการ มารวมกัน เรียงตามวันที่โพสต์ล่าสุดก่อน
    public List<ArticleDTO> getAllArticles() {
        List<ArticleDTO> userArticles = articleRepository.findAllByOrderByPostDateDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        List<ArticleDTO> officialArticles = officialArticleService.listOfficialArticle()
                .stream()
                .map(this::convertOfficialToDTO)
                .collect(Collectors.toList());

        List<ArticleDTO> combined = new ArrayList<>();
        combined.addAll(userArticles);
        combined.addAll(officialArticles);
        combined.sort(Comparator.comparing(ArticleDTO::getPostDate).reversed());

        return combined;
    }

    public List<ArticleDTO> searchArticles(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return getAllArticles();
        }
        return articleRepository.searchArticles(keyword.trim())
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ArticleDTO> getMyArticles(Integer memberId) {
        return articleRepository.findByMemberMemberIdOrderByPostDateDesc(memberId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 🆕 กรองบทความตามหมวดหมู่/อำเภอ (คำนวณสดจาก trip ที่แนบทุกครั้ง) — ใช้ในหน้าฟีด
    public List<ArticleDTO> filterArticles(String categoryId, Integer districtId) {
        return articleRepository.filterArticles(categoryId, districtId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public void deleteArticle(Integer articleId, Integer memberId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบบทความ"));

        if (article.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์ลบบทความนี้");
        }

        articleRepository.delete(article);
    }

    // 🆕 จำนวนรูปสูงสุดต่อบทความ — เช็คซ้ำที่ backend เผื่อมีใครยิง API ข้าม UI ไปโดยตรง
    // (ฝั่ง Flutter จำกัดไว้ที่ 4 อยู่แล้วเช่นกัน แต่ backend ต้องเป็นด่านสุดท้ายที่พึ่งพาได้เสมอ)
    private static final int MAX_IMAGES_PER_ARTICLE = 4;

    // สร้างบทความใหม่ — 🆕 บังคับแนบเส้นทางเสมอ (ไม่รับ categoryId แล้ว คำนวณจาก trip แทน)
    @Transactional
    public Integer createArticle(Integer memberId, String content, Integer travelTripId,
                                 List<MultipartFile> images) throws IOException {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        // 🆕 บังคับแนบเส้นทางเสมอ
        if (travelTripId == null) {
            throw new IllegalArgumentException("กรุณาแนบเส้นทางก่อนโพสต์บทความ");
        }
        MyTravelTrip trip = tripRepository.findById(travelTripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));
        if (trip.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์แนบเส้นทางนี้");
        }

        // 🆕 เช็คจำนวนรูปที่ส่งมาไม่เกินที่กำหนด
        if (images != null && images.size() > MAX_IMAGES_PER_ARTICLE) {
            throw new IllegalArgumentException(
                    "โพสต์รูปได้สูงสุด " + MAX_IMAGES_PER_ARTICLE + " รูปต่อโพสต์");
        }

        List<String> imageUrls = new ArrayList<>();
        if (images != null) {
            Path uploadPath = Paths.get(uploadDir, "articles");
            Files.createDirectories(uploadPath);

            for (MultipartFile file : images) {
                if (file == null || file.isEmpty()) continue;

                String original = file.getOriginalFilename();
                String extension = "";
                if (original != null && original.contains(".")) {
                    extension = original.substring(original.lastIndexOf('.'));
                }
                String filename = UUID.randomUUID() + extension;

                Path filePath = uploadPath.resolve(filename);
                file.transferTo(filePath);

                imageUrls.add("/uploads/articles/" + filename);
            }
        }

        Article article = new Article();
        article.setContent(content);
        article.setPostDate(new Date());
        article.setMember(member);
        article.setMyTravelTrip(trip); // 🆕 ไม่ null อีกต่อไป (บังคับแนบเสมอ)

        if (!imageUrls.isEmpty()) {
            ObjectMapper mapper = new ObjectMapper();
            article.setImage(mapper.writeValueAsString(imageUrls));
        }

        Article saved = articleRepository.save(article);
        return saved.getArticleId();
    }

    // แก้ไขบทความ — 🆕 บังคับแนบเส้นทางเสมอเช่นกัน (ไม่รับ categoryId แล้ว)
    @Transactional
    public void updateArticle(Integer articleId, Integer memberId, String content,
                              Integer travelTripId, List<String> existingImagePaths,
                              List<MultipartFile> newImages) throws IOException {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบบทความ"));

        if (article.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์แก้ไขบทความนี้");
        }

        // 🆕 บังคับแนบเส้นทางเสมอ
        if (travelTripId == null) {
            throw new IllegalArgumentException("กรุณาแนบเส้นทางก่อนบันทึกบทความ");
        }
        MyTravelTrip trip = tripRepository.findById(travelTripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));
        if (trip.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์แนบเส้นทางนี้");
        }

        // 🆕 เช็คจำนวนรูปรวม (เก่าที่เก็บไว้ + ใหม่ที่เพิ่ม) ไม่เกินที่กำหนด
        int existingCount = existingImagePaths != null ? existingImagePaths.size() : 0;
        int newCount = newImages != null ? newImages.size() : 0;
        if (existingCount + newCount > MAX_IMAGES_PER_ARTICLE) {
            throw new IllegalArgumentException(
                    "โพสต์รูปได้สูงสุด " + MAX_IMAGES_PER_ARTICLE + " รูปต่อโพสต์");
        }

        List<String> oldImagePaths = parseImages(article.getImage());

        List<String> finalImagePaths = new ArrayList<>(
                existingImagePaths != null ? existingImagePaths : List.of());

        if (newImages != null) {
            Path uploadPath = Paths.get(uploadDir, "articles");
            Files.createDirectories(uploadPath);

            for (MultipartFile file : newImages) {
                if (file == null || file.isEmpty()) continue;

                String original = file.getOriginalFilename();
                String extension = "";
                if (original != null && original.contains(".")) {
                    extension = original.substring(original.lastIndexOf('.'));
                }
                String filename = UUID.randomUUID() + extension;

                Path filePath = uploadPath.resolve(filename);
                file.transferTo(filePath);

                finalImagePaths.add("/uploads/articles/" + filename);
            }
        }

        for (String oldPath : oldImagePaths) {
            if (!finalImagePaths.contains(oldPath)) {
                try {
                    String filename = oldPath.substring(oldPath.lastIndexOf('/') + 1);
                    Files.deleteIfExists(Paths.get(uploadDir, "articles", filename));
                } catch (Exception ignored) {
                }
            }
        }

        article.setContent(content);
        article.setMyTravelTrip(trip);

        if (finalImagePaths.isEmpty()) {
            article.setImage(null);
        } else {
            ObjectMapper mapper = new ObjectMapper();
            article.setImage(mapper.writeValueAsString(finalImagePaths));
        }

        articleRepository.save(article);
    }

    private List<String> parseImages(String raw) {
        if (raw == null || raw.isEmpty()) return new ArrayList<>();
        if (raw.startsWith("[")) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                return new ArrayList<>(mapper.readValue(raw, new TypeReference<List<String>>() {}));
            } catch (Exception e) {
                return new ArrayList<>(List.of(raw));
            }
        }
        return new ArrayList<>(List.of(raw));
    }

    // 🆕 แปลง OfficialArticle (ของเพื่อน) ให้เป็น ArticleDTO รูปแบบเดียวกับบทความ user
    // เพื่อรวมแสดงในฟีดเดียวกันได้ — เก็บภาพปก (img) เป็นตัวแรกของ images เสมอ
    // ตามด้วยภาพเพิ่มเติมจาก articleImages (ทั้งคู่เป็น Base64 อยู่แล้ว ไม่ต้องแปลงอะไร
    // ฝั่ง Flutter จะเช็คเองว่าเป็น Base64 หรือ URL แล้ว render ให้ถูกแบบ)
    private ArticleDTO convertOfficialToDTO(OfficialArticle official) {
        ArticleDTO dto = new ArticleDTO();
        dto.setArticleId(official.getArticleId() != null ? official.getArticleId() : 0);
        dto.setArticleTitle(official.getArticleTitle());
        dto.setContent(official.getArticleDetail());
        dto.setOfficial(true);

        // publishDate เป็น LocalDateTime ต้องแปลงเป็น Date ให้ตรงกับ ArticleDTO
        dto.setPostDate(official.getPublishDate() != null
                ? Date.from(official.getPublishDate().atZone(ZoneId.systemDefault()).toInstant())
                : new Date());

        // author เป็น free-text ไม่ได้ผูกกับ Member จริง เก็บไว้ที่ firstName ตัวเดียว
        dto.setFirstName(official.getAuthor() != null ? official.getAuthor() : "ทีมงาน");
        dto.setLastName("");

        List<String> images = new ArrayList<>();
        if (official.getImg() != null && !official.getImg().isBlank()) {
            images.add(official.getImg());
        }
        if (official.getArticleImages() != null && !official.getArticleImages().isBlank()) {
            images.addAll(parseImages(official.getArticleImages()));
        }
        dto.setImages(images);

        dto.setCategoryIds(List.of());
        dto.setCategoryNames(
                official.getArticleCategory() != null
                        ? List.of(official.getArticleCategory())
                        : List.of()
        );
        dto.setDistrictIds(List.of());
        dto.setDistrictNames(List.of());

        return dto;
    }

    private ArticleDTO convertToDTO(Article article) {
        ArticleDTO dto = new ArticleDTO();
        dto.setArticleId(article.getArticleId());
        dto.setContent(article.getContent());
        dto.setPostDate(article.getPostDate());

        if (article.getMember() != null) {
            dto.setFirstName(article.getMember().getFirstName());
            dto.setLastName(article.getMember().getLastName());
            dto.setProfileImage(article.getMember().getProfileImage()); // 🆕
        }

        if (article.getImage() != null && !article.getImage().isEmpty()) {
            String raw = article.getImage();
            if (raw.startsWith("[")) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    List<String> imgList = mapper.readValue(raw,
                            new TypeReference<List<String>>() {});
                    dto.setImages(imgList);
                } catch (Exception e) {
                    dto.setImages(List.of(raw));
                }
            } else {
                dto.setImages(List.of(raw));
            }
        } else {
            dto.setImages(List.of());
        }

        // 🆕 คำนวณหมวดหมู่ + อำเภอสดจาก trip ที่แนบทุกครั้ง (ไม่ cache เลย)
        if (article.getMyTravelTrip() != null) {
            MyTravelTrip trip = article.getMyTravelTrip();
            dto.setTravelTripId(trip.getTravelTripId());
            dto.setTripName(trip.getTripName());
            dto.setOriginName(trip.getOriginName());
            dto.setDestinationName(trip.getDestinationName());

            // หมวดหมู่ทั้งหมดที่ปรากฏในเส้นทางนี้ (ไม่ซ้ำ เรียงตามลำดับที่เจอก่อน-หลัง)
            List<String> catIds = new ArrayList<>();
            List<String> catNames = new ArrayList<>();
            if (trip.getTripDetails() != null) {
                Set<String> seenCatIds = new LinkedHashSet<>();
                for (MyTravelTripDetail detail : trip.getTripDetails()) {
                    if (detail.getWellnessHub() == null
                            || detail.getWellnessHub().getCategory() == null) continue;
                    String catId = detail.getWellnessHub().getCategory().getCategoryId();
                    if (seenCatIds.add(catId)) {
                        catIds.add(catId);
                        catNames.add(detail.getWellnessHub().getCategory().getCategoryName());
                    }
                }
            }
            dto.setCategoryIds(catIds);
            dto.setCategoryNames(catNames);

            // อำเภอต้นทาง-ปลายทางของเส้นทางนี้ (ไม่ซ้ำ เผื่อต้นทาง-ปลายทางเป็นอำเภอเดียวกัน)
            List<Integer> distIds = new ArrayList<>();
            List<String> distNames = new ArrayList<>();
            if (trip.getOriginDistrict() != null) {
                distIds.add(trip.getOriginDistrict().getDistrictId());
                distNames.add(trip.getOriginDistrict().getDistrictName());
            }
            if (trip.getDestinationDistrict() != null
                    && (trip.getOriginDistrict() == null
                    || !trip.getOriginDistrict().getDistrictId()
                    .equals(trip.getDestinationDistrict().getDistrictId()))) {
                distIds.add(trip.getDestinationDistrict().getDistrictId());
                distNames.add(trip.getDestinationDistrict().getDistrictName());
            }
            dto.setDistrictIds(distIds);
            dto.setDistrictNames(distNames);
        } else {
            // บทความเก่าก่อนหน้านี้ที่ไม่มี trip แนบ (สร้างไว้ก่อนบังคับ) — คืน list ว่างไปเฉยๆ
            dto.setCategoryIds(List.of());
            dto.setCategoryNames(List.of());
            dto.setDistrictIds(List.of());
            dto.setDistrictNames(List.of());
        }

        return dto;
    }
}