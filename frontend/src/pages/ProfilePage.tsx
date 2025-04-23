import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  IconButton,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { educationOffices } from "../educationOffices";
import api from "../utils/api";
import { clearAuth, getUserId, setSchoolName } from "../utils/auth";
import { SelectChangeEvent } from "@mui/material/Select";
import apiNoAuth from "../utils/apiNoAuth";

interface School {
  label: string;
  code: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [passwordChangeMode, setPasswordChangeMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | (() => void)>(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [originalProfile, setOriginalProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/profile");
        setProfile(res.data);
        setFormData(res.data);
        setOriginalProfile(res.data);

        if (res.data.educationOffice) {
          fetchSchools(res.data.educationOffice);
        }
      } catch (error) {
        setError("프로필 정보를 불러오는데 실패했습니다.");
      }
    };
    fetchProfile();
  }, []);

  const fetchSchools = async (educationOfficeCode: string) => {
    try {
      const res = await axios.get("https://open.neis.go.kr/hub/schoolInfo", {
        params: {
          KEY: "57f9266a0cf641958eda93652099b696",
          Type: "json",
          pIndex: 1,
          pSize: 1000,
          ATPT_OFCDC_SC_CODE: educationOfficeCode,
          SCHUL_KND_SC_NM: "초등학교",
        },
      });
      const schoolData = res.data.schoolInfo[1].row.map((school: any) => ({
        label: school.SCHUL_NM,
        code: school.SD_SCHUL_CODE,
      }));
      setSchools(schoolData);
    } catch (error) {
      console.error("학교 정보를 가져오는데 실패했습니다", error);
    }
  };

  const handleEducationOfficeChange = (event: SelectChangeEvent<any>) => {
    const selectedEducationOffice = event.target.value;
    setFormData({
      ...formData,
      educationOffice: selectedEducationOffice,
      school: "", // 교육청 변경 시 학교 초기화
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
    if (passwordChangeMode) {
      const { currentPassword, newPassword, confirmPassword } = formData;
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
      try {
        // 현재 비밀번호와 새 비밀번호를 함께 전송
        const res = await api.put("/users/profile", {
          currentPassword,
          password: newPassword,
        });
        setProfile(res.data);
        setPasswordChangeMode(false);
        setSuccessMessage("비밀번호가 성공적으로 변경되었습니다.");
        setFormData((prevData: any) => ({
          ...prevData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } catch (error: any) {
        console.error("Error changing password:", error);
        // 비밀번호가 틀린 경우에 대한 처리
        if (error.response && error.response.status === 401) {
          setError("현재 비밀번호가 올바르지 않습니다.");
        } else {
          setError("비밀번호 변경에 실패했습니다.");
        }
      }
      return;
    }

    // 기존 프로필 저장 로직
    const allowedFields = [
      "name",
      "school",
      "password",
      "grade",
      "class",
      "email",
    ];
    const validFormData = Object.fromEntries(
      Object.entries(formData).filter(
        ([key, value]) =>
          allowedFields.includes(key) && value !== null && value !== undefined
      )
    );

    console.log("Valid Form Data:", validFormData);

    try {
      const res = await api.put("/users/profile", validFormData);
      setSchoolName(res.data.school);
      setProfile(res.data);
      setEditMode(false);
      setDialogOpen(false);
      setSuccessMessage("프로필 업데이트에 성공했습니다.");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (
        error.response &&
        error.response.data.error === "Email already in use"
      ) {
        setError("이미 사용 중인 이메일입니다.");
      } else {
        setError("프로필 업데이트에 실패했습니다.");
      }
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete("/users/profile");
      clearAuth();
      window.location.href = "/home";
    } catch (error) {
      setError("프로필 삭제에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    try {
      const userId = getUserId();
      await apiNoAuth.post("/auth/logout", { userId });
      clearAuth();
      window.location.href = "/home";
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const openDialog = (action: () => void, message: string) => {
    setDialogAction(() => action);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setEditMode(false);
    setPasswordChangeMode(false);
    setFormData(originalProfile);
    setFormData((prevData: any) => ({
      ...prevData,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 6, mb: 4 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" gutterBottom>
            내 프로필
          </Typography>
          <IconButton
            sx={{
              color: "#333",
            }}
            onClick={() => openDialog(handleLogout, "로그아웃 하시겠습니까?")}
          >
            <Logout />
          </IconButton>
        </Box>
        {profile ? (
          <div>
            {passwordChangeMode ? (
              // 비밀번호 변경 모드일 때
              <>
                <TextField
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  label="현재 비밀번호"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword || ""}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  label="새 비밀번호"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword || ""}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  label="비밀번호 확인"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword || ""}
                  onChange={handleChange}
                />
              </>
            ) : (
              // 기존 프로필 정보
              <>
                {editMode && (
                  <FormControl fullWidth variant="outlined" margin="normal">
                    <InputLabel>지역(선택 후 학교 검색)</InputLabel>
                    <Select
                      value={formData.educationOffice || ""}
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
                    value={formData.school || ""}
                    onChange={(event, value: School | null) =>
                      setFormData({ ...formData, school: value?.label || "" })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="학교(검색)"
                        variant="outlined"
                        margin="normal"
                      />
                    )}
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
                    value={formData.email || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                )}
                {profile.name && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    label={profile.role === "teacher" ? "닉네임" : "이름"}
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                )}
                {profile.role === "student" && profile.loginId && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    label="아이디"
                    name="loginId"
                    value={formData.loginId || ""}
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
                    value={formData.grade || ""}
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
                    value={formData.class || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                )}
                {profile.role === "student" && profile.studentId && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    label="출석번호"
                    name="studentId"
                    value={formData.studentId || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                )}
              </>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginTop: 2,
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              {editMode || passwordChangeMode ? (
                <>
                  <Button
                    variant="outlined"
                    sx={{
                      color: "#333",
                      borderColor: "#ccc",
                      fontFamily: "Roboto, sans-serif",
                      "&:hover": {
                        borderColor: "#999",
                      },
                    }}
                    onClick={handleCancel}
                  >
                    취소
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: "#4caf50",
                      color: "#fff",
                      fontFamily: "Roboto, sans-serif",
                      "&:hover": {
                        backgroundColor: "#45a049",
                      },
                    }}
                    onClick={() =>
                      openDialog(
                        handleSave,
                        passwordChangeMode
                          ? "비밀번호를 변경하시겠습니까?"
                          : "정보를 수정하시겠습니까?"
                      )
                    }
                  >
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    sx={{
                      backgroundColor: "#ff9800",
                      color: "#fff",
                      fontFamily: "Roboto, sans-serif",
                      "&:hover": {
                        backgroundColor: "#fb8c00",
                      },
                    }}
                    onClick={() => {
                      if (profile.role === "student") {
                        setPasswordChangeMode(true);
                      } else {
                        setEditMode(true);
                      }
                    }}
                  >
                    {profile.role === "student" ? "비밀번호 변경" : "수정"}
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      color: "#f44336",
                      borderColor: "#f44336",
                      fontFamily: "Roboto, sans-serif",
                      "&:hover": {
                        borderColor: "#d32f2f",
                      },
                    }}
                    onClick={() =>
                      openDialog(handleDelete, "계정을 삭제하시겠습니까?")
                    }
                  >
                    계정삭제
                  </Button>
                </>
              )}
            </Box>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>확인</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            취소
          </Button>
          <Button
            onClick={() => {
              dialogAction && dialogAction();
              handleDialogClose();
            }}
            color="primary"
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={2000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={2000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError("")}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;
