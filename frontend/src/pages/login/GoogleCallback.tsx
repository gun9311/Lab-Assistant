import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiNoAuth from "../../utils/apiNoAuth";
import {
  setToken,
  setRefreshToken,
  setRole,
  setUserId,
  setSchoolName,
} from "../../utils/auth";
import { requestPermissionAndGetToken } from "../../firebase";
import "./GoogleCallback.css";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { educationOffices } from "../../educationOffices";
import axios from "axios";

interface School {
  label: string;
  code: string;
}

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [educationOffice, setEducationOffice] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isTokenFound, setTokenFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const getFcmToken = async () => {
    let fcmToken = await requestPermissionAndGetToken(setTokenFound);
    return fcmToken || null;
  };

  useEffect(() => {
    const fetchToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          const fcmToken = await getFcmToken();
          const response = await apiNoAuth.post("/auth/google", {
            code,
            fcmToken,
          });
          const {
            accessToken,
            refreshToken,
            userId,
            role,
            school,
            message,
            email,
          } = response.data;

          if (accessToken) {
            setToken(accessToken);
            setRefreshToken(refreshToken);
            setRole(role);
            setUserId(userId);
            setSchoolName(school);
            window.location.href = `/${role}`;
          } else if (
            message ===
            "Google authentication successful, please complete registration."
          ) {
            setEmail(email);
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to exchange token", error);
          setError("Google 인증에 실패했습니다. 다시 시도해주세요.");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchToken();
  }, [navigate]);

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

  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
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

  const handleSubmit = async () => {
    setError("");
    if (isSubmitting) return;
    if (!name || !school || !authCode) {
      setError("모든 필드를 입력해주세요.");
      return;
    }
    if (!privacyAccepted) {
      setError("개인정보처리방침에 동의해야 가입을 완료할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setSuccess(false);

    try {
      const fcmToken = await getFcmToken();
      const response = await apiNoAuth.post(
        "/auth/google/complete-registration",
        { name, school, authCode, fcmToken, email }
      );
      const {
        accessToken,
        refreshToken,
        userId,
        role,
        school: schoolName,
      } = response.data;

      setToken(accessToken);
      setRefreshToken(refreshToken);
      setRole(role);
      setUserId(userId);
      setSchoolName(schoolName);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = `/${role}`;
      }, 500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        "추가 정보를 저장하는 데 실패했습니다. 다시 시도해주세요.";
      setError(errorMessage);
      console.error("Failed to save additional info", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 4 }}>
      {loading ? (
        <div className="spinner"></div>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: "bold", mb: 2, textAlign: "center" }}
          >
            필수 정보 입력
          </Typography>
          <FormControl
            fullWidth
            variant="outlined"
            margin="normal"
            disabled={isSubmitting}
          >
            <InputLabel>지역(선택 후 학교 검색)</InputLabel>
            <Select
              value={educationOffice}
              onChange={(e) => setEducationOffice(e.target.value)}
              label="교육청"
              sx={{ textAlign: "left" }}
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
            disabled={isSubmitting}
            renderInput={(params) => (
              <TextField
                {...params}
                label="학교(검색)"
                variant="outlined"
                margin="normal"
              />
            )}
            onChange={(event, value) => handleSchoolChange(value)}
          />
          <TextField
            fullWidth
            variant="outlined"
            margin="normal"
            label="닉네임"
            value={name}
            onChange={(e) => handleInputChange(setName, e.target.value)}
            sx={{ mb: 2 }}
            disabled={isSubmitting}
          />
          <TextField
            fullWidth
            variant="outlined"
            margin="normal"
            label="인증 코드"
            value={authCode}
            onChange={(e) => handleInputChange(setAuthCode, e.target.value)}
            sx={{ mb: 2 }}
            disabled={isSubmitting}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={privacyAccepted}
                onChange={handlePrivacyChange}
                name="privacyAccepted"
                color="primary"
                disabled={isSubmitting}
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
            onClick={handleSubmit}
            disabled={
              isSubmitting || !name || !school || !authCode || !privacyAccepted
            }
            sx={{
              mt: 2,
              py: 1.5,
              fontSize: "1.1rem",
              backgroundColor: "#00796b",
              "&:hover": {
                backgroundColor: "#004d40",
              },
              borderRadius: "8px",
            }}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : null
            }
          >
            {isSubmitting ? "가입 처리 중..." : "가입하기"}
          </Button>
          <Snackbar
            open={success}
            autoHideDuration={3000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSuccess(false)}
              severity="success"
              variant="filled"
              sx={{ width: "100%" }}
            >
              환영합니다! 로그인되었습니다.
            </Alert>
          </Snackbar>
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
        </Box>
      )}
    </Container>
  );
};

export default GoogleCallback;
