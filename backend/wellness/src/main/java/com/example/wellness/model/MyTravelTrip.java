package com.example.wellness.model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "my_travel_trip")
public class MyTravelTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "travelTripId")
    private int travelTripId;

    @Column(name = "tripName", length = 100, nullable = false)
    private String tripName;

    @Column(name = "description", length = 255)
    private String description;

    // เก็บ district id จริง ใช้ตอนแก้ไข trip เพื่อค้นหา hub เพิ่มในอำเภอเดิมได้
    @ManyToOne
    @JoinColumn(name = "origin_district_id")
    private District originDistrict;

    @ManyToOne
    @JoinColumn(name = "destination_district_id")
    private District destinationDistrict;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // ถ้า trip นี้ถูกคัดลอกมาจาก trip อื่น เก็บ id ของ trip ต้นฉบับไว้ (ไม่ใช่ FK จริง
    // เพราะถ้า trip ต้นฉบับถูกลบทีหลัง ไม่อยากให้กระทบ/บล็อกการลบนั้น)
    @Column(name = "duplicated_from_trip_id")
    private Integer duplicatedFromTripId;


    @OneToMany(mappedBy = "myTravelTripId", cascade = CascadeType.ALL)
    private List<MyTravelTripDetail> tripDetails;

//    @OneToMany(mappedBy = "myTravelTrip", cascade = CascadeType.ALL)
//    private List<Article> articles;

    @OneToOne
    @JoinColumn(name = "article_id")
    private Article article;

    public int getTravelTripId() {
        return travelTripId;
    }

    public void setTravelTripId(int travelTripId) {
        this.travelTripId = travelTripId;
    }

    public String getTripName() {
        return tripName;
    }

    public void setTripName(String tripName) {
        this.tripName = tripName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    // 🆕 เอา column origin_name/destination_name ออกแล้ว (ลบไปจาก DB จริงแล้วด้วย)
    // คำนวณสดจาก originDistrict/destinationDistrict (FK) แทน — ไม่มี setter อีกต่อไป
    // เพราะไม่มีอะไรให้ set (ค่าผูกกับ district เสมอ เปลี่ยนได้แค่ทาง originDistrict/destinationDistrict)
    @Transient
    public String getOriginName() {
        return originDistrict != null ? originDistrict.getDistrictName() : null;
    }

    @Transient
    public String getDestinationName() {
        return destinationDistrict != null ? destinationDistrict.getDistrictName() : null;
    }

    public District getOriginDistrict() {
        return originDistrict;
    }

    public void setOriginDistrict(District originDistrict) {
        this.originDistrict = originDistrict;
    }

    public District getDestinationDistrict() {
        return destinationDistrict;
    }

    public void setDestinationDistrict(District destinationDistrict) {
        this.destinationDistrict = destinationDistrict;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member member) {
        this.member = member;
    }

    public Integer getDuplicatedFromTripId() {
        return duplicatedFromTripId;
    }

    public void setDuplicatedFromTripId(Integer duplicatedFromTripId) {
        this.duplicatedFromTripId = duplicatedFromTripId;
    }

    public List<MyTravelTripDetail> getTripDetails() {
        return tripDetails;
    }

    public void setTripDetails(List<MyTravelTripDetail> tripDetails) {
        this.tripDetails = tripDetails;
    }

    public Article getArticle() {
        return article;
    }

    public void setArticle(Article article) {
        this.article = article;
    }

    // 🆕 ตัด originName/destinationName ออกจาก constructor นี้ด้วย (ไม่มี field ให้ set แล้ว)
    // ถ้ามีที่อื่นในโค้ดเรียก constructor แบบเดิม (8 parameter) จะต้องไปแก้จุดนั้นด้วย
    public MyTravelTrip(int travelTripId, String tripName, String description, Member member,
                        List<MyTravelTripDetail> tripDetails, Article article) {
        this.travelTripId = travelTripId;
        this.tripName = tripName;
        this.description = description;
        this.member = member;
        this.tripDetails = tripDetails;
        this.article = article;
    }

    public MyTravelTrip() {
    }
}