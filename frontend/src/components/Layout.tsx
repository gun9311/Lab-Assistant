import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './Navbar';
import { getRole } from '../utils/auth';

const Layout: React.FC = () => {
  const role = getRole() || '';

  return (
    <Container component="main" maxWidth="lg"> {/* maxWidth를 설정해 반응형 적용 */}
      <Outlet />
      <Navbar role={role} />
    </Container>
  );
};

export default Layout;
