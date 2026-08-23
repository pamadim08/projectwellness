package com.example.wellness.service;

import com.example.wellness.model.MainRouteDetail;
import com.example.wellness.repository.MainRouteDetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class MainRouteDetailService {

    @Autowired
    private MainRouteDetailRepository mainRouteDetailRepository;

    // ดึงรายการลำดับอำเภอที่จัดเรียงเรียบร้อยแล้วผ่านรหัสเส้นทางหลัก
    public List<MainRouteDetail> getDetailsByRouteId(Integer routeId) {
        return mainRouteDetailRepository.findByMainRouteRouteIdOrderByOrderNumberAsc(routeId);
    }
}