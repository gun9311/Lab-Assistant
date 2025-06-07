import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Button,
  TextField,
  InputLabel,
  FormControl,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BadgeIcon from "@mui/icons-material/Badge";
import SchoolIcon from "@mui/icons-material/School";
import ClassIcon from "@mui/icons-material/Class";
import GroupIcon from "@mui/icons-material/Group";
import { UnifiedModalSubmitData, StudentInput } from "./TeacherHomePage";
import api from "../../utils/api";

// 타입 정의
type CreateResult = {
  success: boolean;
  message: string;
  missingNameIndexes?: number[];
};

type UnifiedModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (submitData: UnifiedModalSubmitData) => Promise<CreateResult>;
  school: string | null;
};

type FieldErrors = {
  grade: boolean;
  class: boolean;
  names: boolean[];
  uniqueIdentifier: boolean;
};

const UnifiedModal: React.FC<UnifiedModalProps> = ({
  open,
  onClose,
  onSubmitCreate,
  school,
}) => {
  const [activeTab, setActiveTab] = useState(0); // 0: 계정 생성, 1: 비밀번호 재설정
  const [commonGrade, setCommonGrade] = useState("");
  const [commonClass, setCommonClass] = useState("");
  const [studentId, setStudentId] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const initialStudents: StudentInput[] = Array(15)
    .fill({})
    .map((_, index) => ({
      name: "",
      studentId: (index + 1).toString(),
      loginId: "",
      password: "123",
    }));
  const [students, setStudents] = useState<StudentInput[]>(initialStudents);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    grade: false,
    class: false,
    names: Array(15).fill(false),
    uniqueIdentifier: false,
  });
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState<string>("");
  const [addStudentError, setAddStudentError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // --- 학생 계정 수정 탭 관련 상태 추가 ---
  const [searchLoginId, setSearchLoginId] = useState("");
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editingStudentData, setEditingStudentData] = useState<any>(null);
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState("");

  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [confirmActionType, setConfirmActionType] = useState<
    "resetPassword" | "deleteStudent" | null
  >(null);
  const [confirmActionTargetId, setConfirmActionTargetId] = useState<
    string | null
  >(null);
  const [confirmActionModalOpen, setConfirmActionModalOpen] = useState(false);
  // --- 추가 끝 ---

  const schoolPrefix = school ? school.split("초등학교")[0] : "school";

  useEffect(() => {
    setStudents(
      initialStudents.map((student, index) => {
        const paddedStudentId = (index + 1).toString().padStart(2, "0");
        return {
          ...student,
          studentId: (index + 1).toString(),
          loginId: `${uniqueIdentifier}${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
          password: "123",
        };
      })
    );
  }, [commonGrade, commonClass, schoolPrefix, uniqueIdentifier]);

  const handleStudentChange = (
    index: number,
    field: keyof StudentInput,
    value: string
  ) => {
    const updatedStudents = [...students];
    updatedStudents[index] = { ...updatedStudents[index], [field]: value };
    setStudents(updatedStudents);
  };

  const handleAddStudent = () => {
    if (newStudentId) {
      if (!/^\d+$/.test(newStudentId)) {
        setAddStudentError("숫자만 입력 가능합니다.");
        return;
      }

      if (newStudentId.startsWith("0")) {
        setAddStudentError("0으로 시작할 수 없습니다.");
        return;
      }

      const numId = parseInt(newStudentId, 10);
      if (numId < 1) {
        setAddStudentError("1 이상의 숫자를 입력해주세요.");
        return;
      }

      if (students.some((student) => parseInt(student.studentId) === numId)) {
        setAddStudentError("이미 존재하는 번호입니다.");
        return;
      }

      const paddedStudentId = numId.toString().padStart(2, "0");
      const newStudent: StudentInput = {
        name: "",
        studentId: numId.toString(),
        loginId: `${uniqueIdentifier}${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
        password: "123",
      };
      const updatedStudents = [...students, newStudent].sort(
        (a, b) => parseInt(a.studentId) - parseInt(b.studentId)
      );
      setStudents(updatedStudents);
      setNewStudentId("");
      setAddStudentError("");
      return;
    }

    const maxId = Math.max(
      ...students.map((student) => parseInt(student.studentId || "0", 10))
    );
    const nextId = (maxId + 1).toString();
    const paddedStudentId = nextId.padStart(2, "0");
    const newStudent: StudentInput = {
      name: "",
      studentId: nextId,
      loginId: `${uniqueIdentifier}${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
      password: "123",
    };
    const updatedStudents = [...students, newStudent].sort(
      (a, b) => parseInt(a.studentId) - parseInt(b.studentId)
    );
    setStudents(updatedStudents);
  };

  const handleRemoveStudent = (index: number) => {
    const updatedStudents = students.filter((_, i) => i !== index);
    setStudents(updatedStudents);
  };

  const handleSubmitCreateClick = () => {
    console.log("handleSubmitCreateClick triggered");
    console.log("Current values:", {
      commonGrade,
      commonClass,
      uniqueIdentifier,
    });

    const commonFieldErrors = {
      grade: !commonGrade,
      class: !commonClass,
      uniqueIdentifier: !uniqueIdentifier,
    };
    const commonFieldsValid =
      !commonFieldErrors.grade &&
      !commonFieldErrors.class &&
      !commonFieldErrors.uniqueIdentifier;

    const currentNameErrors = Array(students.length).fill(false);
    let namesValid = true;
    students.forEach((student, index) => {
      if (!student.name.trim()) {
        currentNameErrors[index] = true;
        namesValid = false;
      }
    });

    if (!commonFieldsValid || !namesValid) {
      console.log("Validation failed:", { commonFieldsValid, namesValid });
      setFieldErrors((prev) => ({
        ...prev,
        ...commonFieldErrors,
        names: currentNameErrors,
      }));

      let errorMessage = "";
      if (!commonFieldsValid) {
        errorMessage = "식별코드, 학년, 반을 모두 입력해주세요.";
      } else if (!namesValid) {
        errorMessage = "입력되지 않은 학생 이름이 있습니다.";
      } else {
        errorMessage = "필수 정보를 모두 입력해주세요.";
      }

      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
      return;
    }

    console.log("Validation passed: Opening confirmation modal.");
    setConfirmModalOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    const studentSubmitData: StudentInput[] = students.map((student) => ({
      ...student,
      school: school ?? undefined,
      grade: commonGrade || undefined,
      studentClass: commonClass || undefined,
    }));

    const submitData: UnifiedModalSubmitData = {
      students: studentSubmitData,
      identifier: uniqueIdentifier,
      grade: commonGrade,
      classNum: commonClass,
    };

    try {
      const result = await onSubmitCreate(submitData);

      if (!result.success) {
        if (result.missingNameIndexes) {
          const newNameErrors = Array(students.length).fill(false);
          result.missingNameIndexes.forEach((index) => {
            if (index > 0 && index <= newNameErrors.length) {
              newNameErrors[index - 1] = true;
            }
          });
          setFieldErrors((prev) => ({
            ...prev,
            names: newNameErrors,
          }));
        }
        setSnackbarMessage(result.message);
        setSnackbarOpen(true);
      } else {
        handleResetStudents();
        onClose();
        setConfirmModalOpen(false);
      }
    } catch (e) {
      console.error("Submission failed unexpectedly:", e);
      setSnackbarMessage("계정 생성 중 예기치 못한 오류 발생");
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStudents = () => {
    setStudents(
      Array(15)
        .fill({})
        .map((_, index) => ({
          name: "",
          studentId: (index + 1).toString(),
          loginId: "",
          password: "123",
        }))
    );
    setCommonGrade("");
    setCommonClass("");
    setUniqueIdentifier("");
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(15).fill(false),
      uniqueIdentifier: false,
    });
  };

  const handleGradeChange = (value: string) => {
    setCommonGrade(value);
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(15).fill(false),
      uniqueIdentifier: false,
    });
  };

  const handleClassChange = (value: string) => {
    setCommonClass(value);
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(15).fill(false),
      uniqueIdentifier: false,
    });
  };

  const isRequiredFieldsFilled = uniqueIdentifier && commonGrade && commonClass;

  useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setSearchLoginId("");
      setFoundStudent(null);
      setIsSearching(false);
      setSearchError("");
      setIsEditingStudent(false);
      setEditingStudentData(null);
      setIsUpdatingStudent(false);
      setUpdateError("");
      setIsResettingPassword(false);
      setResetPasswordSuccess(false);
      setResetPasswordError("");
      setIsDeletingStudent(false);
      setDeleteError("");
      setConfirmActionModalOpen(false);
      setConfirmActionType(null);
      setConfirmActionTargetId(null);
      handleResetStudents();
      setStudentId("");
    }
  }, [open]);

  const handleSearchStudent = async () => {
    if (!searchLoginId.trim() || isSearching) return;
    setIsSearching(true);
    setSearchError("");
    setFoundStudent(null);
    setEditingStudentData(null);
    setIsEditingStudent(false);

    try {
      const response = await api.get(
        `/users/teacher/student?loginId=${searchLoginId.trim()}`
      );
      setFoundStudent(response.data);
      setEditingStudentData(response.data);
      setSearchLoginId("");
    } catch (error: any) {
      const message =
        error.response?.data?.error || "학생 검색 중 오류가 발생했습니다.";
      setSearchError(message);
      setFoundStudent(null);
      setEditingStudentData(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditingStudent) {
      setEditingStudentData(foundStudent);
      setUpdateError("");
    } else {
    }
    setIsEditingStudent(!isEditingStudent);
  };

  const handleEditingStudentChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setEditingStudentData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
    if (updateError) setUpdateError("");
  };

  const handleUpdateStudent = async () => {
    if (!editingStudentData || isUpdatingStudent) return;

    if (
      !editingStudentData.name?.trim() ||
      !editingStudentData.studentId?.trim()
    ) {
      setUpdateError("학생 이름과 번호는 필수 항목입니다.");
      return;
    }
    if (
      !/^\d+$/.test(editingStudentData.studentId.trim()) ||
      parseInt(editingStudentData.studentId.trim(), 10) < 1
    ) {
      setUpdateError("학생 번호는 1 이상의 숫자여야 합니다.");
      return;
    }

    setIsUpdatingStudent(true);
    setUpdateError("");

    const payload: { name?: string; studentId?: string } = {};
    if (editingStudentData.name !== foundStudent.name) {
      payload.name = editingStudentData.name.trim();
    }
    if (editingStudentData.studentId !== foundStudent.studentId) {
      payload.studentId = editingStudentData.studentId.trim();
    }

    if (Object.keys(payload).length === 0) {
      setIsEditingStudent(false);
      setIsUpdatingStudent(false);
      setSnackbarMessage("변경된 내용이 없습니다.");
      setSnackbarOpen(true);
      return;
    }

    try {
      const response = await api.put(
        `/users/teacher/student/${foundStudent._id}`,
        payload
      );
      const loginIdWasUpdated = payload.studentId !== undefined;
      setFoundStudent(response.data);
      setEditingStudentData(response.data);
      setIsEditingStudent(false);
      const successMsg = loginIdWasUpdated
        ? "학생 정보 및 로그인 아이디가 성공적으로 수정되었습니다."
        : "학생 정보가 성공적으로 수정되었습니다.";
      setSnackbarMessage(successMsg);
      setSnackbarOpen(true);
    } catch (error: any) {
      const message =
        error.response?.data?.error || "학생 정보 수정 중 오류가 발생했습니다.";
      setUpdateError(message);
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    } finally {
      setIsUpdatingStudent(false);
    }
  };

  const openConfirmModal = (
    type: "resetPassword" | "deleteStudent",
    studentObjectId: string
  ) => {
    setConfirmActionType(type);
    setConfirmActionTargetId(studentObjectId);
    setConfirmActionModalOpen(true);
  };

  const closeConfirmModal = () => {
    if (isResettingPassword || isDeletingStudent) return;
    setConfirmActionModalOpen(false);
    setConfirmActionType(null);
    setConfirmActionTargetId(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmActionType || !confirmActionTargetId) return;

    if (confirmActionType === "resetPassword") {
      await handleResetPasswordConfirm(confirmActionTargetId);
    } else if (confirmActionType === "deleteStudent") {
      await handleDeleteStudentConfirm(confirmActionTargetId);
    }
    closeConfirmModal();
  };

  const handleResetPasswordConfirm = async (studentObjectId: string) => {
    if (isResettingPassword) return;
    setIsResettingPassword(true);
    setResetPasswordError("");
    setResetPasswordSuccess(false);

    try {
      await api.post(
        `/users/teacher/student/${studentObjectId}/reset-password`
      );
      setResetPasswordSuccess(true);
      setSnackbarMessage('학생 비밀번호가 "123"으로 초기화되었습니다.');
      setSnackbarOpen(true);
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        "비밀번호 초기화 중 오류가 발생했습니다.";
      setResetPasswordError(message);
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteStudentConfirm = async (studentObjectId: string) => {
    if (isDeletingStudent) return;
    setIsDeletingStudent(true);
    setDeleteError("");

    try {
      await api.delete(`/users/teacher/student/${studentObjectId}`);
      setFoundStudent(null);
      setEditingStudentData(null);
      setIsEditingStudent(false);
      setSnackbarMessage("학생 계정이 성공적으로 삭제되었습니다.");
      setSnackbarOpen(true);
    } catch (error: any) {
      const message =
        error.response?.data?.error || "학생 계정 삭제 중 오류가 발생했습니다.";
      setDeleteError(message);
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    } finally {
      setIsDeletingStudent(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: 4,
            backgroundColor: "white",
            width: { xs: "90%", sm: "70%", md: "60%" },
            maxWidth: 900,
            maxHeight: "85vh",
            overflowY: "auto",
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => {
              setActiveTab(newValue);
              setSearchLoginId("");
              setFoundStudent(null);
              setIsSearching(false);
              setSearchError("");
              setIsEditingStudent(false);
              setEditingStudentData(null);
              setUpdateError("");
              setResetPasswordError("");
              setDeleteError("");
              setResetPasswordSuccess(false);
            }}
            centered
            textColor="primary"
            indicatorColor="primary"
            sx={{ marginBottom: 3 }}
          >
            <Tab label="학생 계정 생성" />
            <Tab label="학생 계정 수정" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 2,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TextField
                    label="식별코드"
                    value={uniqueIdentifier}
                    onChange={(e) => {
                      setUniqueIdentifier(e.target.value);
                      if (fieldErrors.uniqueIdentifier) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          uniqueIdentifier: false,
                        }));
                      }
                    }}
                    error={fieldErrors.uniqueIdentifier}
                    placeholder="예: 숫자"
                    sx={{ width: 120, marginRight: 2 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip
                            title={
                              <Typography
                                variant="body1"
                                sx={{ fontSize: "1rem" }}
                              >
                                원하는 임의의 식별코드(문자, 숫자, 기호 등)를
                                설정해주세요. 학생 계정의 식별을 목적으로 하며,
                                아이디의 앞부분으로 설정됩니다.
                              </Typography>
                            }
                          >
                            <HelpOutlineIcon />
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl sx={{ minWidth: 100, marginRight: 2 }}>
                    <InputLabel error={fieldErrors.grade}>학년</InputLabel>
                    <Select
                      value={commonGrade}
                      onChange={(e) => handleGradeChange(e.target.value)}
                      label="학년"
                      error={fieldErrors.grade}
                    >
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={2}>2</MenuItem>
                      <MenuItem value={3}>3</MenuItem>
                      <MenuItem value={4}>4</MenuItem>
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={6}>6</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      value={commonClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      error={fieldErrors.class}
                      sx={{ width: 100 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">반</InputAdornment>
                        ),
                      }}
                    />
                    {fieldErrors.class && (
                      <ErrorIcon color="error" sx={{ ml: 1 }} />
                    )}
                  </Box>
                </Box>
                <Box>
                  <Button
                    onClick={handleSubmitCreateClick}
                    variant="contained"
                    color="success"
                    sx={{ marginLeft: 2 }}
                  >
                    생성
                  </Button>
                  <Button
                    onClick={handleResetStudents}
                    variant="outlined"
                    color="secondary"
                    sx={{ marginLeft: 2 }}
                  >
                    초기화
                  </Button>
                </Box>
              </Box>

              <Box sx={{ position: "relative" }}>
                <TableContainer
                  component={Paper}
                  sx={{
                    maxHeight: 400,
                    overflowY: "auto",
                    marginBottom: 2,
                    filter: !isRequiredFieldsFilled ? "blur(2px)" : "none",
                    pointerEvents: !isRequiredFieldsFilled ? "none" : "auto",
                  }}
                >
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">번호</TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            이름
                            <Tooltip
                              title={
                                <Typography sx={{ fontSize: "0.875rem" }}>
                                  개인정보 보호를 위해 실명 대신
                                  <br />
                                  가명 또는 닉네임을 사용해도 좋습니다.
                                </Typography>
                              }
                              arrow
                            >
                              <InfoOutlinedIcon
                                sx={{
                                  fontSize: "1.1rem",
                                  color: "action.active",
                                  cursor: "help",
                                }}
                              />
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell align="center">아이디</TableCell>
                        <TableCell align="center">비밀번호</TableCell>
                        <TableCell align="center">작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student, index) => (
                        <TableRow key={index}>
                          <TableCell align="center">
                            {student.studentId}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              value={student.name}
                              onChange={(e) => {
                                handleStudentChange(
                                  index,
                                  "name",
                                  e.target.value
                                );
                                if (fieldErrors.names[index]) {
                                  const newNameErrors = [...fieldErrors.names];
                                  newNameErrors[index] = false;
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    names: newNameErrors,
                                  }));
                                }
                              }}
                              error={fieldErrors.names[index]}
                              InputProps={{
                                endAdornment: fieldErrors.names[index] && (
                                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                                ),
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {student.loginId}
                          </TableCell>
                          <TableCell align="center">
                            {student.password}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              onClick={() => handleRemoveStudent(index)}
                              color="error"
                            >
                              삭제
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                          borderTop: "2px solid rgba(224, 224, 224, 1)",
                        }}
                      >
                        <TableCell colSpan={5} align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 2,
                              padding: "8px 0",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <TextField
                                size="small"
                                placeholder="번호지정"
                                value={newStudentId}
                                onChange={(e) => {
                                  setNewStudentId(e.target.value);
                                  setAddStudentError("");
                                }}
                                sx={{ width: "115px" }}
                                error={!!addStudentError}
                                helperText={addStudentError}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Tooltip
                                        title={
                                          <Typography
                                            sx={{ fontSize: "0.875rem" }}
                                          >
                                            비워두면 순차적인 번호가 부여됩니다
                                            또는 직접 번호를 입력하세요
                                          </Typography>
                                        }
                                      >
                                        <HelpOutlineIcon
                                          sx={{
                                            fontSize: "1.2rem",
                                            color: "action.active",
                                          }}
                                        />
                                      </Tooltip>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Box>
                            <Button
                              variant="contained"
                              onClick={handleAddStudent}
                              startIcon={<AddIcon />}
                              size="small"
                              sx={{
                                backgroundColor: "primary.light",
                                "&:hover": {
                                  backgroundColor: "primary.main",
                                },
                              }}
                            >
                              학생 추가
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {!isRequiredFieldsFilled && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingTop: "10vh",
                      background: "rgba(255, 255, 255, 0.3)",
                      backdropFilter: "blur(8px)",
                      zIndex: 1,
                      borderRadius: 2,
                      gap: 3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                        maxWidth: "90%",
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          color: "text.primary",
                          textAlign: "center",
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}
                      >
                        계정 생성을 위해
                        <br />
                        먼저 다음 정보를 입력해주세요
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 3,
                          flexWrap: "wrap",
                          justifyContent: "center",
                          padding: "24px 32px",
                          borderRadius: 3,
                          background: "rgba(0, 0, 0, 0.03)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            padding: "12px 20px",
                            borderRadius: 2,
                            backgroundColor: !uniqueIdentifier
                              ? "error.lighter"
                              : "success.lighter",
                            color: !uniqueIdentifier
                              ? "error.dark"
                              : "success.dark",
                            transition: "all 0.2s ease",
                            fontSize: "1rem",
                            fontWeight: 500,
                          }}
                        >
                          {!uniqueIdentifier ? "⚠️" : "✓"} 식별코드
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            padding: "12px 20px",
                            borderRadius: 2,
                            backgroundColor: !commonGrade
                              ? "error.lighter"
                              : "success.lighter",
                            color: !commonGrade ? "error.dark" : "success.dark",
                            transition: "all 0.2s ease",
                            fontSize: "1rem",
                            fontWeight: 500,
                          }}
                        >
                          {!commonGrade ? "⚠️" : "✓"} 학년
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            padding: "12px 20px",
                            borderRadius: 2,
                            backgroundColor: !commonClass
                              ? "error.lighter"
                              : "success.lighter",
                            color: !commonClass ? "error.dark" : "success.dark",
                            transition: "all 0.2s ease",
                            fontSize: "1rem",
                            fontWeight: 500,
                          }}
                        >
                          {!commonClass ? "⚠️" : "✓"} 반
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{ display: "flex", gap: 1, mb: 3, alignItems: "center" }}
              >
                <TextField
                  fullWidth
                  label="수정할 학생 아이디 검색"
                  variant="outlined"
                  size="small"
                  value={searchLoginId}
                  onChange={(e) => setSearchLoginId(e.target.value)}
                  disabled={isSearching}
                  error={!!searchError}
                  helperText={searchError}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !isSearching &&
                      searchLoginId.trim()
                    ) {
                      e.preventDefault();
                      handleSearchStudent();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchStudent}
                  disabled={isSearching || !searchLoginId.trim()}
                  startIcon={
                    isSearching ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : null
                  }
                >
                  검색
                </Button>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 3,
                  color: "text.secondary",
                  bgcolor: "grey.100",
                  p: 1.5,
                  borderRadius: 1,
                }}
              >
                <InfoOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  학생 비밀번호를 분실 시, 여기서 아이디 검색 후
                  '비밀번호 초기화' 버튼을 눌러 초기 비밀번호("123")로 재설정할
                  수 있습니다.
                </Typography>
              </Box>

              {foundStudent ? (
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ mb: 2, fontWeight: "bold" }}
                  >
                    학생 정보
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <TextField
                      label="아이디"
                      value={foundStudent.loginId}
                      disabled
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                    <TextField
                      label="학교"
                      value={foundStudent.school}
                      disabled
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                    <TextField
                      label="학년"
                      value={foundStudent.grade + "학년"}
                      disabled
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                    <TextField
                      label="반"
                      value={foundStudent.class + "반"}
                      disabled
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />

                    <TextField
                      label="이름"
                      name="name"
                      value={
                        isEditingStudent
                          ? editingStudentData.name
                          : foundStudent.name
                      }
                      onChange={handleEditingStudentChange}
                      disabled={!isEditingStudent || isUpdatingStudent}
                      InputProps={{ readOnly: !isEditingStudent }}
                      variant={isEditingStudent ? "outlined" : "filled"}
                      size="small"
                      error={!!updateError && updateError.includes("이름")}
                    />
                    <Tooltip
                      title={
                        isEditingStudent ? (
                          <Typography sx={{ fontSize: "0.875rem" }}>
                            번호를 변경하면 로그인 아이디(loginId)도
                            <br />
                            자동으로 변경됩니다.
                          </Typography>
                        ) : (
                          ""
                        )
                      }
                      arrow
                      placement="top"
                      disableHoverListener={!isEditingStudent}
                      disableFocusListener={!isEditingStudent}
                      disableTouchListener={!isEditingStudent}
                    >
                      <TextField
                        label="번호"
                        name="studentId"
                        value={
                          isEditingStudent
                            ? editingStudentData.studentId
                            : foundStudent.studentId
                        }
                        onChange={handleEditingStudentChange}
                        disabled={!isEditingStudent || isUpdatingStudent}
                        InputProps={{ readOnly: !isEditingStudent }}
                        variant={isEditingStudent ? "outlined" : "filled"}
                        type="number"
                        size="small"
                        error={
                          !!updateError &&
                          (updateError.includes("번호") ||
                            updateError.includes("아이디"))
                        }
                        helperText={
                          updateError &&
                          (updateError.includes("번호") ||
                            updateError.includes("아이디"))
                            ? updateError
                            : ""
                        }
                      />
                    </Tooltip>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {isEditingStudent ? (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleUpdateStudent}
                            disabled={isUpdatingStudent}
                            startIcon={
                              isUpdatingStudent ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : null
                            }
                          >
                            저장
                          </Button>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={handleEditToggle}
                            disabled={isUpdatingStudent}
                          >
                            취소
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={handleEditToggle}
                        >
                          정보 수정
                        </Button>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() =>
                          openConfirmModal("resetPassword", foundStudent._id)
                        }
                        disabled={
                          isResettingPassword ||
                          isDeletingStudent ||
                          isEditingStudent
                        }
                        startIcon={
                          isResettingPassword ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : null
                        }
                      >
                        비밀번호 초기화
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() =>
                          openConfirmModal("deleteStudent", foundStudent._id)
                        }
                        disabled={
                          isDeletingStudent ||
                          isResettingPassword ||
                          isEditingStudent
                        }
                        startIcon={
                          isDeletingStudent ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : null
                        }
                      >
                        계정 삭제
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ) : (
                !isSearching && (
                  <Typography
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 4 }}
                  >
                    검색 결과가 없습니다.
                  </Typography>
                )
              )}
            </Box>
          )}

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity={
                snackbarMessage.includes("성공") ||
                snackbarMessage.includes("초기화") ||
                snackbarMessage.includes("삭제")
                  ? "success"
                  : snackbarMessage.includes("없습")
                  ? "info"
                  : "error"
              }
              variant="filled"
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Modal>

      <Modal
        open={confirmModalOpen}
        onClose={() => !isSubmitting && setConfirmModalOpen(false)}
        aria-labelledby="create-confirm-modal-title"
        aria-describedby="create-confirm-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: { xs: "90%", sm: 450 },
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) {
              handleConfirmedSubmit();
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <InfoOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography
              id="create-confirm-modal-title"
              variant="h6"
              component="h2"
            >
              계정 생성 확인
            </Typography>
          </Box>
          <Typography id="create-confirm-modal-description" sx={{ mb: 3 }}>
            아래 정보로 학생 계정을 생성하시겠습니까?
          </Typography>
          <List
            dense
            sx={{ mb: 3, bgcolor: "grey.50", borderRadius: 1, p: 1.5 }}
          >
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <BadgeIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="식별코드"
                secondary={uniqueIdentifier || "-"}
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SchoolIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="학년"
                secondary={`${commonGrade || "-"}학년`}
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <ClassIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="반"
                secondary={`${commonClass || "-"}반`}
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="학생 수"
                secondary={`${students.filter((s) => s.name).length}명`}
              />
            </ListItem>
          </List>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => setConfirmModalOpen(false)}
              variant="text"
              color="inherit"
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isSubmitting ? "생성 중..." : "확인 및 생성"}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={confirmActionModalOpen}
        onClose={closeConfirmModal}
        aria-labelledby="action-confirm-modal-title"
        aria-describedby="action-confirm-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            width: { xs: "90%", sm: 400 },
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !(isResettingPassword || isDeletingStudent)
            ) {
              handleConfirmAction();
            }
          }}
        >
          <Typography
            id="action-confirm-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2, fontWeight: "bold" }}
          >
            {confirmActionType === "resetPassword"
              ? "비밀번호 초기화 확인"
              : "계정 삭제 확인"}
          </Typography>
          <Typography id="action-confirm-modal-description" sx={{ mb: 3 }}>
            {confirmActionType === "resetPassword"
              ? `정말로 ${
                  foundStudent?.name || "해당"
                } 학생의 비밀번호를 "123"으로 초기화하시겠습니까?`
              : `정말로 ${
                  foundStudent?.name || "해당"
                } 학생의 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={closeConfirmModal}
              variant="text"
              color="inherit"
              disabled={isResettingPassword || isDeletingStudent}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant="contained"
              color={
                confirmActionType === "resetPassword" ? "warning" : "error"
              }
              disabled={isResettingPassword || isDeletingStudent}
              startIcon={
                isResettingPassword || isDeletingStudent ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {confirmActionType === "resetPassword"
                ? isResettingPassword
                  ? "초기화 중..."
                  : "초기화"
                : isDeletingStudent
                ? "삭제 중..."
                : "삭제"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default UnifiedModal;
