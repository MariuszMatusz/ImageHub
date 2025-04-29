import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminPanel from "./components/AdminPanel";
import UserPanel from "./components/UserPanel";
import {PermissionProvider} from "./contexts/PermissionContext";



const App: React.FC = () => {
    return (
        <PermissionProvider>
        <Router>
            <Navbar />
            <main className="content">
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Podejście z zagnieżdżonymi ścieżkami */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/user-panel" element={<UserPanel />} />
                    </Route>

                    {/* Ścieżka wymagająca roli ADMIN */}
                    <Route path="/admin-panel" element={
                        <ProtectedRoute requiredRole="ADMIN">
                            <AdminPanel />
                        </ProtectedRoute>
                    } />

                </Routes>
            </main>
            <Footer />
        </Router>
    </PermissionProvider>
    );
};

export default App;