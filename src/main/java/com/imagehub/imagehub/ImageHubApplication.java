package com.imagehub.imagehub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling

public class ImageHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(ImageHubApplication.class, args);
    }

}


