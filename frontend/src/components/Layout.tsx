import React from "react";
import { Outlet } from "react-router-dom";
import { Container, useTheme, useMediaQuery, Box } from "@mui/material";
import Navbar from "./Navbar";
import { getRole } from "../utils/auth";

const Layout: React.FC<{ isQuizMode: boolean }> = ({ isQuizMode }) => {
  const role = getRole() || "";
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const bottomNavHeight = isDesktop ? 0 : 56;

  return (
    <Box
      component="main"
      sx={{
        pb: `${bottomNavHeight}px`,
      }}
    >
      {!isQuizMode && <Navbar role={role} isQuizMode={isQuizMode} />}
      <Outlet />
    </Box>
  );
};

export default Layout;
