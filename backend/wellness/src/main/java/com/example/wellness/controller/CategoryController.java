package com.example.wellness.controller;

import com.example.wellness.model.Category;
import com.example.wellness.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:3000")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepository.findAll(); // ดึงหมวดหมู่ทั้งหมดส่งกลับไปเป็นอาเรย์ให้ React
    }
}