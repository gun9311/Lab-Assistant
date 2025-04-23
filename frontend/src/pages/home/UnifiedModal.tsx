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
  onSubmitReset: (studentId: string) => void;
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
  onSubmitReset,
  school,
}) => {
  const [activeTab, setActiveTab] = useState(0); // 0: 계정 생성, 1: 비밀번호 재설정
  const [commonGrade, setCommonGrade] = useState("");
  const [commonClass, setCommonClass] = useState("");
  const [studentId, setStudentId] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState(""); // 고유 식별자 상태 추가
  const initialStudents: StudentInput[] = Array(10)
    .fill({}) // 빈 객체로 시작
    .map((_, index) => ({
      name: "",
      studentId: (index + 1).toString(),
      loginId: "", // useEffect에서 설정됨
      password: "123", // 기본 비밀번호
    }));
  const [students, setStudents] = useState<StudentInput[]>(initialStudents);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    grade: false,
    class: false,
    names: Array(10).fill(false),
    uniqueIdentifier: false,
  });
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState<string>("");
  const [addStudentError, setAddStudentError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false); // 로딩 상태 추가

  const schoolPrefix = school ? school.split("초등학교")[0] : "school";

  useEffect(() => {
    setStudents(
      initialStudents.map((student, index) => {
        const paddedStudentId = (index + 1).toString().padStart(2, "0");
        return {
          ...student,
          studentId: (index + 1).toString(),
          loginId: `${uniqueIdentifier}${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`, // 고유 식별자 추가
          password: "123",
        };
      })
    );
  }, [commonGrade, commonClass, schoolPrefix, uniqueIdentifier]); // uniqueIdentifier 추가

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
    // 입력된 번호가 있는 경우의 유효성 검사
    if (newStudentId) {
      // 숫자만 허용하는 정규식 검사
      if (!/^\d+$/.test(newStudentId)) {
        setAddStudentError("숫자만 입력 가능합니다.");
        return;
      }

      // 0으로 시작하는지 검사
      if (newStudentId.startsWith("0")) {
        setAddStudentError("0으로 시작할 수 없습니다.");
        return;
      }

      // 1 이상의 숫자인지 검사
      const numId = parseInt(newStudentId, 10);
      if (numId < 1) {
        setAddStudentError("1 이상의 숫자를 입력해주세요.");
        return;
      }

      // 중복 번호 검사
      if (students.some((student) => parseInt(student.studentId) === numId)) {
        setAddStudentError("이미 존재하는 번호입니다.");
        return;
      }

      // 새 학생 추가
      const paddedStudentId = numId.toString().padStart(2, "0");
      const newStudent: StudentInput = {
        name: "",
        studentId: numId.toString(),
        loginId: `${uniqueIdentifier}${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
        password: "123",
      };
      // 번호 순서대로 정렬되도록 수정
      const updatedStudents = [...students, newStudent].sort(
        (a, b) => parseInt(a.studentId) - parseInt(b.studentId)
      );
      setStudents(updatedStudents);
      setNewStudentId("");
      setAddStudentError("");
      return;
    }

    // 번호 미입력 시 자동 번호 부여
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
    // 번호 순서대로 정렬
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
    console.log("handleSubmitCreateClick triggered"); // 로그 추가 1 (필요하면 유지)
    console.log("Current values:", {
      commonGrade,
      commonClass,
      uniqueIdentifier,
    }); // 로그 추가 2 (필요하면 유지)

    // 1. 식별코드, 학년, 반 유효성 검사
    const commonFieldErrors = {
      grade: !commonGrade,
      class: !commonClass,
      uniqueIdentifier: !uniqueIdentifier,
    };
    const commonFieldsValid =
      !commonFieldErrors.grade &&
      !commonFieldErrors.class &&
      !commonFieldErrors.uniqueIdentifier;

    // 2. 학생 이름 유효성 검사 (추가)
    const currentNameErrors = Array(students.length).fill(false);
    let namesValid = true;
    students.forEach((student, index) => {
      // 이름이 비어있는 학생만 검사 (삭제된 행은 무시)
      if (!student.name.trim()) {
        // trim() 추가하여 공백만 있는 경우도 잡기
        currentNameErrors[index] = true;
        namesValid = false;
      }
    });

    // 3. 최종 유효성 검사 및 처리
    if (!commonFieldsValid || !namesValid) {
      console.log("Validation failed:", { commonFieldsValid, namesValid }); // 로그 추가
      setFieldErrors((prev) => ({
        ...prev,
        ...commonFieldErrors, // 학년, 반, 식별코드 오류 업데이트
        names: currentNameErrors, // 이름 오류 업데이트
      }));

      let errorMessage = "";
      if (!commonFieldsValid) {
        errorMessage = "식별코드, 학년, 반을 모두 입력해주세요.";
      } else if (!namesValid) {
        errorMessage = "입력되지 않은 학생 이름이 있습니다.";
      } else {
        errorMessage = "필수 정보를 모두 입력해주세요."; // 혹시 모를 경우
      }

      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
      return; // 확인 모달 열지 않고 함수 종료
    }

    // 모든 유효성 검사 통과 시 확인 모달 열기
    console.log("Validation passed: Opening confirmation modal."); // 로그 추가 (필요하면 유지)
    setConfirmModalOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    // API로 보낼 학생 데이터 가공
    const studentSubmitData: StudentInput[] = students.map((student) => ({
      ...student, // 기존 student 객체 복사 (name, studentId, loginId, password 등 포함)
      // school prop이 null이면 undefined를 할당, 아니면 school 값 할당
      school: school ?? undefined,
      // commonGrade/commonClass가 빈 문자열이면 undefined 할당 (옵셔널 처리)
      grade: commonGrade || undefined,
      studentClass: commonClass || undefined,
    }));

    // TeacherHomePage로 전달할 객체 생성
    const submitData: UnifiedModalSubmitData = {
      students: studentSubmitData,
      identifier: uniqueIdentifier,
      grade: commonGrade, // TeacherHomePage prop 타입에 맞게 string 전달
      classNum: commonClass, // TeacherHomePage prop 타입에 맞게 string 전달
    };

    try {
      const result = await onSubmitCreate(submitData);

      if (!result.success) {
        if (result.missingNameIndexes) {
          const newNameErrors = Array(students.length).fill(false);
          result.missingNameIndexes.forEach((index) => {
            // 주의: result.missingNameIndexes는 1부터 시작하는 번호일 수 있음
            // students 배열 인덱스(0부터 시작)와 맞추거나,
            // studentId 기준으로 오류 필드를 찾아야 할 수 있음.
            // 일단 index-1로 가정.
            if (index > 0 && index <= newNameErrors.length) {
              newNameErrors[index - 1] = true;
            }
          });
          setFieldErrors((prev) => ({
            ...prev,
            names: newNameErrors,
          }));
        }
        // 결과 모달 대신 UnifiedModal 내에서 Snackbar 표시
        setSnackbarMessage(result.message);
        setSnackbarOpen(true);
        // 실패 시 확인 모달을 다시 열지 않음 (이미 닫혔거나 아래에서 닫힐 예정)
        // 또는 실패 시 확인 모달을 닫지 않고 에러를 보여줄 수도 있음
      } else {
        // 성공 시 UnifiedModal과 확인 모달 모두 닫기
        handleResetStudents(); // 입력 폼 초기화
        onClose(); // 메인 모달 닫기 (결과 모달은 TeacherHomePage에서 열림)
        setConfirmModalOpen(false); // 확인 모달 닫기
      }
    } catch (e) {
      // onSubmitCreate 내부에서 예상치 못한 에러 발생 시
      console.error("Submission failed unexpectedly:", e);
      setSnackbarMessage("계정 생성 중 예기치 못한 오류 발생");
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false); // <<< 로딩 상태 종료 (성공/실패 무관)
      // 실패 시 사용자가 재시도할 수 있도록 확인 모달은 열어둘 수 있음
      // setConfirmModalOpen(false); // 실패해도 닫으려면 여기서 닫기
    }
  };

  const handleSubmitReset = () => {
    onSubmitReset(studentId);
    onClose();
  };

  const handleResetStudents = () => {
    setStudents(initialStudents);
    setCommonGrade("");
    setCommonClass("");
    setUniqueIdentifier("");
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(10).fill(false),
      uniqueIdentifier: false,
    });
  };

  // 학년 변경 시 오류 상태 초기화
  const handleGradeChange = (value: string) => {
    setCommonGrade(value);
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(10).fill(false),
      uniqueIdentifier: false,
    });
  };

  // 반 변경 시 오류 상태 초기화
  const handleClassChange = (value: string) => {
    setCommonClass(value);
    setFieldErrors({
      grade: false,
      class: false,
      names: Array(10).fill(false),
      uniqueIdentifier: false,
    });
  };

  const isRequiredFieldsFilled = uniqueIdentifier && commonGrade && commonClass;

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
            width: "60%",
            maxWidth: 1200,
            maxHeight: "80vh",
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
            <Tab label="비밀번호 찾기" />
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
                    저장
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
                {/* 테이블 컨테이너 */}
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
                        <TableCell align="center">이름</TableCell>
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
                                // 입력 시 해당 필드의 오류 상태 제거
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

                {/* 오버레이 레이어 */}
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
                      justifyContent: "flex-start", // center에서 flex-start로 변경
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
              <Typography variant="body1" gutterBottom>
                학생 계정의 아이디를 입력하세요. 교사의 이메일로 재설정 링크가
                전송됩니다.
              </Typography>
              <TextField
                fullWidth
                label="학생 아이디"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                sx={{ marginBottom: 2 }}
              />
              <Box display="flex" justifyContent="center">
                <Button
                  onClick={handleSubmitReset}
                  variant="contained"
                  color="primary"
                >
                  재설정
                </Button>
              </Box>
            </Box>
          )}

          {error && (
            <Typography
              color="error"
              sx={{
                mt: 2,
                mb: 2,
                padding: 2,
                backgroundColor: "#ffebee",
                borderRadius: 1,
                textAlign: "center",
              }}
            >
              {error}
            </Typography>
          )}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity="error"
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Modal>

      {/* 확인 모달 (디자인 개선) */}
      <Modal
        open={confirmModalOpen}
        onClose={() => !isSubmitting && setConfirmModalOpen(false)}
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
      >
        {/* 로딩 중에는 닫기 방지 */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4, // 패딩 유지
            borderRadius: 2, // 모서리 둥글게 유지
            width: { xs: "90%", sm: 450 }, // 반응형 너비 조정
            outline: "none", // 포커스 아웃라인 제거
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <InfoOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography id="confirm-modal-title" variant="h6" component="h2">
              계정 생성 확인
            </Typography>
          </Box>

          <Typography id="confirm-modal-description" sx={{ mb: 3 }}>
            아래 정보로 학생 계정을 생성하시겠습니까?
          </Typography>

          {/* 확인 정보 리스트 */}
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
              />{" "}
              {/* 이름 입력된 학생 수 */}
            </ListItem>
          </List>

          {/* 버튼 영역 */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => setConfirmModalOpen(false)}
              variant="text" // Text 버튼으로 변경
              color="inherit"
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              variant="contained"
              color="primary" // 주요 액션 색상
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              } // 로딩 스피너 추가
            >
              {isSubmitting ? "생성 중..." : "확인 및 생성"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default UnifiedModal;
