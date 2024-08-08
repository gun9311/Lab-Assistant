import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, TextField, Button, Typography, Paper, MenuItem, Select, InputLabel, FormControl, Snackbar, Alert } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { educationOffices } from '../../educationOffices';
import apiNoAuth from '../../utils/apiNoAuth';
import { useNavigate } from 'react-router-dom';

interface School {
  label: string;
  code: string;
}

const TeacherRegisterPage = () => {
  const [educationOffice, setEducationOffice] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (educationOffice) {
      const fetchSchools = async () => {
        try {
          const res = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
            params: {
              KEY: '57f9266a0cf641958eda93652099b696',
              Type: 'json',
              pIndex: 1,
              pSize: 1000,
              ATPT_OFCDC_SC_CODE: educationOffice,
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
      fetchSchools();
    }
  }, [educationOffice]);

  const handleRegister = async () => {
    try {
      const res = await apiNoAuth.post('/auth/register/teacher', { email, password, name, school, phone });
      console.log('교사 등록 완료:', res.data);
      setSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 1300);
    } catch (error) {
      setError('교사 등록에 실패했습니다');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom>
          교사 회원가입
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel>교육청</InputLabel>
          <Select
            value={educationOffice}
            onChange={(e) => setEducationOffice(e.target.value)}
            label="교육청"
          >
            {educationOffices.map(office => (
              <MenuItem key={office.code} value={office.code}>
                {office.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          options={schools}
          fullWidth
          renderInput={(params) => <TextField {...params} label="학교" variant="outlined" margin="normal" />}
          onChange={(event, value: School | null) => setSchool(value?.label || '')}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="전화번호"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleRegister}
          sx={{ mt: 2 }}
        >
          회원가입
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        <Snackbar 
          open={success} 
          autoHideDuration={3000} 
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // 알림 위치 설정
        >  
          <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
            회원가입이 성공적으로 완료되었습니다!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default TeacherRegisterPage;
