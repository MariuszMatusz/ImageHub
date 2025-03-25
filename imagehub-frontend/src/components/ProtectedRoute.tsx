import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { mapToObject } from "../utils/localStorageHelper";
import { UserRole } from "../pages/PermissionManagement";

interface ProtectedRouteProps {
    children?: React.ReactNode;
    requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Sprawdź token uwierzytelniający i rolę
        const token = localStorage.getItem("token");

        try {
            const roleString = localStorage.getItem("role");
            const userRole = roleString ? mapToObject<UserRole>(roleString) : null;
            console.log(userRole, requiredRole);

            // Brak tokena = brak autoryzacji
            if (!token) {
                setIsAuthorized(false);
                setIsChecking(false);
                return;
            }

            // Jeśli wymagana konkretna rola, sprawdź ją
            if (requiredRole && userRole?.name !== requiredRole) {
                setIsAuthorized(false);
                setIsChecking(false);
                return;
            }

            // Wszystkie warunki spełnione
            setIsAuthorized(true);
            setIsChecking(false);
        } catch (error) {
            console.error("Error checking authorization:", error);
            setIsAuthorized(false);
            setIsChecking(false);
        }
    }, [requiredRole]);

    // Podczas sprawdzania pokaż loader
    if (isChecking) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Weryfikacja dostępu...</p>
            </div>
        );
    }

    // Przekieruj na stronę logowania, jeśli użytkownik nie jest autoryzowany
    if (!isAuthorized) {
        // Jeśli próbował wejść na stronę wymagającą specyficznej roli,
        // przekieruj go na dashboard (jeśli ma token)
        if (requiredRole && localStorage.getItem("token")) {
            return <Navigate to="/dashboard" replace />;
        }
        // W przeciwnym razie przekieruj na stronę logowania
        return <Navigate to="/" replace />;
    }

    // Zwróć dzieci lub Outlet, w zależności od tego, co zostało przekazane
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;