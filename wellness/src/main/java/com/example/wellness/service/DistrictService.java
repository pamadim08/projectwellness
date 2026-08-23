package com.example.wellness.service;

import com.example.wellness.model.District;
import com.example.wellness.repository.DistrictRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DistrictService {

    @Autowired
    private DistrictRepository districtRepository;

    public List<District> listAlldistrict() {
        return districtRepository.findAll();
    }
}
