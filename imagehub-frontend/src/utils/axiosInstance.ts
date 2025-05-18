import axios from "axios";

const axiosInstance = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
});

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
    console.log(`Sending ${config.method?.toUpperCase()} request to: ${config.url}`);

    // Dla logowania nie potrzebujemy tokena
    if (config.url?.includes('/auth/login')) {
        console.log('Login request detected - not adding token');
        return config;
    }

    // Dla innych żądań dodajemy token
    const token = localStorage.getItem("token");
    if (token) {
        console.log('Adding token to request');
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.log('No token found');
    }

    return config;
}, (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
});

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        console.log(`Response from ${response.config.url}: Status ${response.status}`);
        return response;
    },
    (error) => {
        console.error("Response error:", error);

        if (error.response) {
            console.log(`Error ${error.response.status} from ${error.config?.url}`);
            // Jeśli jest to błąd 401 (Unauthorized), możemy przekierować do logowania
            if (error.response.status === 401) {
                console.log('Unauthorized - clearing token');
                localStorage.removeItem("token");
                // Możesz tutaj dodać przekierowanie do strony logowania
            }
        } else if (error.request) {
            console.log('No response received', error.request);
        } else {
            console.log('Error setting up request:', error.message);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;