import React from "react";
import { Outlet } from "react-router-dom";
import { Container } from "@mui/material";
import Navbar from "./Navbar";
import { getRole } from "../utils/auth";

const Layout: React.FC<{ isQuizMode: boolean }> = ({ isQuizMode }) => {
  const role = getRole() || "";

  return (
    <Container component="main" maxWidth={false}>
      <Outlet />
      {!isQuizMode && <Navbar role={role} isQuizMode={isQuizMode} />}
    </Container>
  );
};

export default Layout;
