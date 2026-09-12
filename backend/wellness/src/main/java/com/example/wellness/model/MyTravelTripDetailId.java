package com.example.wellness.model;



import java.io.Serializable;
import java.util.Objects;


public class MyTravelTripDetailId implements Serializable {

    private int myTravelTripId;   // ถ้า MyTravelTrip ใช้ int ก็โอเค
    private String wellnessHub;

    public MyTravelTripDetailId() {}

    public MyTravelTripDetailId(int myTravelTripId, String wellnessHub) {
        this.myTravelTripId = myTravelTripId;
        this.wellnessHub = wellnessHub;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MyTravelTripDetailId)) return false;
        MyTravelTripDetailId that = (MyTravelTripDetailId) o;
        return myTravelTripId == that.myTravelTripId &&
                Objects.equals(wellnessHub, that.wellnessHub);
    }

    @Override
    public int hashCode() {
        return Objects.hash(myTravelTripId, wellnessHub);
    }
}
