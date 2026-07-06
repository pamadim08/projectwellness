package com.example.wellness.service;

import com.example.wellness.model.Category;
import com.example.wellness.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // 1. ดึงข้อมูลรายการหมวดหมู่บริการสุขภาพทั้งหมดพ่นสีลงฟอร์ม
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // 2. ดึงข้อมูลรายหมวดหมู่แบบเฉพาะเจาะจงผ่านรหัสข้อความ ID
    public Category getCategoryById(String id) {
        return categoryRepository.findById(id).orElse(null);
    }

    // 3. ลงรับสิทธิ์เพิ่มหมวดหมู่บริการประเภทใหม่เข้าตารางกลาง
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }
}