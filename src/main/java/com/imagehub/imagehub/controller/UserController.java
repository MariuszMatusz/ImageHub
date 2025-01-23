package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        Optional<User> user = userService.findById(id);
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

//    @PostMapping
//    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
//        User savedUser = userService.save(user);
//        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
//    }
@PostMapping
public ResponseEntity<?> createUser(@Valid @RequestBody User user) {
    try {
        // Wywołanie serwisu, który obsługuje walidację i hashowanie
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    } catch (IllegalArgumentException e) {
        // W przypadku naruszenia unikalności username/email zwracamy błąd 400
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}


//    @PutMapping("/{id}")
//    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User updatedUser) {
//        Optional<User> existingUser = userService.findById(id);
//        if (existingUser.isPresent()) {
//            User user = existingUser.get();
//            user.setUsername(updatedUser.getUsername());
//            user.setEmail(updatedUser.getEmail());
//            user.setPassword(updatedUser.getPassword());
//            user.setRole(updatedUser.getRole());
//            userService.save(user);
//            return ResponseEntity.ok(user);
//        } else {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
//        }
//    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User updatedUser) {
        Optional<User> existingUser = userService.findById(id);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setUsername(updatedUser.getUsername());
            user.setEmail(updatedUser.getEmail());

            // Hashujemy hasło przed zapisem
            user.setPassword(userService.hashPassword(updatedUser.getPassword()));

            user.setRole(updatedUser.getRole());
            userService.save(user);
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PutMapping("/{id}/change-password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestParam String oldPassword, @RequestParam String newPassword) {
        Optional<User> userOptional = userService.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Weryfikacja obecnego hasła
            if (!userService.checkPassword(oldPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid current password!");
            }

            // Aktualizacja hasła
            user.setPassword(userService.hashPassword(newPassword));
            userService.save(user);
            return ResponseEntity.ok("Password updated successfully!");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found!");
        }
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.findById(id).isPresent()) {
            userService.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
