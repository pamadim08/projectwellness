package com.example.wellness.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer notificationId;

    @Column(nullable = false)
    private LocalDateTime notifydate;

    @Column(nullable = false, length = 255)
    private String messageBody;

    @Column(nullable = false, length = 50)
    private String notificationStatus;

    @ManyToOne
    @JoinColumn(name = "request_id")
    private AccountRequest accountRequest;
}