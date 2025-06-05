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
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { educationOffices } from "../../educationOffices";
import apiNoAuth from "../../utils/apiNoAuth";
import { useNavigate } from "react-router-dom";
import { requestPermissionAndGetToken } from "../../firebase";
import {
  setToken,
  setRefreshToken,
  setRole,
  setUserId,
  setSchoolName,
} from "../../utils/auth";

interface School {
  label: string;
  code: string;
}

const TeacherRegisterPage = () => {
  const [educationOffice, setEducationOffice] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [passwordError, setPasswordError] = useState("");
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
              // 더 이상 데이터가 없거나 오류 발생 시
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
      setError("");
    } else if (name === "password") {
      setPassword(value);
      if (error) setError("");
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
      if (error) setError("");
    } else if (name === "name") {
      setName(value);
      if (error) setError("");
    } else if (name === "authCode") {
      setAuthCode(value);
      if (error) setError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword.length > 0 && newPassword.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.");
    } else {
      setPasswordError("");
    }
    setPasswordMatchError(
      newPassword !== confirmPassword && confirmPassword !== ""
    );
    if (error) setError("");
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordMatchError(
      password !== newConfirmPassword && newConfirmPassword !== ""
    );
    if (error) setError("");
  };

  const handleSchoolChange = (value: School | null) => {
    setSchool(value?.label || "");
    if (error) setError("");
  };

  const handlePrivacyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrivacyAccepted(event.target.checked);
    if (error) setError("");
  };

  const handleRegister = async () => {
    setError("");
    setPasswordError("");
    setPasswordMatchError(false);

    const emailValid = validateEmail(email);
    setError(emailValid ? "" : "유효한 이메일 형식을 입력해주세요.");
    if (!emailValid) return;

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setPasswordMatchError(true);
      return;
    }
    if (!name.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (!school.trim()) {
      setError("학교를 선택해주세요.");
      return;
    }
    if (!authCode.trim()) {
      setError("교사 인증코드를 입력해주세요.");
      return;
    }
    if (!privacyAccepted) {
      setError("개인정보처리방침에 동의해야 회원가입을 진행할 수 있습니다.");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);
    setSuccess(false);

    try {
      const res = await apiNoAuth.post("/auth/register/teacher", {
        email,
        password,
        name,
        school,
        authCode,
      });
      const {
        accessToken,
        refreshToken,
        userId,
        role,
        school: userSchool,
      } = res.data;

      setToken(accessToken);
      setRefreshToken(refreshToken);
      setRole(role);
      setUserId(userId);
      setSchoolName(userSchool);

      window.location.href = `/${role}`;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "교사 등록에 실패했습니다.";
      setError(errorMessage);
      console.error("Teacher registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableInputs = isLoading;
  const disableButton =
    isLoading ||
    !email ||
    !password ||
    !confirmPassword ||
    !name ||
    !school ||
    !authCode ||
    !privacyAccepted ||
    passwordMatchError ||
    !!passwordError;

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
          교사 회원가입
        </Typography>
        <FormControl
          fullWidth
          variant="outlined"
          margin="normal"
          disabled={disableInputs}
        >
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
          disabled={disableInputs}
          renderInput={(params) => (
            <TextField
              {...params}
              label="학교(검색)"
              variant="outlined"
              margin="normal"
            />
          )}
          onChange={(event, value) => {
            handleSchoolChange(value);
          }}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이메일"
          name="email"
          value={email}
          onChange={handleInputChange}
          error={!!error && error.includes("이메일")}
          helperText={!!error && error.includes("이메일") ? error : ""}
          disabled={disableInputs}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호 (6자 이상)"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          error={!!passwordError || passwordMatchError}
          helperText={
            passwordError ||
            (passwordMatchError ? "비밀번호가 일치하지 않습니다." : "")
          }
          disabled={disableInputs}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={passwordMatchError}
          helperText={passwordMatchError ? "비밀번호가 일치하지 않습니다." : ""}
          disabled={disableInputs}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="닉네임"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          disabled={disableInputs}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="교사 인증코드"
          value={authCode}
          onChange={(e) => {
            setAuthCode(e.target.value);
            if (error) setError("");
          }}
          disabled={disableInputs}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={privacyAccepted}
              onChange={handlePrivacyChange}
              name="privacyAccepted"
              color="primary"
              disabled={disableInputs}
            />
          }
          label={
            <Typography variant="body2">
              <MuiLink
                href="https://gun9311.github.io/Lab-Assistant/"
                target="_blank"
                rel="noopener noreferrer"
              >
                개인정보처리방침
              </MuiLink>
              에 동의합니다.
            </Typography>
          }
          sx={{ mt: 1, mb: 1, display: "flex", justifyContent: "center" }}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleRegister}
          disabled={disableButton}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: "1rem",
            backgroundColor: "#00796b",
            "&:hover": {
              backgroundColor: "#004d40",
            },
          }}
          startIcon={
            isLoading ? <CircularProgress size={24} color="inherit" /> : null
          }
        >
          {isLoading ? "가입 처리 중..." : "확인"}
        </Button>
        {error &&
          !error.includes("이메일") &&
          !passwordError &&
          !passwordMatchError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default TeacherRegisterPage;
