import React from "react";
import { Button } from "@mui/material";
import { clearAuth, getUserId } from "../../utils/auth";
import apiNoAuth from "../../utils/apiNoAuth";

const handleLogout = async () => {
  try {
    const userId = getUserId();
    await apiNoAuth.post("/auth/logout", { userId });
    clearAuth();
    window.location.href = "/home";
  } catch (error) {
    console.error("Failed to log out:", error);
  }
};

const LogoutButton: React.FC = () => (
  <Button 
    variant="contained" 
    color="secondary" 
    onClick={handleLogout}
    sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }} // 반응형 설정
  >
    Logout
  </Button>
);

export default LogoutButton;
