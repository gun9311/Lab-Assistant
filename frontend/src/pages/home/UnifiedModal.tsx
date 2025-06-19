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
  Stack,
  IconButton,
  Checkbox,
} from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BadgeIcon from "@mui/icons-material/Badge";
import SchoolIcon from "@mui/icons-material/School";
import ClassIcon from "@mui/icons-material/Class";
import GroupIcon from "@mui/icons-material/Group";
import EditIcon from "@mui/icons-material/Edit";
import LockResetIcon from "@mui/icons-material/LockReset";
import DeleteIcon from "@mui/icons-material/Delete";
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
  const [activeTab, setActiveTab] = useState(0); // 0: 계정 생성, 1: 계정 관리
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

  // --- 학생 계정 관리 탭 관련 상태 ---
  const [managementIdentifier, setManagementIdentifier] = useState("");
  const [managementGrade, setManagementGrade] = useState("");
  const [managementClassNum, setManagementClassNum] = useState("");
  const [isSearchingManaged, setIsSearchingManaged] = useState(false);
  const [managedStudents, setManagedStudents] = useState<any[]>([]);
  const [searchError, setSearchError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentStudentForEdit, setCurrentStudentForEdit] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [confirmActionModal, setConfirmActionModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText: string;
    color: "warning" | "error";
    isLoading: boolean;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
    confirmText: "",
    color: "error",
    isLoading: false,
  });

  // --- 일괄 관리용 상태 추가 ---
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateType, setBulkUpdateType] = useState<"class" | "identifier">(
    "class"
  );
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // ---

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
      // 공통 초기화
      setActiveTab(0);
      setSnackbarMessage("");

      // 계정 생성 탭 초기화
      handleResetStudents();

      // 계정 관리 탭 초기화
      setManagementIdentifier("");
      setManagementGrade("");
      setManagementClassNum("");
      setManagedStudents([]);
      setIsSearchingManaged(false);
      setSearchError("");
      setSelectedStudentIds([]); // 선택 초기화

      // 수정/확인 모달 초기화
      setEditModalOpen(false);
      setCurrentStudentForEdit(null);
      setConfirmActionModal({ ...confirmActionModal, open: false });
    }
  }, [open]);

  // --- 계정 관리 탭 핸들러 ---
  const handleSearchManagedStudents = async () => {
    if (
      !managementIdentifier.trim() ||
      !managementGrade ||
      !managementClassNum.trim()
    ) {
      setSearchError("식별코드, 학년, 반을 모두 입력해주세요.");
      return;
    }
    setIsSearchingManaged(true);
    setSearchError("");
    setManagedStudents([]);
    setSelectedStudentIds([]); // 검색 결과 변경 시 선택 초기화
    try {
      const res = await api.get("/users/teacher/students", {
        params: {
          school,
          grade: managementGrade,
          class: managementClassNum,
          uniqueIdentifier: managementIdentifier,
        },
      });
      setManagedStudents(res.data);
      if (res.data.length === 0) {
        setSearchError("해당 조건의 학생이 없습니다.");
      }
    } catch (error: any) {
      setSearchError("학생 정보 조회 중 오류가 발생했습니다.");
    } finally {
      setIsSearchingManaged(false);
    }
  };

  const handleOpenEditModal = (student: any) => {
    setCurrentStudentForEdit({ ...student });
    setUpdateError("");
    setEditModalOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!currentStudentForEdit || isUpdating) return;
    const { _id, name, studentId } = currentStudentForEdit;

    if (!name?.trim() || !studentId?.toString().trim()) {
      setUpdateError("이름과 번호는 필수 항목입니다.");
      return;
    }
    setIsUpdating(true);
    setUpdateError("");
    try {
      const res = await api.put(`/users/teacher/student/${_id}`, {
        name,
        studentId,
      });
      // 목록 업데이트
      setManagedStudents((prev) =>
        prev.map((s) => (s._id === _id ? res.data : s))
      );
      setEditModalOpen(false);
      setSnackbarMessage("학생 정보가 수정되었습니다.");
      setSnackbarOpen(true);
    } catch (err: any) {
      setUpdateError(
        err.response?.data?.error || "수정 중 오류가 발생했습니다."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenConfirmResetPassword = (student: any) => {
    setConfirmActionModal({
      open: true,
      title: "비밀번호 초기화 확인",
      description: `정말로 ${student.name} 학생의 비밀번호를 "123"으로 초기화하시겠습니까?`,
      confirmText: "초기화",
      color: "warning",
      isLoading: false,
      onConfirm: () => handleResetPassword(student._id),
    });
  };

  const handleResetPassword = async (studentId: string) => {
    setConfirmActionModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.post(`/users/teacher/student/${studentId}/reset-password`);
      setSnackbarMessage("비밀번호가 성공적으로 초기화되었습니다.");
      setSnackbarOpen(true);
      setConfirmActionModal({ ...confirmActionModal, open: false });
    } catch (err) {
      setSnackbarMessage("비밀번호 초기화 중 오류가 발생했습니다.");
      setSnackbarOpen(true);
    } finally {
      setConfirmActionModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleOpenConfirmDelete = (student: any) => {
    setConfirmActionModal({
      open: true,
      title: "계정 삭제 확인",
      description: `정말로 ${student.name} 학생의 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: "삭제",
      color: "error",
      isLoading: false,
      onConfirm: () => handleDeleteStudent(student._id),
    });
  };

  const handleDeleteStudent = async (studentId: string) => {
    setConfirmActionModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await api.delete(`/users/teacher/student/${studentId}`);
      setManagedStudents((prev) => prev.filter((s) => s._id !== studentId));
      setSnackbarMessage("학생 계정이 삭제되었습니다.");
      setSnackbarOpen(true);
      setConfirmActionModal({ ...confirmActionModal, open: false });
    } catch (err) {
      setSnackbarMessage("계정 삭제 중 오류가 발생했습니다.");
      setSnackbarOpen(true);
    } finally {
      setConfirmActionModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // --- 일괄 처리 핸들러 추가 ---
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = managedStudents.map((s) => s._id);
      setSelectedStudentIds(newSelectedIds);
      return;
    }
    setSelectedStudentIds([]);
  };

  const handleSelectOneClick = (
    event: React.ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const selectedIndex = selectedStudentIds.indexOf(id);
    let newSelectedStudentIds: string[] = [];

    if (selectedIndex === -1) {
      newSelectedStudentIds = newSelectedStudentIds.concat(
        selectedStudentIds,
        id
      );
    } else if (selectedIndex === 0) {
      newSelectedStudentIds = newSelectedStudentIds.concat(
        selectedStudentIds.slice(1)
      );
    } else if (selectedIndex === selectedStudentIds.length - 1) {
      newSelectedStudentIds = newSelectedStudentIds.concat(
        selectedStudentIds.slice(0, -1)
      );
    } else if (selectedIndex > 0) {
      newSelectedStudentIds = newSelectedStudentIds.concat(
        selectedStudentIds.slice(0, selectedIndex),
        selectedStudentIds.slice(selectedIndex + 1)
      );
    }
    setSelectedStudentIds(newSelectedStudentIds);
  };

  const isSelected = (id: string) => selectedStudentIds.indexOf(id) !== -1;

  const handleOpenBulkUpdateModal = (type: "class" | "identifier") => {
    setBulkUpdateType(type);
    setBulkUpdateValue("");
    setBulkUpdateModalOpen(true);
  };

  const handleConfirmBulkUpdate = async () => {
    if (!bulkUpdateValue.trim()) {
      setSnackbarMessage("변경할 값을 입력해주세요.");
      setSnackbarOpen(true);
      return;
    }
    setIsBulkUpdating(true);
    try {
      const payload = {
        currentIdentifier: managementIdentifier,
        currentGrade: managementGrade,
        currentClassNum: managementClassNum,
        newIdentifier: bulkUpdateType === "identifier" ? bulkUpdateValue : null,
        newClassNum: bulkUpdateType === "class" ? bulkUpdateValue : null,
      };
      const res = await api.post(
        "/users/teacher/students/bulk-update-info",
        payload
      );
      setSnackbarMessage(res.data.message || "정보가 일괄 변경되었습니다.");
      setSnackbarOpen(true);
      setBulkUpdateModalOpen(false);
      // 변경 후 학생 목록 새로고침
      await handleSearchManagedStudents();
    } catch (err: any) {
      setSnackbarMessage(
        err.response?.data?.error || "일괄 변경 중 오류가 발생했습니다."
      );
      setSnackbarOpen(true);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleOpenBulkResetConfirm = () => {
    setConfirmActionModal({
      open: true,
      title: "일괄 비밀번호 초기화",
      description: `선택된 ${selectedStudentIds.length}명 학생의 비밀번호를 "123"으로 초기화하시겠습니까?`,
      confirmText: "초기화",
      color: "warning",
      isLoading: false,
      onConfirm: handleConfirmBulkReset,
    });
  };

  const handleConfirmBulkReset = async () => {
    setConfirmActionModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await api.post(
        "/users/teacher/students/bulk-reset-password",
        { studentIds: selectedStudentIds }
      );
      setSnackbarMessage(
        res.data.message || "비밀번호가 일괄 초기화되었습니다."
      );
      setSnackbarOpen(true);
      setConfirmActionModal({ ...confirmActionModal, open: false });
      setSelectedStudentIds([]); // 작업 후 선택 해제
    } catch (err: any) {
      setSnackbarMessage(
        err.response?.data?.error || "일괄 초기화 중 오류가 발생했습니다."
      );
      setSnackbarOpen(true);
    } finally {
      setConfirmActionModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleOpenBulkDeleteConfirm = () => {
    setConfirmActionModal({
      open: true,
      title: "일괄 계정 삭제",
      description: `선택된 ${selectedStudentIds.length}명 학생의 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: "삭제",
      color: "error",
      isLoading: false,
      onConfirm: handleConfirmBulkDelete,
    });
  };

  const handleConfirmBulkDelete = async () => {
    setConfirmActionModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await api.post("/users/teacher/students/bulk-delete", {
        studentIds: selectedStudentIds,
      });
      setSnackbarMessage(res.data.message || "계정이 일괄 삭제되었습니다.");
      setSnackbarOpen(true);
      setConfirmActionModal({ ...confirmActionModal, open: false });
      // 삭제 후 학생 목록 새로고침
      await handleSearchManagedStudents();
    } catch (err: any) {
      setSnackbarMessage(
        err.response?.data?.error || "일괄 삭제 중 오류가 발생했습니다."
      );
      setSnackbarOpen(true);
    } finally {
      setConfirmActionModal((prev) => ({ ...prev, isLoading: false }));
    }
  };
  // ---

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
            onChange={(e, newValue) => setActiveTab(newValue)}
            centered
            textColor="primary"
            indicatorColor="primary"
            sx={{ marginBottom: 3 }}
          >
            <Tab label="학생 계정 생성" />
            <Tab label="학생 계정 관리" />
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
            <Box>
              <Paper
                elevation={0}
                sx={{ p: 2, mb: 2, bgcolor: "grey.100", borderRadius: 1 }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <TextField
                    label="식별코드"
                    size="small"
                    value={managementIdentifier}
                    onChange={(e) => setManagementIdentifier(e.target.value)}
                  />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>학년</InputLabel>
                    <Select
                      value={managementGrade}
                      label="학년"
                      onChange={(e) => setManagementGrade(e.target.value)}
                    >
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={2}>2</MenuItem>
                      <MenuItem value={3}>3</MenuItem>
                      <MenuItem value={4}>4</MenuItem>
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={6}>6</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="반"
                    size="small"
                    sx={{ width: 100 }}
                    value={managementClassNum}
                    onChange={(e) => setManagementClassNum(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSearchManagedStudents}
                    disabled={isSearchingManaged}
                    startIcon={
                      isSearchingManaged && (
                        <CircularProgress size={20} color="inherit" />
                      )
                    }
                  >
                    조회
                  </Button>
                </Stack>
                {managedStudents.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: 1,
                      borderColor: "grey.300",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ alignSelf: "center", mr: 1 }}
                    >
                      일괄 변경:
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenBulkUpdateModal("identifier")}
                    >
                      식별코드 변경
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenBulkUpdateModal("class")}
                    >
                      반 변경
                    </Button>
                  </Stack>
                )}
                {searchError && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {searchError}
                  </Alert>
                )}
              </Paper>

              {managedStudents.length > 0 && (
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    mb: 2,
                    bgcolor:
                      selectedStudentIds.length > 0
                        ? "primary.lighter"
                        : "grey.100",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background-color 0.3s",
                  }}
                >
                  <Typography variant="subtitle1">
                    {selectedStudentIds.length > 0
                      ? `${selectedStudentIds.length}명 선택됨`
                      : "일괄 작업을 위해 학생을 선택하세요."}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip
                      title={
                        selectedStudentIds.length === 0
                          ? "먼저 학생을 선택해주세요."
                          : ""
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          color="warning"
                          variant="contained"
                          startIcon={<LockResetIcon />}
                          onClick={handleOpenBulkResetConfirm}
                          disabled={selectedStudentIds.length === 0}
                        >
                          비밀번호 초기화
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        selectedStudentIds.length === 0
                          ? "먼저 학생을 선택해주세요."
                          : ""
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          startIcon={<DeleteIcon />}
                          onClick={handleOpenBulkDeleteConfirm}
                          disabled={selectedStudentIds.length === 0}
                        >
                          삭제
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              )}

              <TableContainer
                component={Paper}
                sx={{ maxHeight: 450, overflowY: "auto" }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          indeterminate={
                            selectedStudentIds.length > 0 &&
                            selectedStudentIds.length < managedStudents.length
                          }
                          checked={
                            managedStudents.length > 0 &&
                            selectedStudentIds.length === managedStudents.length
                          }
                          onChange={handleSelectAllClick}
                          inputProps={{
                            "aria-label": "select all students",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">번호</TableCell>
                      <TableCell>이름</TableCell>
                      <TableCell>아이디</TableCell>
                      <TableCell align="center">개별 관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managedStudents.map((student) => {
                      const isItemSelected = isSelected(student._id);
                      return (
                        <TableRow
                          hover
                          onClick={(event) =>
                            handleSelectOneClick(event as any, student._id)
                          }
                          role="checkbox"
                          aria-checked={isItemSelected}
                          tabIndex={-1}
                          key={student._id}
                          selected={isItemSelected}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="primary"
                              checked={isItemSelected}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {student.studentId}
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.loginId}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="수정">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(student);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="비밀번호 초기화">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenConfirmResetPassword(student);
                                }}
                              >
                                <LockResetIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenConfirmDelete(student);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
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

      {/* 계정 생성 확인 모달 */}
      <Modal
        open={confirmModalOpen}
        onClose={() => !isSubmitting && setConfirmModalOpen(false)}
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
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <InfoOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography variant="h6" component="h2">
              계정 생성 확인
            </Typography>
          </Box>
          <Typography sx={{ mb: 3 }}>
            아래 정보로 학생 계정을 생성하시겠습니까?
          </Typography>
          <List
            dense
            sx={{ mb: 3, bgcolor: "grey.50", borderRadius: 1, p: 1.5 }}
          >
            <ListItem disablePadding>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <BadgeIcon fontSize="small" />
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
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : "확인 및 생성"}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* 학생 정보 수정 모달 */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
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
          }}
        >
          <Typography variant="h6" gutterBottom>
            학생 정보 수정
          </Typography>
          {currentStudentForEdit && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="이름"
                value={currentStudentForEdit.name}
                onChange={(e) =>
                  setCurrentStudentForEdit({
                    ...currentStudentForEdit,
                    name: e.target.value,
                  })
                }
              />
              <TextField
                label="번호"
                type="number"
                value={currentStudentForEdit.studentId}
                onChange={(e) =>
                  setCurrentStudentForEdit({
                    ...currentStudentForEdit,
                    studentId: e.target.value,
                  })
                }
              />
              <Alert severity="info">
                번호를 변경하면 학생의 로그인 ID도 함께 변경됩니다.
              </Alert>
              {updateError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {updateError}
                </Alert>
              )}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button onClick={() => setEditModalOpen(false)}>취소</Button>
                <Button
                  variant="contained"
                  onClick={handleUpdateStudent}
                  disabled={isUpdating}
                >
                  {isUpdating ? <CircularProgress size={24} /> : "저장"}
                </Button>
              </Box>
            </Stack>
          )}
        </Box>
      </Modal>

      {/* 공용 확인 모달 (비밀번호 초기화/삭제용) */}
      <Modal
        open={confirmActionModal.open}
        onClose={() =>
          setConfirmActionModal({ ...confirmActionModal, open: false })
        }
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
          }}
        >
          <Typography variant="h6" gutterBottom>
            {confirmActionModal.title}
          </Typography>
          <Typography>{confirmActionModal.description}</Typography>
          <Box
            sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 1 }}
          >
            <Button
              onClick={() =>
                setConfirmActionModal({ ...confirmActionModal, open: false })
              }
              disabled={confirmActionModal.isLoading}
            >
              취소
            </Button>
            <Button
              variant="contained"
              color={confirmActionModal.color}
              onClick={confirmActionModal.onConfirm}
              disabled={confirmActionModal.isLoading}
            >
              {confirmActionModal.isLoading ? (
                <CircularProgress size={24} />
              ) : (
                confirmActionModal.confirmText
              )}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* 정보 일괄 변경 모달 */}
      <Modal
        open={bulkUpdateModalOpen}
        onClose={() => setBulkUpdateModalOpen(false)}
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
          }}
        >
          <Typography variant="h6" gutterBottom>
            {bulkUpdateType === "class" ? "반 일괄 변경" : "식별코드 일괄 변경"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            현재 조회된 {managedStudents.length}명의 학생 전체에 적용됩니다.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업을 실행하면 모든 학생의 로그인 ID가 새로 생성되며, 되돌릴 수
            없습니다.
          </Alert>
          <TextField
            fullWidth
            label={bulkUpdateType === "class" ? "새로운 반" : "새로운 식별코드"}
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button
              onClick={() => setBulkUpdateModalOpen(false)}
              disabled={isBulkUpdating}
            >
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmBulkUpdate}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? <CircularProgress size={24} /> : "변경 실행"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default UnifiedModal;
