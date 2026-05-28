package kz.healthcare.platform.clinics.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "clinics")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    private String phone;
    private String email;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "working_hours")
    private String workingHours;

    private String website;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "gis_url")
    private String gisUrl;

    private Double lat;
    private Double lng;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
