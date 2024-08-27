import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { setToken, setRefreshToken, setRole, setUserId, setSchoolName, setGradeStatus } from '../../utils/auth';
import { Container, TextField, Button, Typography, Paper, MenuItem, Select, InputLabel, FormControl, InputAdornment } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { educationOffices } from '../../educationOffices';
import apiNoAuth from '../../utils/apiNoAuth';
import { requestPermissionAndGetToken } from '../../firebase';

interface School {
  label: string;
  code: string;
}

const StudentLoginPage = () => {
  const [educationOffice, setEducationOffice] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isTokenFound, setTokenFound] = useState(false);

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

  const handleLogin = async () => {
    try {
      // FCM 토큰 가져오기 (권한 요청 포함)
      const fcmToken = await requestPermissionAndGetToken(setTokenFound);

      if (!fcmToken) {
        setError('알림 권한이 필요합니다. 알림 권한을 허용해주세요.');
        return;
      }

      const res = await apiNoAuth.post('/auth/login', {
        role: 'student',
        school,
        grade,
        class: classNumber,
        studentId,
        name,
        password,
        fcmToken, // FCM 토큰 추가
      });
      setToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRole(res.data.role);
      setUserId(res.data.userId);
      setSchoolName(res.data.school);
      setGradeStatus(res.data.grade);
      window.location.href = `/${res.data.role}`;
    } catch (error) {
      setError('로그인 정보가 유효하지 않습니다');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ marginTop: { xs: 4, sm: 8 } }}>
      <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" gutterBottom>
          학생 로그인
        </Typography>
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel>지역</InputLabel>
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
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel>학년</InputLabel>
          <Select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            label="학년"
          >
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={6}>6</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="반"
          value={classNumber}
          onChange={(e) => setClassNumber(e.target.value)}
          InputProps={{
            endAdornment: classNumber ? <InputAdornment position="end">반</InputAdornment> : null,
          }} // 입력 값이 있을 때만 "반"이 붙도록 수정
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="출석번호"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          type="number" // 숫자만 입력할 수 있도록 제한
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} // 추가적인 숫자 입력 제한
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          sx={{ mt: 2 }}
        >
          로그인
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  );
};

export default StudentLoginPage;
