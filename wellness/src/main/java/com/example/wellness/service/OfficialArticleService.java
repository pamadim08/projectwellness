package com.example.wellness.service;

import com.example.wellness.model.OfficialArticle;
import com.example.wellness.repository.OfficialArticleRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OfficialArticleService {

        private final OfficialArticleRepository repository;

        public OfficialArticleService(
                        OfficialArticleRepository repository) {
                this.repository = repository;
        }

        // ดึงบทความทั้งหมด
        public List<OfficialArticle> listOfficialArticle() {

                return repository.findAll();

        }

        // ดึงตาม id
        public OfficialArticle viewArticleDetail(Integer id) {

                return repository.findById(id)
                                .orElse(null);

        }

        // สร้างบทความใหม่
        @Transactional
        public OfficialArticle createOfficialArticle(
                        OfficialArticle article) {

                // วันที่เผยแพร่
                article.setPublishDate(
                                LocalDateTime.now());

                return repository.save(article);

        }

        // แก้ไขบทความ
        @Transactional
        public OfficialArticle editOfficialArticle(
                        Integer id,
                        OfficialArticle data) {

                OfficialArticle oldArticle = repository.findById(id)
                                .orElse(null);

                if (oldArticle == null) {
                        return null;
                }

                oldArticle.setArticleTitle(
                                data.getArticleTitle());

                oldArticle.setArticleDetail(
                                data.getArticleDetail());

                oldArticle.setArticleCategory(
                                data.getArticleCategory());

                oldArticle.setImg(
                                data.getImg());
                oldArticle.setArticleImages(data.getArticleImages());
                

                return repository.save(oldArticle);

        }

        // ลบ
        @Transactional
        public boolean deleteArticle(Integer id) {

                if (repository.existsById(id)) {

                        repository.deleteById(id);

                        return true;
                }

                return false;

        }

}