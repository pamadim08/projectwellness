package com.example.wellness.repository;

import com.example.wellness.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<Member, Integer> {
    boolean existsByEmail(String email);

    Optional<Member> findByEmail(String email);
}
