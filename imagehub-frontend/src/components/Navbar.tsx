import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import "@fontsource/inter";
import { mapToObject } from "../utils/localStorageHelper";

// Definicja interfejsu Role
interface Role {
    id?: number;
    name: string;
    description?: string;
    permissions: string[];
    systemRole?: boolean;
}

const Navbar: React.FC = () => {
    const [role, setRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState<string>("");
    const navigate = useNavigate();

    useEffect(() => {
        const storedRole = localStorage.getItem("role");
        console.warn("Stored role:", storedRole);

        if (storedRole) {
            try {
                const parsedRole = mapToObject<Role>(storedRole);
                console.log("Parsed role:", parsedRole);

                if (parsedRole && typeof parsedRole === 'object') {
                    setRole(parsedRole);
                    // Ustaw roleName oddzielnie, aby uniknąć problemu renderowania obiektu
                    setRoleName(parsedRole.name || "");
                }
            } catch (error) {
                console.error("Error parsing role from localStorage:", error);
                localStorage.removeItem("role");
            }
        }
    }, []);

    const handleLogout = () => {
        // Natychmiast usuń dane użytkownika
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        setRole(null);
        setRoleName("");
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
                    {roleName === "ADMIN" && (
                        <Link to="/admin-panel" className="navbar-link">
                            Panel Administratora
                        </Link>
                    )}
                    {roleName === "USER" && (
                        <Link to="/user-panel" className="navbar-link">
                            Panel Użytkownika
                        </Link>
                    )}
                    <button onClick={handleLogout} className="navbar-logout">
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