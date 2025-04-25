import React, { useState } from "react";
import { Button } from "@mui/material";
import { clearAuth, getUserId } from "../../utils/auth";
import apiNoAuth from "../../utils/apiNoAuth";

const LogoutButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      await apiNoAuth.post("/auth/logout", { userId });
      clearAuth();
      window.location.href = "/home";
    } catch (error) {
      console.error("Failed to log out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleLogout}
      sx={{ mt: 2, width: { xs: "100%", sm: "auto" } }}
      disabled={isLoading}
    >
      {isLoading ? "Logging out..." : "Logout"}
    </Button>
  );
};

export default LogoutButton;
