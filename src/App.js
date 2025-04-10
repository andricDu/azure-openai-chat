import React from "react";
import Chat from "./Chat";
import { AuthProvider } from "./AuthProvider";
import "antd/dist/reset.css";

const App = () => {
    return (
        <AuthProvider>
            <Chat />
        </AuthProvider>
    );
};

export default App;