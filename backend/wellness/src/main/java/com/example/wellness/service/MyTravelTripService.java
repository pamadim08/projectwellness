package com.example.wellness.service;

import com.example.wellness.dto.CreateTripRequest;
import com.example.wellness.dto.MyTravelTripDTO;
import com.example.wellness.dto.UpdateTripRequest;
import com.example.wellness.model.District;
import com.example.wellness.model.Member;
import com.example.wellness.model.MyTravelTrip;
import com.example.wellness.model.MyTravelTripDetail;
import com.example.wellness.model.WellnessHub;
import com.example.wellness.repository.DistrictRepository;
import com.example.wellness.repository.MemberRepository;
import com.example.wellness.repository.MyTravelTripDetailRepository;
import com.example.wellness.repository.MyTravelTripRepository;
import com.example.wellness.repository.WellnessHubRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MyTravelTripService {

    private final MyTravelTripRepository tripRepository;
    private final MyTravelTripDetailRepository detailRepository;
    private final MemberRepository memberRepository;
    private final WellnessHubRepository wellnessHubRepository;
    private final DistrictRepository districtRepository; // 🆕

    @Transactional
    public Integer createTrip(CreateTripRequest request) {
        // ดึง member
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        // 🆕 ดึง district ต้นทาง-ปลายทาง
        District originDistrict = districtRepository.findById(request.getOriginDistrictId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบอำเภอต้นทาง"));
        District destinationDistrict = districtRepository.findById(request.getDestinationDistrictId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบอำเภอปลายทาง"));

        // สร้าง MyTravelTrip
        MyTravelTrip trip = new MyTravelTrip();
        trip.setTripName(request.getTripName());
        trip.setDescription(request.getDescription());
        trip.setOriginName(request.getOriginName());
        trip.setDestinationName(request.getDestinationName());
        trip.setOriginDistrict(originDistrict);           // 🆕
        trip.setDestinationDistrict(destinationDistrict);  // 🆕
        trip.setMember(member);

        MyTravelTrip savedTrip = tripRepository.save(trip);

        // สร้าง MyTravelTripDetail แต่ละ hub
        for (int i = 0; i < request.getLicenseIds().size(); i++) {
            Integer licenseId = request.getLicenseIds().get(i);

            WellnessHub hub = wellnessHubRepository.findById(licenseId)
                    .orElseThrow(() -> new NoSuchElementException(
                            "ไม่พบสถานประกอบการ id: " + licenseId));

            MyTravelTripDetail detail = new MyTravelTripDetail();
            detail.setMyTravelTrip(savedTrip);
            detail.setWellnessHub(hub);
            detail.setTravelTripIndex(i + 1);

            detailRepository.save(detail);
        }

        return savedTrip.getTravelTripId();
    }

    public List<MyTravelTripDTO> getMyTrips(Integer memberId) {
        return tripRepository.findByMemberMemberIdOrderByTravelTripIdDesc(memberId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 🆕 ดึง trip เดียวแบบเปิดกว้าง (ไม่เช็คสิทธิ์เจ้าของ) — ใช้ตอนดูตัวอย่าง trip
    // ที่แนบมากับบทความของคนอื่น ก่อนตัดสินใจว่าจะคัดลอกเข้าบัญชีตัวเองไหม
    public MyTravelTripDTO getTripById(Integer tripId) {
        MyTravelTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));
        return convertToDTO(trip);
    }

    // 🆕 คัดลอกเส้นทางของคนอื่นเข้าบัญชีตัวเอง (ใช้ตอนกด "คัดลอกเส้นทาง" จากบทความ)
    // คัดลอกชื่อ/คำอธิบาย/ต้นทาง-ปลายทาง/หมวดสถานที่ทั้งหมด แต่เป็นเจ้าของใหม่
    @Transactional
    public Integer duplicateTrip(Integer sourceTripId, Integer newMemberId) {
        MyTravelTrip sourceTrip = tripRepository.findById(sourceTripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทางต้นฉบับ"));

        Member newMember = memberRepository.findById(newMemberId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        MyTravelTrip newTrip = new MyTravelTrip();
        newTrip.setTripName(sourceTrip.getTripName());
        newTrip.setDescription(sourceTrip.getDescription());
        newTrip.setOriginName(sourceTrip.getOriginName());
        newTrip.setDestinationName(sourceTrip.getDestinationName());
        newTrip.setOriginDistrict(sourceTrip.getOriginDistrict());
        newTrip.setDestinationDistrict(sourceTrip.getDestinationDistrict());
        newTrip.setMember(newMember);
        // 🆕 บันทึกไว้ว่า trip นี้เป็นสำเนามาจาก trip ไหน และต้นฉบับเป็นของใคร
        // ถ้า sourceTrip เองก็เป็นสำเนาอีกทีอยู่แล้ว ให้สืบไปถึง "เจ้าของต้นฉบับตัวจริง" เสมอ
        // ไม่ใช่แค่เจ้าของ trip ที่กำลังกด copy (กันกรณี copy ต่อกันหลายทอด)
        newTrip.setDuplicatedFromTripId(sourceTripId);
        newTrip.setOriginalOwner(
                sourceTrip.getOriginalOwner() != null
                        ? sourceTrip.getOriginalOwner()
                        : sourceTrip.getMember()
        );

        MyTravelTrip savedTrip = tripRepository.save(newTrip);

        if (sourceTrip.getTripDetails() != null) {
            for (MyTravelTripDetail sourceDetail : sourceTrip.getTripDetails()) {
                MyTravelTripDetail newDetail = new MyTravelTripDetail();
                newDetail.setMyTravelTrip(savedTrip);
                newDetail.setWellnessHub(sourceDetail.getWellnessHub());
                newDetail.setTravelTripIndex(sourceDetail.getTravelTripIndex());
                detailRepository.save(newDetail);
            }
        }

        return savedTrip.getTravelTripId();
    }

    public void deleteTrip(Integer tripId, Integer memberId) {
        MyTravelTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));

        // เช็คว่าเป็น trip ของ member คนนี้จริงๆ
        if (trip.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์ลบเส้นทางนี้");
        }

        tripRepository.delete(trip);
    }

    // 🆕 แก้ไข trip — แก้ชื่อ/คำอธิบาย/รายการ hub ได้ แต่แก้อำเภอต้นทาง-ปลายทางไม่ได้
    @Transactional
    public void updateTrip(Integer tripId, UpdateTripRequest request) {
        MyTravelTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));

        // เช็คว่าเป็น trip ของ member คนนี้จริงๆ
        if (trip.getMember().getMemberId() != request.getMemberId()) {
            throw new RuntimeException("ไม่มีสิทธิ์แก้ไขเส้นทางนี้");
        }

        trip.setTripName(request.getTripName());
        trip.setDescription(request.getDescription());
        // หมายเหตุ: ไม่แตะ originName/destinationName/originDistrict/destinationDistrict ตามที่ตกลงไว้

        // 🆕 กลับกฎ: ถ้า trip นี้เป็นสำเนา ลบสถานที่เดิมออกได้ แต่ห้ามเพิ่มสถานที่ใหม่เข้ามา
        // เช็คก่อนลบ detail เก่าทิ้ง เพราะต้องรู้ก่อนว่า licenseIds เดิมมีอะไรบ้าง
        if (trip.getDuplicatedFromTripId() != null) {
            List<Integer> existingLicenseIds = trip.getTripDetails().stream()
                    .map(d -> d.getWellnessHub().getLicenseId())
                    .collect(Collectors.toList());

            List<Integer> newLicenseIds = request.getLicenseIds();
            for (Integer newId : newLicenseIds) {
                if (!existingLicenseIds.contains(newId)) {
                    throw new IllegalArgumentException(
                            "เส้นทางนี้คัดลอกมาจากผู้อื่น สามารถลบสถานที่ได้เท่านั้น ไม่สามารถเพิ่มสถานที่ใหม่ได้");
                }
            }
        }

        // ลบ detail (รายการ hub) เดิมทั้งหมด แล้วสร้างใหม่ตามลำดับที่ส่งมา
        // วิธีนี้ง่ายและชัดเจนกว่าการ diff ทีละรายการ เหมาะกับ list ที่ไม่ใหญ่มาก
        detailRepository.deleteAll(trip.getTripDetails());
        trip.getTripDetails().clear();

        for (int i = 0; i < request.getLicenseIds().size(); i++) {
            Integer licenseId = request.getLicenseIds().get(i);

            WellnessHub hub = wellnessHubRepository.findById(licenseId)
                    .orElseThrow(() -> new NoSuchElementException(
                            "ไม่พบสถานประกอบการ id: " + licenseId));

            MyTravelTripDetail detail = new MyTravelTripDetail();
            detail.setMyTravelTrip(trip);
            detail.setWellnessHub(hub);
            detail.setTravelTripIndex(i + 1);

            detailRepository.save(detail);
        }

        tripRepository.save(trip);
    }

    private MyTravelTripDTO convertToDTO(MyTravelTrip trip) {
        MyTravelTripDTO dto = new MyTravelTripDTO();
        dto.setTravelTripId(trip.getTravelTripId());
        dto.setTripName(trip.getTripName());
        dto.setDescription(trip.getDescription());
        dto.setOriginName(trip.getOriginName());
        dto.setDestinationName(trip.getDestinationName());

        // 🆕 ส่ง district id กลับไปด้วย (อาจเป็น null สำหรับ trip เก่าที่สร้างก่อนมีคอลัมน์นี้)
        dto.setOriginDistrictId(trip.getOriginDistrict() != null
                ? trip.getOriginDistrict().getDistrictId() : null);
        dto.setDestinationDistrictId(trip.getDestinationDistrict() != null
                ? trip.getDestinationDistrict().getDistrictId() : null);

        // 🆕 ข้อมูลว่าเป็นสำเนาไหม และต้นฉบับเป็นของใคร (ถ้ามี)
        dto.setDuplicatedFromTripId(trip.getDuplicatedFromTripId());
        if (trip.getOriginalOwner() != null) {
            dto.setOriginalOwnerId(trip.getOriginalOwner().getMemberId());
            dto.setOriginalOwnerFirstName(trip.getOriginalOwner().getFirstName());
            dto.setOriginalOwnerLastName(trip.getOriginalOwner().getLastName());
        }

        if (trip.getTripDetails() != null) {
            List<MyTravelTripDTO.HubSimpleDTO> hubs = trip.getTripDetails()
                    .stream()
                    .sorted(Comparator.comparingInt(MyTravelTripDetail::getTravelTripIndex))
                    .map(detail -> {
                        MyTravelTripDTO.HubSimpleDTO hub = new MyTravelTripDTO.HubSimpleDTO();
                        hub.setLicenseId(detail.getWellnessHub().getLicenseId());
                        hub.setWellnessHubName(detail.getWellnessHub().getWellnessHubName());
                        hub.setAddress(detail.getWellnessHub().getAddress());
                        hub.setCategory(detail.getWellnessHub().getCategory() != null
                                ? detail.getWellnessHub().getCategory().getCategoryName()
                                : "");
                        hub.setTravelTripIndex(detail.getTravelTripIndex());
                        hub.setLatitude(detail.getWellnessHub().getWellnessHubLatitude());     // 🆕
                        hub.setLongitude(detail.getWellnessHub().getWellnessHubLongitude());   // 🆕
                        return hub;
                    })
                    .collect(Collectors.toList());
            dto.setHubs(hubs);
        } else {
            dto.setHubs(List.of());
        }

        return dto;
    }

}