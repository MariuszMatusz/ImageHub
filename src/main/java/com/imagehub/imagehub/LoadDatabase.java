package com.imagehub.imagehub;

import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LoadDatabase {

    @Bean
    CommandLineRunner initDatabase(UserRepository repository) {
        return args -> {
            repository.save(new User(null, "admin", "adminpass", "admin@imagehub.com", "ADMIN"));
            repository.save(new User(null, "user", "userpass", "user@imagehub.com", "USER"));
        };
    }
}
