package com.example.wellness.repository;

import com.example.wellness.model.OfficialArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfficialArticleRepository extends JpaRepository<OfficialArticle, Integer> {

    List<OfficialArticle> findTop6ByOrderByPublishDateDesc();

    List<OfficialArticle> findAllByOrderByArticleIdDesc();

    @Query("SELECT a FROM OfficialArticle a WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR LOWER(a.articleTitle) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(a.author) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:category IS NULL OR :category = '' OR a.articleCategory = :category) " +
           "ORDER BY a.articleId DESC")
    List<OfficialArticle> searchArticles(@Param("keyword") String keyword, @Param("category") String category);
}