package com.imagehub.imagehub;

import com.imagehub.imagehub.service.FolderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.stereotype.Component;

@SpringBootApplication
@EnableScheduling

public class ImageHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(ImageHubApplication.class, args);
    }

    }


