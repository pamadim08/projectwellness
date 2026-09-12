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
    private final DistrictRepository districtRepository;

    @Transactional
    public Integer createTrip(CreateTripRequest request) {
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        District originDistrict = districtRepository.findById(request.getOriginDistrictId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบอำเภอต้นทาง"));
        District destinationDistrict = districtRepository.findById(request.getDestinationDistrictId())
                .orElseThrow(() -> new NoSuchElementException("ไม่พบอำเภอปลายทาง"));

        // 🆕 เอา trip.setOriginName()/setDestinationName() ออก — ตอนนี้เป็น @Transient getter
        // คำนวณสดจาก originDistrict/destinationDistrict แล้ว ไม่มี setter ให้เรียกอีกต่อไป
        MyTravelTrip trip = new MyTravelTrip();
        trip.setTripName(request.getTripName());
        trip.setDescription(request.getDescription());
        trip.setOriginDistrict(originDistrict);
        trip.setDestinationDistrict(destinationDistrict);
        trip.setMember(member);

        MyTravelTrip savedTrip = tripRepository.save(trip);

        for (int i = 0; i < request.getLicenseIds().size(); i++) {
            String licenseId = request.getLicenseIds().get(i);

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

    public MyTravelTripDTO getTripById(Integer tripId) {
        MyTravelTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));
        return convertToDTO(trip);
    }

    // 🆕 ตัดฟีเจอร์ originalOwner ออกทั้งหมด — ไม่ต้องสืบ/เก็บว่าใครเป็นเจ้าของต้นฉบับอีกต่อไป
    @Transactional
    public Integer duplicateTrip(Integer sourceTripId, Integer newMemberId) {
        MyTravelTrip sourceTrip = tripRepository.findById(sourceTripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทางต้นฉบับ"));

        Member newMember = memberRepository.findById(newMemberId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบสมาชิก"));

        MyTravelTrip newTrip = new MyTravelTrip();
        newTrip.setTripName(sourceTrip.getTripName());
        newTrip.setDescription(sourceTrip.getDescription());
        newTrip.setOriginDistrict(sourceTrip.getOriginDistrict());
        newTrip.setDestinationDistrict(sourceTrip.getDestinationDistrict());
        newTrip.setMember(newMember);
        newTrip.setDuplicatedFromTripId(sourceTripId);

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

        if (trip.getMember().getMemberId() != memberId) {
            throw new RuntimeException("ไม่มีสิทธิ์ลบเส้นทางนี้");
        }

        tripRepository.delete(trip);
    }

    @Transactional
    public void updateTrip(Integer tripId, UpdateTripRequest request) {
        MyTravelTrip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NoSuchElementException("ไม่พบเส้นทาง"));

        if (trip.getMember().getMemberId() != request.getMemberId()) {
            throw new RuntimeException("ไม่มีสิทธิ์แก้ไขเส้นทางนี้");
        }

        trip.setTripName(request.getTripName());
        trip.setDescription(request.getDescription());
        // หมายเหตุ: ไม่แตะ originDistrict/destinationDistrict ตามที่ตกลงไว้
        // (originName/destinationName คำนวณสดจาก relation นี้อยู่แล้ว ไม่ต้องแตะเช่นกัน)

        if (trip.getDuplicatedFromTripId() != null) {
            List<String> existingLicenseIds = trip.getTripDetails().stream()
                    .map(d -> d.getWellnessHub().getLicenseId())
                    .collect(Collectors.toList());

            List<String> newLicenseIds = request.getLicenseIds();
            for (String newId : newLicenseIds) {
                if (!existingLicenseIds.contains(newId)) {
                    throw new IllegalArgumentException(
                            "เส้นทางนี้คัดลอกมาจากผู้อื่น สามารถลบสถานที่ได้เท่านั้น ไม่สามารถเพิ่มสถานที่ใหม่ได้");
                }
            }
        }

        detailRepository.deleteAll(trip.getTripDetails());
        trip.getTripDetails().clear();

        for (int i = 0; i < request.getLicenseIds().size(); i++) {
            String licenseId = request.getLicenseIds().get(i);

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
        // 🆕 trip.getOriginName()/getDestinationName() เรียกได้เหมือนเดิม ไม่ต้องแก้บรรทัดนี้
        // เพราะเปลี่ยนแค่ข้างในเป็น @Transient getter ที่คำนวณจาก originDistrict/destinationDistrict
        dto.setOriginName(trip.getOriginName());
        dto.setDestinationName(trip.getDestinationName());

        dto.setOriginDistrictId(trip.getOriginDistrict() != null
                ? trip.getOriginDistrict().getDistrictId() : null);
        dto.setDestinationDistrictId(trip.getDestinationDistrict() != null
                ? trip.getDestinationDistrict().getDistrictId() : null);

        // 🆕 ตัดส่วนของ originalOwner ออกแล้ว เหลือแค่บอกว่าเป็นสำเนาไหม
        dto.setDuplicatedFromTripId(trip.getDuplicatedFromTripId());

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
                        hub.setLatitude(detail.getWellnessHub().getWellnessHubLatitude());
                        hub.setLongitude(detail.getWellnessHub().getWellnessHubLongitude());
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