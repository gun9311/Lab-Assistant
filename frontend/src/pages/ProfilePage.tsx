import { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Paper, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, Alert } from '@mui/material';
import api from '../utils/api';
import { clearAuth } from '../utils/auth';

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | (() => void)>(null);
  const [dialogMessage, setDialogMessage] = useState('');

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
    const allowedFields = ['name', 'school', 'phone', 'password', 'grade', 'class'];
    const validFormData = Object.fromEntries(
      Object.entries(formData).filter(
        ([key, value]) => allowedFields.includes(key) && value !== null && value !== undefined
      )
    );

    console.log('Valid Form Data:', validFormData); // 유효한 폼 데이터 로그 출력

    try {
      const res = await api.put('/users/profile', validFormData);
      setProfile(res.data);
      setEditMode(false);
      setDialogOpen(false);
      setSuccessMessage('프로필 업데이트에 성공했습니다.'); // 성공 메시지 설정
    } catch (error) {
      console.error('Error updating profile:', error); // 에러 로그 출력
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

  const openDialog = (action: () => void, message: string) => {
    setDialogAction(() => action);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)}>
                  취소
                </Button>
                <Button variant="contained" color="primary" onClick={() => openDialog(handleSave, '프로필을 저장하시겠습니까?')}>
                  저장
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button variant="outlined" color="error" onClick={() => openDialog(handleDelete, '프로필을 삭제하시겠습니까?')}>
                  삭제
                </Button>
                <Button variant="contained" color="primary" onClick={() => setEditMode(true)}>
                  수정
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => openDialog(handleLogout, '로그아웃하시겠습니까?')}>
                  로그아웃
                </Button>
              </Box>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            취소
          </Button>
          <Button onClick={() => { dialogAction && dialogAction(); handleDialogClose(); }} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!successMessage} autoHideDuration={2000} onClose={() => setSuccessMessage('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={2000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;
