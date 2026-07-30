package com.example.wellness.repository;

import com.example.wellness.model.OfficialArticle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OfficialArticleRepository
                extends JpaRepository<OfficialArticle, Integer> {
        List<OfficialArticle> findTop6ByOrderByPublishDateDesc();
}