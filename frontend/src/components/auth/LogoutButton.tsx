import React from "react";
import { clearAuth, getUserId } from "../../utils/auth";
import apiNoAuth from "../../utils/apiNoAuth";

const handleLogout = async () => {
  try {
    const userId = getUserId();
    await apiNoAuth.post("/auth/logout", { userId }); // 수정된 부분
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
