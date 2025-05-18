package com.imagehub.imagehub.controller;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> dashboard() {
        // Przykładowa odpowiedź dla panelu administratora
        return ResponseEntity.ok(Map.of("message", "Witaj w panelu administratora!"));
    }
}