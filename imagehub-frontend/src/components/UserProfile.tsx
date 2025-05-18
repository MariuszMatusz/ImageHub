import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/UserProfile.css";

interface Role {
    id?: number;
    name: string;
    description?: string;
    permissions: string[];
    systemRole?: boolean;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: Role;
}

const UserProfile: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Stan formularza
    const [email, setEmail] = useState<string>("");
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    // Stan przesłania formularza
    const [emailUpdateStatus, setEmailUpdateStatus] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    // Załaduj dane użytkownika podczas montowania komponentu
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/users/me");
            setUser(response.data);
            setEmail(response.data.email);
        } catch (err) {
            setError("Nie udało się pobrać danych użytkownika.");
            console.error("Error fetching user data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setEmailUpdateStatus({
                success: false,
                message: "Email nie może być pusty."
            });
            return;
        }

        try {
            await axiosInstance.put(`/users/me`, {
                email
            });

            setEmailUpdateStatus({
                success: true,
                message: "Email został zaktualizowany pomyślnie."
            });

            // Odśwież dane użytkownika
            fetchUserData();

            // Wyczyść status po 3 sekundach
            setTimeout(() => {
                setEmailUpdateStatus(null);
            }, 3000);
        } catch (err) {
            setEmailUpdateStatus({
                success: false,
                message: "Nie udało się zaktualizować adresu email."
            });
            console.error("Error updating email:", err);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Sprawdź poprawność pól hasła
        if (!currentPassword) {
            setPasswordUpdateStatus({
                success: false,
                message: "Aktualne hasło jest wymagane."
            });
            return;
        }

        if (!newPassword) {
            setPasswordUpdateStatus({
                success: false,
                message: "Nowe hasło jest wymagane."
            });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordUpdateStatus({
                success: false,
                message: "Nowe hasło musi mieć co najmniej 6 znaków."
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordUpdateStatus({
                success: false,
                message: "Hasła nie są zgodne."
            });
            return;
        }

        try {
            await axiosInstance.put(`/users/me/change-password`, null, {
                params: {
                    oldPassword: currentPassword,
                    newPassword: newPassword
                }
            });

            setPasswordUpdateStatus({
                success: true,
                message: "Hasło zostało zmienione pomyślnie."
            });

            // Wyczyść pola hasła
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Wyczyść status po 3 sekundach
            setTimeout(() => {
                setPasswordUpdateStatus(null);
            }, 3000);
        } catch (err) {
            setPasswordUpdateStatus({
                success: false,
                message: "Nie udało się zmienić hasła. Sprawdź, czy aktualne hasło jest poprawne."
            });
            console.error("Error updating password:", err);
        }
    };

    if (loading) {
        return <div className="profile-loading">Ładowanie profilu...</div>;
    }

    if (error) {
        return <div className="profile-error">{error}</div>;
    }

    // Bezpieczne pobieranie nazwy roli
    const roleName = user?.role?.name || (typeof user?.role === 'string' ? user?.role : '');

    return (
        <div className="user-profile-container">
            <h2>Profil użytkownika</h2>

            <div className="profile-info">
                <div className="profile-field">
                    <label>Nazwa użytkownika:</label>
                    <span>{user?.username}</span>
                </div>

                <div className="profile-field">
                    <label>Rola:</label>
                    {/* Zmieniono renderowanie roli, aby wyświetlała tylko nazwę */}
                    <span>{roleName}</span>
                </div>
            </div>

            <div className="profile-forms">
                {/* Formularz aktualizacji e-mail */}
                <form className="profile-form" onSubmit={handleEmailUpdate}>
                    <h3>Zmień adres email</h3>

                    {emailUpdateStatus && (
                        <div className={`status-message ${emailUpdateStatus.success ? 'success' : 'error'}`}>
                            {emailUpdateStatus.message}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Adres email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="update-btn">
                        Aktualizuj email
                    </button>
                </form>

                {/* Formularz aktualizacji hasła */}
                <form className="profile-form" onSubmit={handlePasswordUpdate}>
                    <h3>Zmień hasło</h3>

                    {passwordUpdateStatus && (
                        <div className={`status-message ${passwordUpdateStatus.success ? 'success' : 'error'}`}>
                            {passwordUpdateStatus.message}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="currentPassword">Aktualne hasło:</label>
                        <input
                            type="password"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">Nowe hasło:</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Potwierdź nowe hasło:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="update-btn">
                        Zmień hasło
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;