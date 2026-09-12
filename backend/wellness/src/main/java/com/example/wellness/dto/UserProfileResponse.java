package com.example.wellness.dto;

import java.util.List;

public class UserProfileResponse {
    private String fullName;
    private String email;
    private String profileImage; // 🆕 path รูปโปรไฟล์ (null = ยังไม่มีรูป ให้ Flutter โชว์อักษรย่อแทน)
    private List<Object> favoriteList; // ยังไม่มีระบบรายการโปรดในระบบ ปล่อยว่างไว้ก่อน
    private List<MyTravelTripDTO> routeList;
    private List<ArticleDTO> postList;

    // --- Constructor ---
    public UserProfileResponse(String fullName, String email, String profileImage, List<Object> favoriteList,
                               List<MyTravelTripDTO> routeList, List<ArticleDTO> postList) {
        this.fullName = fullName;
        this.email = email;
        this.profileImage = profileImage;
        this.favoriteList = favoriteList;
        this.routeList = routeList;
        this.postList = postList;
    }

    // --- Getters & Setters ---
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public List<Object> getFavoriteList() { return favoriteList; }
    public void setFavoriteList(List<Object> favoriteList) { this.favoriteList = favoriteList; }

    public List<MyTravelTripDTO> getRouteList() { return routeList; }
    public void setRouteList(List<MyTravelTripDTO> routeList) { this.routeList = routeList; }

    public List<ArticleDTO> getPostList() { return postList; }
    public void setPostList(List<ArticleDTO> postList) { this.postList = postList; }
}