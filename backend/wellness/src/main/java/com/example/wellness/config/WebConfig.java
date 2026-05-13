package com.example.wellness.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

        @Override
        public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // 1. เพิ่มส่วนนี้สำหรับโฟลเดอร์ uploads นอก src (สำหรับรูปที่อัปโหลดใหม่)
                registry.addResourceHandler("/uploads/**")
                                .addResourceLocations("file:uploads/");

                // 2. จัดการไฟล์ Static ในโปรเจกต์ (ของเดิมที่คุณมี)
                registry.addResourceHandler("/images/**")
                                .addResourceLocations("classpath:/static/images/");

                registry.addResourceHandler("/assets/**")
                                .addResourceLocations("classpath:/static/assets/");
        }

        @Override
        public void addCorsMappings(CorsRegistry registry) {
                // อนุญาตให้ React คุยกับ Spring Boot ได้
                registry.addMapping("/**")
                                .allowedOrigins("http://localhost:3000") // *** เปลี่ยนเป็นพอร์ตที่ React ของคุณใช้
                                                                         // (ปกติ CRA คือ 3000)
                                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                                .allowedHeaders("*")
                                .allowCredentials(true);
        }
}