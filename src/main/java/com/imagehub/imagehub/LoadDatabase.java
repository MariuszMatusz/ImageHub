package com.imagehub.imagehub;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class LoadDatabase {

    @Bean
    CommandLineRunner initDatabase(UserRepository repository, PasswordEncoder passwordEncoder) {
        return args -> {
            repository.save(new User(null, "admin", passwordEncoder.encode("adminpass"), "admin@imagehub.com", Role.ADMIN));
            repository.save(new User(null, "user", passwordEncoder.encode("userpass"), "user@imagehub.com", Role.USER));
        };
    }
}
