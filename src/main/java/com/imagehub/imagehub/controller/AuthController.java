package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.security.JwtUtil;
import com.imagehub.imagehub.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestParam String email, @RequestParam String password) {
        Optional<User> optionalUser = userService.findByEmail(email); // ✅ Zmiana na email

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            boolean passwordMatches = userService.checkPassword(password, user.getPassword());

            if (passwordMatches) {
                String role = user.getRole().name();
                String token = jwtUtil.generateToken(user.getEmail(), role); // ✅ Użycie email zamiast username

                Map<String, String> response = new HashMap<>();
                response.put("token", token);
                response.put("role", role);
                response.put("userId", String.valueOf(user.getId()));

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid password!"));
            }
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found!"));
        }
    }
}
