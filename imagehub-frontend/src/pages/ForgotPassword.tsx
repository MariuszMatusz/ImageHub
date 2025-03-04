import React, { useState } from "react";
import "../styles/ForgotPassword.css"; // Dodamy stylizację
import { useNavigate } from "react-router-dom";


const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Reset password request sent for:", email);

        // TODO: Połącz z backendem do resetowania hasła
        setMessage("If this email exists, a password reset link has been sent.");

        // Opcjonalnie przekierowanie po kilku sekundach
        setTimeout(() => navigate("/login"), 5000);
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-box">
                <h2>Reset Password</h2>
                <p>Enter your email and we’ll send you a reset link.</p>
                {message && <p className="success-message">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                    <button className="send-button" type="submit">Send Reset Link</button>
                </form>
                <button className="back-button" onClick={() => navigate("/")}>
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;
