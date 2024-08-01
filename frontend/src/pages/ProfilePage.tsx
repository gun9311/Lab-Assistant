import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Paper, Box } from '@mui/material';
import api from '../utils/api';
import { clearAuth } from '../utils/auth';

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        setProfile(res.data);
        setFormData(res.data);
      } catch (error) {
        setError('프로필 정보를 불러오는데 실패했습니다.');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      const res = await api.put('/users/profile', formData);
      setProfile(res.data);
      setEditMode(false);
    } catch (error) {
      setError('프로필 업데이트에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete('/users/profile');
      clearAuth();
      window.location.href = '/home';
    } catch (error) {
      setError('프로필 삭제에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/home';
  };

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          프로필
        </Typography>
        {profile ? (
          <div>
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="이름"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              disabled={!editMode}
            />
            {profile.grade !== undefined && (
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label="학년"
                name="grade"
                value={formData.grade || ''}
                onChange={handleChange}
                disabled={!editMode}
              />
            )}
            {profile.class !== undefined && (
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label="반"
                name="class"
                value={formData.class || ''}
                onChange={handleChange}
                disabled={!editMode}
              />
            )}
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="이메일"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              disabled={!editMode}
            />
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="학교"
              name="school"
              value={formData.school || ''}
              onChange={handleChange}
              disabled={!editMode}
            />
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="전화번호"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              disabled={!editMode}
            />
            {editMode ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <Button variant="contained" color="primary" onClick={handleSave}>
                  저장
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)}>
                  취소
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <Button variant="contained" color="primary" onClick={() => setEditMode(true)}>
                  수정
                </Button>
                <Button variant="outlined" color="error" onClick={handleDelete}>
                  삭제
                </Button>
                <Button variant="outlined" color="secondary" onClick={handleLogout}>
                  로그아웃
                </Button>
              </Box>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </Paper>
    </Container>
  );
};

export default ProfilePage;