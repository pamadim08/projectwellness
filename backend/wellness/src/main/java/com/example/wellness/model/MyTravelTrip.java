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

    @Column(name = "originName", length = 100, nullable = false)
    private String originName;

    @Column(name = "destinationName", length = 100, nullable = false)
    private String destinationName;

    // 🆕 เก็บ district id จริง ใช้ตอนแก้ไข trip เพื่อค้นหา hub เพิ่มในอำเภอเดิมได้
    @ManyToOne
    @JoinColumn(name = "origin_district_id")
    private District originDistrict;

    @ManyToOne
    @JoinColumn(name = "destination_district_id")
    private District destinationDistrict;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 🆕 ถ้า trip นี้ถูกคัดลอกมาจาก trip อื่น เก็บ id ของ trip ต้นฉบับไว้ (ไม่ใช่ FK จริง
    // เพราะถ้า trip ต้นฉบับถูกลบทีหลัง ไม่อยากให้กระทบ/บล็อกการลบนั้น)
    @Column(name = "duplicated_from_trip_id")
    private Integer duplicatedFromTripId;

    // 🆕 เจ้าของดั้งเดิมของเส้นทางนี้ — เป็น FK จริงไปยัง Member เพราะ member ไม่ค่อยถูกลบ
    // ต่างจาก duplicated_from_trip_id ที่ตั้งใจไม่ทำ FK (trip ลบได้บ่อยกว่า ไม่อยากให้ติด constraint)
    // ตั้งชื่อ column ว่า original_member_id (ไม่ใช่ original_owner_id) เพื่อไม่ชนกับ column
    // member_id เดิมที่มีอยู่แล้ว (ใช้เก็บเจ้าของปัจจุบัน)
    @ManyToOne
    @JoinColumn(name = "original_member_id")
    private Member originalOwner;

    @OneToMany(mappedBy = "myTravelTrip", cascade = CascadeType.ALL)
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

    public String getOriginName() {
        return originName;
    }

    public void setOriginName(String originName) {
        this.originName = originName;
    }

    public String getDestinationName() {
        return destinationName;
    }

    public void setDestinationName(String destinationName) {
        this.destinationName = destinationName;
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

    public Member getOriginalOwner() {
        return originalOwner;
    }

    public void setOriginalOwner(Member originalOwner) {
        this.originalOwner = originalOwner;
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

    public MyTravelTrip(int travelTripId, String tripName, String description, String originName, String destinationName, Member member, List<MyTravelTripDetail> tripDetails, Article article) {
        this.travelTripId = travelTripId;
        this.tripName = tripName;
        this.description = description;
        this.originName = originName;
        this.destinationName = destinationName;
        this.member = member;
        this.tripDetails = tripDetails;
        this.article = article;
    }

    public MyTravelTrip() {
    }
}