package com.example.wellness.model;

import jakarta.persistence.*;

@Entity
@Table(name = "my_travel_trip_detail")
@IdClass(MyTravelTripDetailId.class)
public class MyTravelTripDetail {

    @Id
    @ManyToOne
    @JoinColumn(name = "travel_trip_id", nullable = false)
    private MyTravelTrip myTravelTripId;

    @Id
    @ManyToOne
    @JoinColumn(
            name = "license_id",
            referencedColumnName = "license_id",
            nullable = false
    )
    private WellnessHub wellnessHub;

    @Column(name = "travelTripIndex", nullable = false)
    private int travelTripIndex;


    public MyTravelTrip getMyTravelTripId() {
        return myTravelTripId;
    }

    public void setMyTravelTrip(MyTravelTrip myTravelTrip) {
        this.myTravelTripId = myTravelTrip;
    }

    public WellnessHub getWellnessHub() {
        return wellnessHub;
    }

    public void setWellnessHub(WellnessHub wellnessHub) {
        this.wellnessHub = wellnessHub;
    }

    public int getTravelTripIndex() {
        return travelTripIndex;
    }

    public void setTravelTripIndex(int travelTripIndex) {
        this.travelTripIndex = travelTripIndex;
    }

    public MyTravelTripDetail(MyTravelTrip myTravelTripId, WellnessHub wellnessHub, int travelTripIndex) {
        this.myTravelTripId = myTravelTripId;
        this.wellnessHub = wellnessHub;
        this.travelTripIndex = travelTripIndex;
    }

    public MyTravelTripDetail() {
    }
}
