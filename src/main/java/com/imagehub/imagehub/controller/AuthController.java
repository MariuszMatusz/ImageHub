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
    public ResponseEntity<Map<String, String>> login(@RequestParam String username, @RequestParam String password) {
        Optional<User> optionalUser = userService.findByUsername(username);

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            boolean passwordMatches = userService.checkPassword(password, user.getPassword());

            if (passwordMatches) {
                // 🔥 Sprawdzamy, czy `user.getRole()` to `Enum`
                String role = user.getRole().name(); // Pobiera nazwę ENUM np. "ADMIN"
                String token = jwtUtil.generateToken(user.getUsername(), role);

                // 🔥 Zwracamy token jako JSON
                Map<String, String> response = new HashMap<>();
                response.put("token", token);
                response.put("role", role);

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid password!"));
            }
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found!"));
        }
    }
}
