import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { mapToObject } from "../utils/localStorageHelper";
import { UserRole } from "../pages/PermissionManagement";
import { usePermissions } from '../contexts/PermissionContext';

interface ProtectedRouteProps {
    children?: React.ReactNode;
    requiredRole?: string;
    requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                           children,
                                                           requiredRole,
                                                           requiredPermission
                                                       }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const { hasPermission, permissions } = usePermissions();

    useEffect(() => {
        // Sprawdź token uwierzytelniający, rolę i uprawnienia
        const token = localStorage.getItem("token");

        // Funkcja kontynuacji sprawdzania po załadowaniu uprawnień
        const checkAuthorization = () => {
            try {
                // Brak tokena = brak autoryzacji
                if (!token) {
                    setIsAuthorized(false);
                    setIsChecking(false);
                    return;
                }

                // Sprawdzenie roli, jeśli jest wymagana
                if (requiredRole) {
                    const roleString = localStorage.getItem("role");
                    const userRole = roleString ? mapToObject<UserRole>(roleString) : null;

                    if (userRole?.name !== requiredRole) {
                        setIsAuthorized(false);
                        setIsChecking(false);
                        return;
                    }
                }

                // Sprawdzenie uprawnienia, jeśli jest wymagane
                if (requiredPermission && !hasPermission(requiredPermission)) {
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
        };

        // Jeśli uprawnienia są jeszcze ładowane, poczekaj na nie
        // chyba że nie sprawdzamy uprawnienia, wtedy kontynuuj od razu
        if (!requiredPermission || !permissions.isLoading) {
            checkAuthorization();
        }
    }, [requiredRole, requiredPermission, hasPermission, permissions.isLoading]);

    // Podczas sprawdzania pokaż loader
    if (isChecking || (requiredPermission && permissions.isLoading)) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Weryfikacja dostępu...</p>
            </div>
        );
    }

    // Przekieruj na stronę logowania, jeśli użytkownik nie jest autoryzowany
    if (!isAuthorized) {
        if (localStorage.getItem("token")) {
            // Jeśli użytkownik jest zalogowany, ale nie ma wymaganych uprawnień
            // przekieruj go na dashboard
            return <Navigate to="/dashboard" replace />;
        }
        // W przeciwnym razie przekieruj na stronę logowania
        return <Navigate to="/" replace />;
    }

    // Zwróć dzieci lub Outlet, w zależności od tego, co zostało przekazane
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;