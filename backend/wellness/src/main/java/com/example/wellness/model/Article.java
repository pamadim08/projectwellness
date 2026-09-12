package com.example.wellness.model;


import jakarta.persistence.*;


import java.util.Date;

@Entity
@Table(name = "article")
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "articleId")
    private int articleId;

    @Column(name = "content", columnDefinition = "TEXT", nullable = true)
    private String content;

    @Column(name = "image", columnDefinition = "TEXT", nullable = true)
    private String image;

    @Column(name = "postDate", nullable = false)
    private Date postDate;

    // 🆕 บังคับแนบเส้นทางเสมอตอนสร้างบทความใหม่ (validate ที่ service layer)
    // ยัง nullable = true ระดับ DB/entity ไว้ก่อน เพื่อไม่กระทบบทความเก่าที่สร้างไว้ก่อนหน้านี้
    // โดยไม่มี trip แนบ (ตอนนั้นยังไม่บังคับ) — กันไม่ต้องทำ SQL migration ที่เสี่ยงพัง schema validation
    @ManyToOne
    @JoinColumn(name = "travelTripId", nullable = true)
    private MyTravelTrip myTravelTrip;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 🆕 เอา field category ออกไปเลย — หมวดหมู่ตอนนี้คำนวณสดจาก
    // myTravelTrip.tripDetails.wellnessHub.category ทุกครั้งที่ query (ดู ArticleService.convertToDTO)
    // ไม่ต้อง drop column category_id ใน DB ก็ได้ครับ ปล่อยเป็น orphan column ไว้ไม่กระทบอะไร

    public int getArticleId() {
        return articleId;
    }

    public void setArticleId(int articleId) {
        this.articleId = articleId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Date getPostDate() {
        return postDate;
    }

    public void setPostDate(Date postDate) {
        this.postDate = postDate;
    }

    public MyTravelTrip getMyTravelTrip() {
        return myTravelTrip;
    }

    public void setMyTravelTrip(MyTravelTrip myTravelTrip) {
        this.myTravelTrip = myTravelTrip;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member member) {
        this.member = member;
    }

    public Article(int articleId, String content, String image, Date postDate, MyTravelTrip myTravelTrip, Member member) {
        this.articleId = articleId;
        this.content = content;
        this.image = image;
        this.postDate = postDate;
        this.myTravelTrip = myTravelTrip;
        this.member = member;
    }

    public Article() {
        super();
    }

}