package com.example.wellness.controller;

import com.example.wellness.model.OfficialArticle;
import com.example.wellness.service.OfficialArticleService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "http://localhost:3000")
public class OfficialArticleController {

    private final OfficialArticleService service;

    public OfficialArticleController(OfficialArticleService service) {
        this.service = service;
    }

    @GetMapping
    public List<OfficialArticle> listOfficialArticle() {
        return service.listOfficialArticle();
    }

    @GetMapping("/{id}")
    public OfficialArticle viewArticleDetail(@PathVariable Integer id) {
        return service.viewArticleDetail(id);
    }

    @PostMapping
    public OfficialArticle createOfficialArticle(@RequestBody OfficialArticle article) {
        return service.createOfficialArticle(article);
    }

    @PutMapping("/{id}")
    public OfficialArticle editOfficialArticle(
            @PathVariable Integer id,
            @RequestBody OfficialArticle article) {
        return service.editOfficialArticle(id, article);
    }

    @DeleteMapping("/{id}")
    public String deleteArticle(@PathVariable Integer id) {
        boolean result = service.deleteArticle(id);
        return result ? "Delete success" : "Not found";
    }
}