package com.imagehub.imagehub.config;

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

    // Stałe dla ról - używamy teraz stałych ciągów znaków zamiast enumów
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_USER = "USER";

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
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/error").permitAll()

                        // User endpoints
                        .requestMatchers("/api/users/me").authenticated()
                        .requestMatchers("/api/users/**").hasRole(ROLE_ADMIN)

                        // Role management endpoints
                        .requestMatchers("/api/roles/**").hasRole(ROLE_ADMIN)

                        // Folder permissions endpoints
                        .requestMatchers("/api/folder-permissions/my").hasAnyRole(ROLE_USER, ROLE_ADMIN)
                        .requestMatchers("/api/folder-permissions/**").hasRole(ROLE_ADMIN)

                        // Nextcloud API endpoints - teraz każdy z użytkowników ma dostęp zgodnie z uprawnieniami
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/files").authenticated()
//                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/files").hasAnyRole(ROLE_USER, ROLE_ADMIN)
//                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/my-folders").hasAnyRole(ROLE_USER, ROLE_ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/my-folders").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/nextcloud/files/**").hasAnyRole(ROLE_USER, ROLE_ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/nextcloud/upload").hasAnyRole(ROLE_USER, ROLE_ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/nextcloud/directory").hasAnyRole(ROLE_USER, ROLE_ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/nextcloud/files/**").hasAnyRole(ROLE_USER, ROLE_ADMIN)

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        logger.info("🔹 JwtFilter added before UsernamePasswordAuthenticationFilter");
        logger.info("🔹 Nextcloud API security configured with permission-based access");

        return http.build();
    }
}