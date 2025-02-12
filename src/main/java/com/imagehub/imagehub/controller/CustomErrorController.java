package com.imagehub.imagehub.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CustomErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<String> handleError() {
        // Przykładowa odpowiedź błędu
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("Błąd: żądany zasób nie został znaleziony.");
    }
}
