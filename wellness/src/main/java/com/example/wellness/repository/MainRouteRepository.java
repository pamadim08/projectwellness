package com.example.wellness.repository;

import com.example.wellness.model.MainRoute;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MainRouteRepository extends JpaRepository<MainRoute, Integer> {
    List<MainRoute> findTop6ByOrderByPinCountDesc();
}