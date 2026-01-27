package kz.healthcare.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@Modulithic(systemName = "Healthcare Platform")
@SpringBootApplication
public class HealthcarePlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(HealthcarePlatformApplication.class, args);
    }
}
