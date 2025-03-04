package com.imagehub.imagehub.security;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.UserService;
import io.jsonwebtoken.ExpiredJwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        logger.info("🔹 JwtFilter executed for request: {}", request.getRequestURI());
        System.out.println("JwtFilter executed for request: " + request.getRequestURI());


        String authorizationHeader = request.getHeader("Authorization");

        String email = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                email = jwtUtil.extractUsername(jwt);
            } catch (ExpiredJwtException e) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token expired");
                return;
            }
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Optional<User> userOptional = userService.findByEmail(email);

            if (userOptional.isPresent() && jwtUtil.validateToken(jwt, email)) {
                User user = userOptional.get();
                Role role = jwtUtil.extractRole(jwt);  // Pobieramy rolę jako ENUM

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name())) //  Konwersja ENUM na String

                );
                logger.info("🔹 Authorization header: {}", request.getHeader("Authorization"));
                System.out.println("JwtFilter executed for request: " + request.getRequestURI());
                logger.info("🔹 Extracted role from token: {}", role);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.info("🔹 Security context set with user: {}", SecurityContextHolder.getContext().getAuthentication());
                logger.info("🔹 Final SecurityContextHolder: {}", SecurityContextHolder.getContext().getAuthentication());

            }
        }


        chain.doFilter(request, response);
    }
}
