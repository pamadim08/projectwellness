package com.example.wellness.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfficialArticleSummaryDTO {
    private Integer articleId;
    private String articleTitle;
    private String articleDetail;
    private String author;
    private String articleCategory;
    private LocalDateTime publishDate;
    private String img;
}
