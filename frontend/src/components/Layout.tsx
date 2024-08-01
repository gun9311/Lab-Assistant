// src/components/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './Navbar';
import { getRole } from '../utils/auth';
// import { StudentProvider } from '../context/StudentContext';

const Layout: React.FC = () => {
  const role = getRole() || '';

  return (
    <Container component="main">
        <Outlet />
      <Navbar role={role} />
    </Container>
  );
};

export default Layout;
