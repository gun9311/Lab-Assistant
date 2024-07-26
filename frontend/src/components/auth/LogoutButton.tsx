import React from "react";
import axios from "axios";
import { clearAuth, getUserId } from "../../utils/auth";

const handleLogout = async () => {
  try {
    const userId = getUserId();
    await axios.post("/api/auth/logout", { userId });
    clearAuth();
    window.location.href = "/home";
  } catch (error) {
    console.error("Failed to log out:", error);
  }
};

const LogoutButton: React.FC = () => (
  <button onClick={handleLogout}>Logout</button>
);

export default LogoutButton;
