package kz.healthcare.platform.clinics.application;

import java.util.UUID;

public record ClinicResponse(
        UUID id,
        String name,
        String address,
        String city,
        String phone,
        String email,
        String description,
        String workingHours,
        String website,
        String photoUrl,
        String gisUrl,
        Double lat,
        Double lng
) {}
