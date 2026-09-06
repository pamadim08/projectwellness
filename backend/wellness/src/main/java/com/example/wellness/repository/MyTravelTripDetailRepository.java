
package com.example.wellness.repository;

import com.example.wellness.model.MyTravelTripDetail;
import com.example.wellness.model.MyTravelTripDetailId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MyTravelTripDetailRepository
        extends JpaRepository<MyTravelTripDetail, MyTravelTripDetailId> {
}