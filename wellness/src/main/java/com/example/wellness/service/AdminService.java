package com.example.wellness.service;

import com.example.wellness.model.Admin;
import com.example.wellness.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class AdminService {

    @Autowired
    private AdminRepository adminRepository;

    public Optional<Admin> login(String username, String password) {
        return adminRepository.findByUsernameAndPassword(username, password);
    }
}