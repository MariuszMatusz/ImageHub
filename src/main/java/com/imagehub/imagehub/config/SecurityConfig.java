package com.imagehub.imagehub.config;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.security.JwtFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
        logger.info("🔹 Security configuration initialized!");

        http
                .cors(cors -> cors.configurationSource(new CorsConfig().corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/error").permitAll()

                        // User endpoints
                        .requestMatchers("/api/users/me").authenticated()
                        .requestMatchers("/api/users/**").hasRole(Role.ADMIN.name())

                        // Folder permissions endpoints
                        .requestMatchers("/api/folder-permissions/my").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers("/api/folder-permissions/**").hasRole(Role.ADMIN.name())

                        // Nextcloud API endpoints - teraz każdy z użytkowników ma dostęp zgodnie z uprawnieniami
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/files").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/my-folders").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/files/**").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers(HttpMethod.POST, "/api/nextcloud/upload").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers(HttpMethod.POST, "/api/nextcloud/directory").hasAnyRole(Role.USER.name(), Role.ADMIN.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/nextcloud/files/**").hasAnyRole(Role.USER.name(), Role.ADMIN.name())

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        logger.info("🔹 JwtFilter added before UsernamePasswordAuthenticationFilter");
        logger.info("🔹 Nextcloud API security configured with permission-based access");

        return http.build();
    }
}