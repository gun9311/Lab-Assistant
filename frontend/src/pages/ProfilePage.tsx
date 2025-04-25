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
  CircularProgress,
  FormHelperText,
  Divider,
  Stack,
  Tooltip,
} from "@mui/material";
import { Logout, Edit, LockReset, Delete } from "@mui/icons-material";
import { educationOffices } from "../educationOffices";
import api from "../utils/api";
import { clearAuth, getUserId, setSchoolName } from "../utils/auth";
import { SelectChangeEvent } from "@mui/material/Select";
import apiNoAuth from "../utils/apiNoAuth";

interface School {
  label: string;
  code: string;
}

// 이메일 유효성 검사 함수 추가
const validateEmail = (email: string) => {
  if (!email) return true; // 비어있는 경우는 필수가 아니므로 유효 처리 (백엔드에서 최종 확인)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [passwordChangeMode, setPasswordChangeMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<
    null | (() => Promise<void>)
  >(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [originalProfile, setOriginalProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
      setError("학교 정보를 불러오는 중 오류가 발생했습니다.");
    }
  };

  const handleEducationOfficeChange = (event: SelectChangeEvent<any>) => {
    const selectedEducationOffice = event.target.value;
    setFormData({
      ...formData,
      educationOffice: selectedEducationOffice,
      school: "",
    });
    fetchSchools(selectedEducationOffice);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));

    if (error) setError("");

    if (name === "email") {
      const isValid = validateEmail(value);
      setEmailError(!isValid);
      if (error && error.includes("이메일")) setError("");
    }

    if (name === "newPassword") {
      setPasswordMatchError(
        value !== formData.confirmPassword && formData.confirmPassword !== ""
      );
      if (error && error.includes("비밀번호")) setError("");
    }
    if (name === "currentPassword" && error.includes("현재 비밀번호")) {
      setError("");
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, confirmPassword: value }));
    setPasswordMatchError(formData.newPassword !== value && value !== "");
    if (error) setError("");
  };

  const handleSchoolChange = (value: School | null) => {
    setFormData((prevData: any) => ({
      ...prevData,
      school: value?.label || "",
    }));
    if (error) setError("");
  };

  const handleSave = async () => {
    setError("");
    setPasswordMatchError(false);
    setEmailError(false);

    if (
      editMode &&
      profile.role === "teacher" &&
      !validateEmail(formData.email)
    ) {
      setError("유효한 이메일 형식을 입력해주세요.");
      setEmailError(true);
      return;
    }
    if (passwordChangeMode) {
      const { currentPassword, newPassword, confirmPassword } = formData;
      if (!currentPassword || !newPassword) {
        setError("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        setPasswordMatchError(true);
        return;
      }
    }

    if (isLoading) return;
    setIsLoading(true);
    setSuccessMessage("");

    if (passwordChangeMode) {
      try {
        const res = await api.put("/users/profile", {
          currentPassword: formData.currentPassword,
          password: formData.newPassword,
        });
        setProfile(res.data);
        setOriginalProfile(res.data);
        setPasswordChangeMode(false);
        setSuccessMessage("비밀번호가 성공적으로 변경되었습니다.");
        setFormData((prevData: any) => ({
          ...prevData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error ===
          "The current password you entered is incorrect."
            ? "현재 비밀번호가 올바르지 않습니다."
            : error.response?.data?.error || "비밀번호 변경에 실패했습니다.";
        setError(errorMessage);
        console.error("Error changing password:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const updatePayload: any = {};
    if (profile?.role === "teacher") {
      if (formData.name !== originalProfile?.name)
        updatePayload.name = formData.name;
      if (formData.school !== originalProfile?.school)
        updatePayload.school = formData.school;
      if (formData.email !== originalProfile?.email)
        updatePayload.email = formData.email;
    } else if (profile?.role === "student") {
      // 학생은 현재 UI상 비밀번호 외 수정 불가 (필요 시 추가)
    }
    if (Object.keys(updatePayload).length === 0) {
      setEditMode(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.put("/users/profile", updatePayload);
      setSchoolName(res.data.school);
      setProfile(res.data);
      setOriginalProfile(res.data);
      setEditMode(false);
      setSuccessMessage("프로필 업데이트에 성공했습니다.");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ===
        "This email address is already in use by another account."
          ? "이미 사용 중인 이메일입니다."
          : error.response?.data?.error || "프로필 업데이트에 실패했습니다.";
      setError(errorMessage);
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.delete("/users/profile");
      clearAuth();
      window.location.href = "/home";
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "프로필 삭제에 실패했습니다.";
      setError(errorMessage);
      console.error("Profile deletion failed:", error);
    }
  };

  const handleLogout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const userId = getUserId();
      await apiNoAuth.post("/auth/logout", { userId });
      clearAuth();
      window.location.href = "/home";
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to log out";
      setError(errorMessage);
      console.error("Failed to log out:", error);
    }
  };

  const openDialog = (action: () => Promise<void>, message: string) => {
    setDialogAction(() => action);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleDialogConfirm = async () => {
    if (dialogAction && !isLoading) {
      await dialogAction();
    }
    if (
      !isLoading ||
      (dialogAction !== handleDelete && dialogAction !== handleLogout)
    ) {
      setDialogOpen(false);
    }
  };

  const handleDialogClose = () => {
    if (!isLoading) {
      setDialogOpen(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    setEditMode(false);
    setPasswordChangeMode(false);
    setFormData(originalProfile);
    setError("");
    setEmailError(false);
    setPasswordMatchError(false);
    setFormData((prevData: any) => ({
      ...prevData,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{ mt: { xs: 4, sm: 6 }, mb: 4 }}
    >
      <Paper
        elevation={3}
        sx={{ padding: { xs: 2, sm: 4 }, borderRadius: "12px" }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
            내 프로필
          </Typography>
          <Tooltip title="로그아웃">
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => openDialog(handleLogout, "로그아웃 하시겠습니까?")}
              disabled={isLoading}
            >
              <Logout />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {isLoading && !profile ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : profile ? (
          <Stack spacing={3}>
            {passwordChangeMode ? (
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  비밀번호 변경
                </Typography>
                <TextField
                  fullWidth
                  variant="filled"
                  margin="normal"
                  label="현재 비밀번호"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword || ""}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
                <TextField
                  fullWidth
                  variant="filled"
                  margin="normal"
                  label="새 비밀번호"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword || ""}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
                <TextField
                  fullWidth
                  variant="filled"
                  margin="normal"
                  label="비밀번호 확인"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword || ""}
                  onChange={handleConfirmPasswordChange}
                  error={passwordMatchError}
                  helperText={
                    passwordMatchError ? "비밀번호가 일치하지 않습니다." : ""
                  }
                  disabled={isLoading}
                  required
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                {profile.role === "teacher" && (
                  <>
                    {editMode ? (
                      <Stack spacing={2}>
                        <FormControl
                          fullWidth
                          variant="filled"
                          disabled={isLoading}
                        >
                          <InputLabel>지역(선택 후 학교 검색)</InputLabel>
                          <Select
                            value={formData.educationOffice || ""}
                            onChange={handleEducationOfficeChange}
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
                          value={
                            schools.find((s) => s.label === formData.school) ||
                            null
                          }
                          onChange={(event, value: School | null) =>
                            handleSchoolChange(value)
                          }
                          getOptionLabel={(option) => option.label}
                          isOptionEqualToValue={(option, value) =>
                            option.code === value?.code
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="학교(검색)"
                              variant="filled"
                            />
                          )}
                          disabled={isLoading}
                        />
                      </Stack>
                    ) : (
                      <TextField
                        fullWidth
                        label="학교"
                        name="school"
                        value={formData.school || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                    <TextField
                      fullWidth
                      label="이메일"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      error={emailError}
                      helperText={
                        emailError ? "유효한 이메일 형식을 입력해주세요." : ""
                      }
                      disabled={isLoading || !editMode}
                      variant="filled"
                      InputProps={{ readOnly: !editMode }}
                    />
                  </>
                )}
                <TextField
                  fullWidth
                  label={profile.role === "teacher" ? "닉네임" : "이름"}
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  disabled={
                    isLoading || !editMode || profile.role === "student"
                  }
                  variant="filled"
                  InputProps={{
                    readOnly: !editMode || profile.role === "student",
                  }}
                />
                {profile.role === "student" && (
                  <>
                    {profile.loginId && (
                      <TextField
                        fullWidth
                        label="아이디"
                        name="loginId"
                        value={formData.loginId || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                    {profile.grade !== undefined && (
                      <TextField
                        fullWidth
                        label="학년"
                        name="grade"
                        value={formData.grade || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                    {profile.class !== undefined && (
                      <TextField
                        fullWidth
                        label="반"
                        name="class"
                        value={formData.class || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                    {profile.studentId && (
                      <TextField
                        fullWidth
                        label="출석번호"
                        name="studentId"
                        value={formData.studentId || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                    {!editMode && (
                      <TextField
                        fullWidth
                        label="학교"
                        name="school"
                        value={formData.school || ""}
                        disabled
                        InputProps={{ readOnly: true }}
                        variant="filled"
                      />
                    )}
                  </>
                )}
              </Stack>
            )}

            <Divider sx={{ pt: 1 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1.5,
                pt: 1,
              }}
            >
              {editMode || passwordChangeMode ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isLoading}
                    color="secondary"
                    sx={{ borderRadius: "8px" }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() =>
                      openDialog(
                        handleSave,
                        passwordChangeMode
                          ? "비밀번호를 변경하시겠습니까?"
                          : "정보를 수정하시겠습니까?"
                      )
                    }
                    disabled={
                      isLoading ||
                      (editMode && emailError) ||
                      (passwordChangeMode &&
                        (!formData.currentPassword ||
                          !formData.newPassword ||
                          !formData.confirmPassword ||
                          passwordMatchError))
                    }
                    color="primary"
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : null
                    }
                    sx={{ borderRadius: "8px" }}
                  >
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() =>
                      openDialog(
                        handleDelete,
                        "정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                      )
                    }
                    disabled={isLoading}
                    sx={{ borderRadius: "8px", mr: "auto" }}
                  >
                    계정 삭제
                  </Button>
                  {profile.role === "teacher" && (
                    <>
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setEditMode(true)}
                        disabled={isLoading}
                        color="primary"
                        sx={{ borderRadius: "8px" }}
                      >
                        프로필 수정
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<LockReset />}
                        onClick={() => setPasswordChangeMode(true)}
                        disabled={isLoading}
                        color="secondary"
                        sx={{ borderRadius: "8px" }}
                      >
                        비밀번호 변경
                      </Button>
                    </>
                  )}
                  {profile.role === "student" && (
                    <Button
                      variant="contained"
                      startIcon={<LockReset />}
                      onClick={() => setPasswordChangeMode(true)}
                      disabled={isLoading}
                      color="primary"
                      sx={{ borderRadius: "8px" }}
                    >
                      비밀번호 변경
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Stack>
        ) : (
          <Typography color="error" sx={{ textAlign: "center", mt: 4 }}>
            프로필 정보를 불러오지 못했습니다.
          </Typography>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">확인</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2 }}>
          <Button
            onClick={handleDialogClose}
            disabled={isLoading}
            color="secondary"
          >
            {" "}
            취소{" "}
          </Button>
          <Button
            onClick={handleDialogConfirm}
            color="primary"
            variant="contained"
            disabled={isLoading}
            startIcon={
              isLoading ? <CircularProgress size={20} color="inherit" /> : null
            }
            autoFocus
          >
            {isLoading ? "처리 중..." : "확인"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {successMessage}
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
    </Container>
  );
};

export default ProfilePage;
