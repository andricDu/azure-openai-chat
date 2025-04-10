import { createContext, useState, useEffect } from "react";
import keycloak from "./Keycloak";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const initializeKeycloak = async () => {
            try {
                const auth = await keycloak.init({
                    onLoad: "login-required",
                    redirectUri: window.location.origin, // Ensure this matches the registered redirect URIs
                });

                if (auth) {
                    setToken(keycloak.token);
                    setAuthenticated(true);
                    // Token refresh logic
                    setInterval(() => {
                        keycloak
                            .updateToken(30)
                            .then((refreshed) => {
                                if (refreshed) {
                                    setToken(keycloak.token);
                                }
                            })
                            .catch(() => {
                                console.error("Failed to refresh token");
                            });
                    }, 30000);
                }
            } catch (err) {
                console.error("Keycloak initialization failed", err);
            }
        };

        if (!authenticated) {
            initializeKeycloak();
        }
    }, [authenticated]);

    return (
        <AuthContext.Provider value={{ token, authenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
