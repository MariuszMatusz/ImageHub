package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User save(User user) {

        // Sprawdzenie, czy użytkownik o podanym email już istnieje
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists!");
        }

        // Przypisanie domyślnej roli USER, jeśli użytkownik jej nie podał
        if (user.getRole() == null) {
            user.setRole(Role.USER);
        }

        // Hashowanie hasła przed zapisaniem
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // Dodatkowa metoda do hashowania hasła
    public String hashPassword(String password) {
        return passwordEncoder.encode(password);
    }

    // Metoda do pobierania użytkowników na podstawie roli
    public List<User> findByRole(Role role) {
        return userRepository.findByRole(role);
    }}