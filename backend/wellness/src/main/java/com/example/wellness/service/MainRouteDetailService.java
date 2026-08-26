package com.example.wellness.service;

import com.example.wellness.model.MainRouteDetail;
import com.example.wellness.repository.MainRouteDetailRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MainRouteDetailService {

    private final MainRouteDetailRepository mainRouteDetailRepository;

    public MainRouteDetailService(MainRouteDetailRepository mainRouteDetailRepository) {
        this.mainRouteDetailRepository = mainRouteDetailRepository;
    }

    // ดึงรายการลำดับอำเภอที่จัดเรียงเรียบร้อยแล้วผ่านรหัสเส้นทางหลัก
    public List<MainRouteDetail> getDetailsByRouteId(Integer routeId) {
        return mainRouteDetailRepository.findByMainRouteRouteIdOrderByOrderNumberAsc(routeId);
    }
}