package com.example.wellness.controller;

import com.example.wellness.model.Category;
import com.example.wellness.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:3000")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public List<Category> listAllCategory() {
        return categoryService.listAllCategory();
    }
}