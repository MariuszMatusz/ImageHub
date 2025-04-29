// import React, { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import "../styles/Navbar.css";
// import "@fontsource/inter";
// import { mapToObject } from "../utils/localStorageHelper";
//
// // Definicja interfejsu Role
// interface Role {
//     id?: number;
//     name: string;
//     description?: string;
//     permissions: string[];
//     systemRole?: boolean;
// }
//
// const Navbar: React.FC = () => {
//     const [role, setRole] = useState<Role | null>(null);
//     const [roleName, setRoleName] = useState<string>("");
//     const navigate = useNavigate();
//
//     useEffect(() => {
//         const storedRole = localStorage.getItem("role");
//         console.warn("Stored role:", storedRole);
//
//         if (storedRole) {
//             try {
//                 const parsedRole = mapToObject<Role>(storedRole);
//                 console.log("Parsed role:", parsedRole);
//
//                 if (parsedRole && typeof parsedRole === 'object') {
//                     setRole(parsedRole);
//                     // Ustaw roleName oddzielnie, aby uniknąć problemu renderowania obiektu
//                     setRoleName(parsedRole.name || "");
//                 }
//             } catch (error) {
//                 console.error("Error parsing role from localStorage:", error);
//                 localStorage.removeItem("role");
//             }
//         }
//     }, []);
//
//     const handleLogout = () => {
//         // Natychmiast usuń dane użytkownika
//         localStorage.removeItem("token");
//         localStorage.removeItem("role");
//         localStorage.removeItem("userId");
//         setRole(null);
//         setRoleName("");
//         // Przekieruj natychmiastowo do strony logowania,
//         // przekazując state, aby na stronie logowania wyświetlić modal
//         navigate("/", { state: { showLogoutModal: true } });
//     };
//
//     return (
//         <nav className="navbar">
//             <div className="navbar-logo">
//                 <img src="/images/logo-imageHub.png" alt="Logo" />
//                 <span>ImageHub</span>
//             </div>
//             {role && (
//                 <div className="navbar-options">
//                     {roleName === "ADMIN" && (
//                         <Link to="/admin-panel" className="navbar-link">
//                             Panel Administratora
//                         </Link>
//                     )}
//                     {roleName !== "ADMIN" && (
//                         <Link to="/user-panel" className="navbar-link">
//                             Panel Użytkownika
//                         </Link>
//                     )}
//                     <button onClick={handleLogout} className="navbar-logout">
//                         <img
//                             src="/images/logout-ImageHub.png"
//                             alt="Logout"
//                         />
//                         Wyloguj
//                     </button>
//                 </div>
//             )}
//         </nav>
//     );
// };
//
// export default Navbar;

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
        // Usuń dane z localStorage
        localStorage.clear(); // Czyści całe localStorage zamiast tylko wybranych kluczy

        // Usuń wszystkie ciasteczka
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Usuń dane sesyjne
        sessionStorage.clear();

        // Resetuj stan komponentu
        setRole(null);
        setRoleName("");

        // Wymuś pełne przeładowanie strony podczas przekierowania
        // aby zagwarantować wyczyszczenie pamięci podręcznej i kontekstu przeglądarki
        window.location.href = "/"; // Zamiast navigate - wymusi pełne przeładowanie

        // Alternatywnie, jeśli chcesz zachować react-router, możesz użyć:
        // navigate("/", { state: { showLogoutModal: true }, replace: true });
        // setTimeout(() => window.location.reload(), 100);
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
                    {roleName !== "ADMIN" && (
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