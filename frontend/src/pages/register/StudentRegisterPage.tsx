import React, { useState, useEffect } from "react";
import axios from "axios";
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
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { educationOffices } from "../../educationOffices";
import apiNoAuth from "../../utils/apiNoAuth";
import { useNavigate } from "react-router-dom";

interface School {
  label: string;
  code: string;
}

const StudentRegisterPage = () => {
  const [educationOffice, setEducationOffice] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [school, setSchool] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (educationOffice) {
      const fetchSchools = async () => {
        try {
          let 호출_카운트 = 1;
          let 모든_학교_목록: School[] = [];
          let 전체_학교_수 = 0;
          let 첫_응답_처리됨 = false;

          while (true) {
            const res = await axios.get(
              "https://open.neis.go.kr/hub/schoolInfo",
              {
                params: {
                  KEY: "57f9266a0cf641958eda93652099b696",
                  Type: "json",
                  pIndex: 호출_카운트,
                  pSize: 1000,
                  ATPT_OFCDC_SC_CODE: educationOffice,
                  SCHUL_KND_SC_NM: "초등학교",
                },
              }
            );

            if (
              res.data.schoolInfo &&
              res.data.schoolInfo[1] &&
              res.data.schoolInfo[1].row
            ) {
              const schoolData = res.data.schoolInfo[1].row.map(
                (school: any) => ({
                  label: school.SCHUL_NM,
                  code: school.SD_SCHUL_CODE,
                })
              );
              모든_학교_목록 = 모든_학교_목록.concat(schoolData);

              if (
                !첫_응답_처리됨 &&
                res.data.schoolInfo[0] &&
                res.data.schoolInfo[0].head &&
                res.data.schoolInfo[0].head[0]
              ) {
                전체_학교_수 = res.data.schoolInfo[0].head[0].list_total_count;
                첫_응답_처리됨 = true;
              }

              if (
                모든_학교_목록.length >= 전체_학교_수 ||
                schoolData.length < 1000
              ) {
                break;
              }
              호출_카운트++;
            } else {
              if (
                호출_카운트 === 1 &&
                (!res.data.schoolInfo ||
                  !res.data.schoolInfo[1] ||
                  !res.data.schoolInfo[1].row)
              ) {
                console.warn(
                  "선택된 교육청에 해당하는 초등학교 정보가 없습니다."
                );
              }
              break;
            }
          }
          setSchools(모든_학교_목록);
        } catch (error) {
          console.error("학교 정보를 가져오는데 실패했습니다", error);
          setSchools([]); // 오류 발생 시 학교 목록 초기화
        }
      };
      fetchSchools();
    }
  }, [educationOffice]);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const res = await apiNoAuth.post("/auth/register/student", {
        loginId,
        studentId,
        name,
        password,
        grade,
        class: studentClass,
        school,
      });
      console.log("학생 등록 완료:", res.data);
      setSuccess(true);
      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (error) {
      setError("학생 등록에 실패했습니다");
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
          학생 회원가입
        </Typography>
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel>지역(선택 후 학교 검색)</InputLabel>
          <Select
            value={educationOffice}
            onChange={(e) => setEducationOffice(e.target.value)}
            label="교육청"
          >
            {educationOffices.map((office) => (
              <MenuItem key={office.code} value={office.code}>
                {office.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          options={schools}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="학교(검색)"
              variant="outlined"
              margin="normal"
            />
          )}
          onChange={(event, value: School | null) =>
            setSchool(value?.label || "")
          }
        />
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel>학년</InputLabel>
          <Select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            label="학년"
          >
            <MenuItem value={2}>2</MenuItem>
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
          InputProps={{
            endAdornment: studentClass ? (
              <InputAdornment position="end">반</InputAdornment>
            ) : null,
          }}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="출석번호"
          type="number"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
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
          label="아이디"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
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
          label="비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleRegister}
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
          확인
        </Button>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        <Snackbar
          open={success}
          autoHideDuration={3000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccess(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            회원가입이 성공적으로 완료되었습니다!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default StudentRegisterPage;
