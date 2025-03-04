import React, { useState, useEffect } from "react";
import "../styles/Login.css"; // Stylizacja logowania
import { useNavigate, useLocation, Link } from "react-router-dom";
import "@fontsource/inter";
import axiosInstance from "../utils/axiosInstance";

const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Sprawdź, czy przekazano informację o wylogowaniu
    useEffect(() => {
        if (location.state && (location.state as any).showLogoutModal) {
            setShowLogoutModal(true);
            // Po 10 sekundach modal znika
            const timer = setTimeout(() => {
                setShowLogoutModal(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Resetujemy error przed nową próbą logowania
        localStorage.removeItem("token");
        try {
            console.log("Wysyłam login do backendu:", email, password);
            const response = await axiosInstance.post("/auth/login", new URLSearchParams({
                email,
                password,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            console.log("Odpowiedź backendu:", response.data);
            // Jeśli się uda, zapisujemy dane do localStorage i przekierowujemy
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("role", response.data.role);
            localStorage.setItem("userId", response.data.userId);
            console.log("✅ Zalogowano! Token:", response.data.token);
            navigate("/dashboard");
        } catch (error: any) {
            if (error.response) {
                if (error.response.status === 401) {
                    setError("Invalid email or password.");
                } else if (error.response.status === 404) {
                    setError("User not found.");
                } else {
                    setError("Something went wrong. Please try again later.");
                }
            } else {
                setError("Unable to connect to the server. Check your internet connection.");
            }
        }
    };

    return (
        <div className="login-container">
            {showLogoutModal && (
                <div className="logout-modal">
                    <div className="logout-modal-content">
                        <h3>Wylogowano pomyślnie</h3>
                        <div className="progress-bar-container">
                            <div className="progress-bar"></div>
                        </div>
                    </div>
                </div>
            )}
            <div className="login-box">
                <h2>Log in</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleLogin}>
                    <label>E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />
                    <div className="forgot-password">
                        <Link to="/forgot-password">Forgot your password?</Link>
                    </div>
                    <button className="login-button" type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
