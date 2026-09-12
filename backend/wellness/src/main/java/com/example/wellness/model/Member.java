package com.example.wellness.model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "member")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "memberId")
    private int memberId;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Column(name = "firstName", length = 50, nullable = false)
    private String firstName;

    @Column(name = "lastName", length = 50, nullable = false)
    private String lastName;

    @Column(name = "password", length = 30, nullable = false)
    private String password;

    @Column(name = "ProfileImage", length = 255, nullable = true)
    private String profileImage;


    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL)
    private List<MyTravelTrip> myTravelTrips;

    @ManyToMany
    @JoinTable(
            name = "favorite_wellness_hub",
            joinColumns = @JoinColumn(name = "member_id"),
            inverseJoinColumns = @JoinColumn(name = "license_id")
    )
    private List<WellnessHub> favoriteHubs;

    @OneToMany
    @JoinColumn(name = "member_id")
    private List<MyTravelTrip> mytraveltrip;


    public int getMemberId() {
        return memberId;
    }

    public void setMemberId(int memberId) {
        this.memberId = memberId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public Member(int memberId, String email, String firstName, String lastName, String password, String profileImage) {
        this.memberId = memberId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.password = password;
        this.profileImage = profileImage;
    }

    public Member() {
    }

    // เพิ่มใน Member.java ต่อจาก getter/setter อื่นๆ ที่มีอยู่แล้ว

    public List<WellnessHub> getFavoriteHubs() {
        return favoriteHubs;
    }

    public void setFavoriteHubs(List<WellnessHub> favoriteHubs) {
        this.favoriteHubs = favoriteHubs;
    }
}
