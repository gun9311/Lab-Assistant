import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  setToken,
  setRefreshToken,
  setRole,
  setUserId,
  setSchoolName,
  setGradeStatus,
} from "../../utils/auth";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
  Link as MuiLink,
} from "@mui/material";
import { Link } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import { educationOffices } from "../../educationOffices";
import apiNoAuth from "../../utils/apiNoAuth";
import { requestPermissionAndGetToken } from "../../firebase";

interface School {
  label: string;
  code: string;
}

const StudentLoginPage = () => {
  const [educationOffice, setEducationOffice] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTokenFound, setTokenFound] = useState(false);

  useEffect(() => {
    if (educationOffice) {
      const fetchSchools = async () => {
        try {
          const res = await axios.get(
            "https://open.neis.go.kr/hub/schoolInfo",
            {
              params: {
                KEY: "57f9266a0cf641958eda93652099b696",
                Type: "json",
                pIndex: 1,
                pSize: 1000,
                ATPT_OFCDC_SC_CODE: educationOffice,
                SCHUL_KND_SC_NM: "초등학교",
              },
            }
          );
          const schoolData = res.data.schoolInfo[1].row.map((school: any) => ({
            label: school.SCHUL_NM,
            code: school.SD_SCHUL_CODE,
          }));
          setSchools(schoolData);
        } catch (error) {
          console.error("학교 정보를 가져오는데 실패했습니다", error);
        }
      };
      fetchSchools();
    }
  }, [educationOffice]);

  const handleLogin = async () => {
    try {
      // FCM 토큰 가져오기 (권한 요청 포함)
      let fcmToken = await requestPermissionAndGetToken(setTokenFound);

      if (!fcmToken) {
        // setError('알림 권한이 필요합니다. 알림 권한을 허용해주세요.');
        // return;
        fcmToken = null;
      }

      const res = await apiNoAuth.post("/auth/login", {
        role: "student",
        // school,
        // grade,
        // class: classNumber,
        // studentId,
        // name,
        loginId,
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
      setError("로그인 정보가 유효하지 않습니다");
    }
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{ marginTop: { xs: 4, sm: 8 } }}
    >
      <Paper
        elevation={3}
        sx={{ padding: { xs: 3, sm: 5 }, textAlign: "center" }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: "1.5rem", sm: "2rem" } }}
        >
          학생 로그인
        </Typography>
        <Typography
          variant="body1"
          gutterBottom
          sx={{ color: "text.secondary", mb: 3 }}
        >
          아이디와 비밀번호를 입력하세요.
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="아이디"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: "1rem",
            backgroundColor: "#00796b",
            "&:hover": {
              backgroundColor: "#004d40",
            },
          }}
        >
          로그인
        </Button>
        <Button
          fullWidth
          variant="text"
          color="secondary"
          onClick={() => (window.location.href = "/student-register")}
          sx={{
            mt: 1,
            py: 1.5,
            fontSize: "0.9rem",
            color: "#00796b",
            "&:hover": {
              color: "#004d40",
            },
          }}
        >
          회원가입
        </Button>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            mt: 4,
            color: "text.secondary",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MuiLink
            href="https://gun9311.github.io/Lab-Assistant/"
            color="inherit"
            sx={{ marginLeft: 1 }}
          >
            개인정보처리방침
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
};

export default StudentLoginPage;
