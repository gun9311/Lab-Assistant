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
} from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// 타입 정의
type CreateResult = {
  success: boolean;
  message: string;
  missingNameIndexes?: number[];
};

type UnifiedModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (studentData: any) => Promise<CreateResult>;
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
  const initialStudents = Array(10)
    .fill({ name: "", studentId: "", loginId: "", password: "" })
    .map((student, index) => ({
      ...student,
      studentId: (index + 1).toString(),
    }));
  const [students, setStudents] = useState(initialStudents);
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

  const handleStudentChange = (index: number, field: string, value: string) => {
    const updatedStudents = [...students];
    updatedStudents[index] = { ...updatedStudents[index], [field]: value };
    setStudents(updatedStudents);
  };

  const handleAddStudent = () => {
    const maxId = Math.max(
      ...students.map((student) => parseInt(student.studentId || "0", 10))
    );
    const newStudentId = (maxId + 1).toString();
    const paddedStudentId = newStudentId.padStart(2, "0");
    const newStudent = {
      name: "",
      studentId: newStudentId,
      loginId: `${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
      password: "123",
    };
    setStudents([...students, newStudent]);
  };

  const handleRemoveStudent = (index: number) => {
    const updatedStudents = students.filter((_, i) => i !== index);
    setStudents(updatedStudents);
  };

  const handleSubmitCreateClick = () => {
    // 기존의 유효성 검사
    if (!commonGrade || !commonClass || !uniqueIdentifier) {
      setFieldErrors((prev) => ({
        ...prev,
        grade: !commonGrade,
        class: !commonClass,
        uniqueIdentifier: !uniqueIdentifier,
      }));
      setSnackbarMessage("식별코드, 학년, 반을 모두 입력해주세요.");
      setSnackbarOpen(true);
      return;
    }

    // 확인 모달 열기
    setConfirmModalOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setConfirmModalOpen(false); // 확인 모달 닫기

    const studentData = students.map((student) => ({
      ...student,
      school,
      grade: commonGrade,
      studentClass: commonClass,
    }));

    const result = await onSubmitCreate(studentData);

    if (!result.success) {
      if (result.missingNameIndexes) {
        const newNameErrors = Array(students.length).fill(false);
        result.missingNameIndexes.forEach((index) => {
          newNameErrors[index - 1] = true;
        });
        setFieldErrors((prev) => ({
          ...prev,
          names: newNameErrors,
        }));
      }
      setSnackbarMessage(result.message);
      setSnackbarOpen(true);
      return;
    }
    handleResetStudents();
    onClose();
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
            width: "60%", // 가로 넓이를 80%로 설정
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
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 2,
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
                                임의의 식별코드(문자, 숫자, 기호)를
                                입력해주세요. 학생 계정의 식별을 목적으로 하며,
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
              <TableContainer
                component={Paper}
                sx={{ maxHeight: 400, overflowY: "auto", marginBottom: 2 }}
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
                        <TableCell align="center">{student.loginId}</TableCell>
                        <TableCell align="center">{student.password}</TableCell>
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
                      hover
                      onClick={handleAddStudent}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      <TableCell colSpan={5} align="center">
                        <Button
                          fullWidth
                          sx={{
                            color: "text.secondary",
                            "&:hover": { backgroundColor: "transparent" },
                          }}
                        >
                          + 학생 추가
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
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

      {/* 확인 모달 추가 */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
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
            width: 400,
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            계정 생성 확인
          </Typography>
          <Typography sx={{ mt: 2, mb: 3 }}>
            다음 정보로 학생 계정을 생성하시겠습니까?
            <br />• 식별코드: {uniqueIdentifier}
            <br />• 학년: {commonGrade}학년
            <br />• 반: {commonClass}반
            <br />• 학생 수: {students.length}명
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => setConfirmModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              variant="contained"
              color="primary"
            >
              확인
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default UnifiedModal;
