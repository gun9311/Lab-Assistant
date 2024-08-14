import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, TextField, Button, Typography, Paper, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, Alert, MenuItem, Select, FormControl, InputLabel, Autocomplete } from '@mui/material';
import { educationOffices } from '../educationOffices';
import api from '../utils/api';
import { clearAuth } from '../utils/auth';
import { SelectChangeEvent } from '@mui/material/Select';

interface School {
  label: string;
  code: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [schools, setSchools] = useState<School[]>([]);
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

        if (res.data.educationOffice) {
          fetchSchools(res.data.educationOffice);
        }
      } catch (error) {
        setError('프로필 정보를 불러오는데 실패했습니다.');
      }
    };
    fetchProfile();
  }, []);

  const fetchSchools = async (educationOfficeCode: string) => {
    try {
      const res = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
        params: {
          KEY: '57f9266a0cf641958eda93652099b696',
          Type: 'json',
          pIndex: 1,
          pSize: 1000,
          ATPT_OFCDC_SC_CODE: educationOfficeCode,
          SCHUL_KND_SC_NM: '초등학교',
        },
      });
      const schoolData = res.data.schoolInfo[1].row.map((school: any) => ({
        label: school.SCHUL_NM,
        code: school.SD_SCHUL_CODE,
      }));
      setSchools(schoolData);
    } catch (error) {
      console.error('학교 정보를 가져오는데 실패했습니다', error);
    }
  };

  const handleEducationOfficeChange = (event: SelectChangeEvent<any>) => {
    const selectedEducationOffice = event.target.value;
    setFormData({
      ...formData,
      educationOffice: selectedEducationOffice,
      school: '', // 교육청 변경 시 학교 초기화
    });
    fetchSchools(selectedEducationOffice);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    // 저장할 필드만 남기기
    const allowedFields = ['name', 'school', 'password', 'grade', 'class'];
    const validFormData = Object.fromEntries(
      Object.entries(formData).filter(
        ([key, value]) => allowedFields.includes(key) && value !== null && value !== undefined
      )
    );

    console.log('Valid Form Data:', validFormData);

    try {
      const res = await api.put('/users/profile', validFormData);
      setProfile(res.data);
      setEditMode(false);
      setDialogOpen(false);
      setSuccessMessage('프로필 업데이트에 성공했습니다.');
    } catch (error) {
      console.error('Error updating profile:', error);
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
            {editMode && (
              <FormControl fullWidth variant="outlined" margin="normal">
                <InputLabel>지역(선택 후 학교 검색)</InputLabel>
                <Select
                  value={formData.educationOffice || ''}
                  onChange={handleEducationOfficeChange}
                  label="교육청"
                  disabled={!editMode}
                >
                  {educationOffices.map((office) => (
                    <MenuItem key={office.code} value={office.code}>
                      {office.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {profile.school && (
              <Autocomplete
                options={schools}
                fullWidth
                value={formData.school || ''}
                onChange={(event, value: School | null) => setFormData({ ...formData, school: value?.label || '' })}
                renderInput={(params) => <TextField {...params} label="학교(검색)" variant="outlined" margin="normal" />}
                disabled={!editMode}
              />
            )}
            {profile.email && (
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
            )}
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
            {profile.name && (
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label={profile.role === 'teacher' ? '닉네임' : '이름'}
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                disabled={!editMode}
              />
            )}
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
