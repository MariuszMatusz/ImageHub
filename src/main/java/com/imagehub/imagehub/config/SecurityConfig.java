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

    // Stałe dla ról
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

                    // punkt użytkownika
                    .requestMatchers("/api/users/me", "/api/users/me/permissions").authenticated()
                    .requestMatchers("/api/users/**").hasRole(ROLE_ADMIN)

                    // zarządzanie rolami
                    .requestMatchers("/api/roles/**").hasRole(ROLE_ADMIN)

                    // zarządzanie uprawnieniami do folderów
                    .requestMatchers("/api/folder-permissions/my").authenticated()
                    .requestMatchers("/api/folder-permissions/**").hasRole(ROLE_ADMIN)

                    //NextCloud
                    // Szczegółowa logika uprawnień będzie sprawdzona na poziomie kontrolera
                    .requestMatchers("/api/nextcloud/**").authenticated()

                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

    logger.info("🔹 JwtFilter added before UsernamePasswordAuthenticationFilter");
    logger.info("🔹 Nextcloud API security configured with permission-based access");

    return http.build();
}
}