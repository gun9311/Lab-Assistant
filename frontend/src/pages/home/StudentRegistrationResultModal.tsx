import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";

// Student 타입: 성공 목록에 사용될 타입 (백엔드 응답 기준)
type Student = {
  _id: number;
  name: string;
  grade: number;
  class: string; // 백엔드 find/save 후 응답에는 'class' 키를 사용할 수 있음
  loginId: string;
  // password?: string; // 비밀번호는 보통 응답에 포함하지 않음
  studentId: string;
  // studentClass?: string; // DB 모델에는 studentClass가 없을 수 있음
  school: string;
};

// FailedStudent 인터페이스: 실패 목록에 사용될 타입
interface FailedStudent {
  studentData: {
    name: string;
    grade: number;
    // studentClass: string; // UnifiedModal에서 보낸 키와 일치
    class?: string; // 필요하다면 옵셔널로 유지, 하지만 studentClass가 우선
    studentClass: string; // <<<- UnifiedModal에서 보낸 studentClass 키 사용
    studentId: string;
    loginId: string;
    school?: string;
  };
  error: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  success: Student[]; // 성공 목록은 Student 타입 사용
  failed: FailedStudent[];
  identifier: string | null;
  grade: number | null;
  classNum: string | null;
  school: string | null;
}

const StudentRegistrationResultModal: React.FC<Props> = ({
  open,
  onClose,
  success,
  failed,
  identifier,
  grade,
  classNum,
  school,
}) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          maxWidth: 900,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 },
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{ fontWeight: "bold", color: "primary.main", mb: 2 }}
        >
          학생 계정 생성 결과
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            mb: 2,
            p: 1.5,
            bgcolor: "grey.100",
            borderRadius: 1,
          }}
        >
          <Chip label={`식별코드: ${identifier || "N/A"}`} size="small" />
          <Chip label={`학교: ${school || "N/A"}`} size="small" />
          <Chip label={`학년: ${grade || "N/A"}`} size="small" />
          <Chip label={`반: ${classNum || "N/A"}`} size="small" />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleIcon
                  fontSize="small"
                  color={success.length > 0 ? "success" : "disabled"}
                />
                <Typography
                  sx={{
                    fontWeight: currentTab === 0 ? "bold" : "normal",
                    color:
                      success.length > 0 ? "success.main" : "text.secondary",
                  }}
                >
                  성공 ({success.length})
                </Typography>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CancelIcon
                  fontSize="small"
                  color={failed.length > 0 ? "error" : "disabled"}
                />
                <Typography
                  sx={{
                    fontWeight: currentTab === 1 ? "bold" : "normal",
                    color: failed.length > 0 ? "error.main" : "text.secondary",
                  }}
                >
                  실패 ({failed.length})
                </Typography>
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ flexGrow: 1, overflowY: "auto", mt: 2 }}>
          {currentTab === 0 && (
            <>
              {success.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 4,
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <InfoIcon color="disabled" sx={{ fontSize: 40 }} />
                  <Typography color="text.secondary">
                    성공한 학생이 없습니다.
                  </Typography>
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  variant="outlined"
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          "& th": { fontWeight: "bold", bgcolor: "grey.50" },
                        }}
                      >
                        <TableCell align="center">번호</TableCell>
                        <TableCell>이름</TableCell>
                        <TableCell>로그인 ID</TableCell>
                        <TableCell align="center">초기 비밀번호</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {success.map((student: Student) => (
                        <TableRow
                          key={student._id}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell align="center">
                            {student.studentId}
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.loginId}</TableCell>
                          <TableCell align="center">123</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {currentTab === 1 && (
            <>
              {failed.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 4,
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <InfoIcon color="disabled" sx={{ fontSize: 40 }} />
                  <Typography color="text.secondary">
                    실패한 학생이 없습니다.
                  </Typography>
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  variant="outlined"
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          "& th": { fontWeight: "bold", bgcolor: "grey.50" },
                        }}
                      >
                        <TableCell align="center">번호</TableCell>
                        <TableCell>이름</TableCell>
                        <TableCell>로그인 ID</TableCell>
                        <TableCell sx={{ color: "error.main" }}>
                          실패 사유
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {failed.map((item: FailedStudent, index: number) => (
                        <TableRow
                          key={index}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell align="center">
                            {item.studentData.studentId}
                          </TableCell>
                          <TableCell>{item.studentData.name}</TableCell>
                          <TableCell>{item.studentData.loginId}</TableCell>
                          <TableCell sx={{ color: "error.dark" }}>
                            {item.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>

        <Box
          sx={{
            mt: 3,
            pt: 2,
            display: "flex",
            justifyContent: "flex-end",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button onClick={onClose} variant="contained">
            닫기
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default StudentRegistrationResultModal;
