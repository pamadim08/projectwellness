package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "official_articles") // ปรับเป็นพหูพจน์ให้เข้าพวกค่ะ
@Data
public class OfficialArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "article_id")
    private Integer articleId; // Integer เป๊ะๆ ตามเดิม

    @Column(name = "article_title", nullable = false, length = 100)
    private String articleTitle;

    @Column(name = "article_detail", nullable = false, columnDefinition = "TEXT")
    private String articleDetail; // TEXT สำหรับบทความยาวๆ ดีมากค่ะ

    @Column(name = "author", nullable = false, length = 100)
    private String author;

    @Column(name = "article_category", nullable = false, length = 100)
    private String articleCategory;

    @Column(name = "publish_date", nullable = false)
    private LocalDateTime publishDate; // ใน Postgres จะเป็น timestamp

    @Column(name = "img", nullable = false, length = 255)
    private String img;
}