package com.example.wellness.model;



import java.io.Serializable;
import java.util.Objects;


public class MyTravelTripDetailId implements Serializable {

    private int myTravelTrip;   // ถ้า MyTravelTrip ใช้ int ก็โอเค
    private Integer wellnessHub;

    public MyTravelTripDetailId() {}

    public MyTravelTripDetailId(int myTravelTrip, Integer wellnessHub) {
        this.myTravelTrip = myTravelTrip;
        this.wellnessHub = wellnessHub;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MyTravelTripDetailId)) return false;
        MyTravelTripDetailId that = (MyTravelTripDetailId) o;
        return myTravelTrip == that.myTravelTrip &&
                Objects.equals(wellnessHub, that.wellnessHub);
    }

    @Override
    public int hashCode() {
        return Objects.hash(myTravelTrip, wellnessHub);
    }
}
