import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, TextField, Button, Typography, Paper, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { educationOffices } from '../../educationOffices';
import apiNoAuth from '../../utils/apiNoAuth';

interface School {
  label: string;
  code: string;
}

const StudentRegisterPage = () => {
  const [educationOffice, setEducationOffice] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

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
      const res = await apiNoAuth.post('/auth/register/student', { studentId, name, password, grade, class: studentClass, school, email, phone });
      console.log('학생 등록 완료:', res.data);
      // 성공 처리 추가
    } catch (error) {
      setError('학생 등록에 실패했습니다');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom>
          학생 회원가입
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
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="출석번호"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
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
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
        />
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
      </Paper>
    </Container>
  );
};

export default StudentRegisterPage;
