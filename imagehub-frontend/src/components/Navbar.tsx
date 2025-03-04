import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import "@fontsource/inter";

const Navbar: React.FC = () => {
    const [role, setRole] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedRole = localStorage.getItem("role");
        if (storedRole) {
            setRole(storedRole);
        }
    }, []);

    const handleLogout = () => {
        // Natychmiast usuń dane użytkownika
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        setRole(null);
        // Przekieruj natychmiastowo do strony logowania,
        // przekazując state, aby na stronie logowania wyświetlić modal
        navigate("/", { state: { showLogoutModal: true } });
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <img src="/images/logo-imageHub.png" alt="Logo" />
                <span>ImageHub</span>
            </div>
            {role && (
                <div className="navbar-options">
                    {role === "ADMIN" && (
                        <Link to="/admin-panel" className="navbar-link">
                            Panel Administratora
                        </Link>
                    )}
                    {role === "USER" && (
                        <Link to="/user-panel" className="navbar-link">
                            Panel Użytkownika
                        </Link>
                    )}
                    <button onClick={handleLogout} className="navbar-logout" >

                        <img
                            src="/images/logout-ImageHub.png"
                            alt="Logout"

                        />
                        Wyloguj
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
