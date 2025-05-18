package com.imagehub.imagehub.config;

import com.imagehub.imagehub.service.NextcloudClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NextcloudConfig {

    @Bean
    public NextcloudClient nextcloudClient(NextcloudProperties properties) {
        return new NextcloudClient(
                properties.getUrl(),
                properties.getUsername(),
                properties.getPassword()
        );
    }
}