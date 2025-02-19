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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

type Student = {
  _id: number;
  name: string;
  grade: number;
  class: string;
  loginId: string;
  password: string;
  studentId: string;
  studentClass: string;
  school: string;
};

interface FailedStudent {
  studentData: {
    name: string;
    grade: number;
    studentClass: string;
    class: string;
    studentId: string;
  };
  error: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  success: Student[];
  failed: FailedStudent[];
}

const StudentRegistrationResultModal: React.FC<Props> = ({
  open,
  onClose,
  success,
  failed,
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
          maxWidth: 800,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          학생 계정 생성 결과
        </Typography>

        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {success.length > 0 && (
                  <CheckCircleIcon fontSize="small" color="success" />
                )}
                <Typography
                  color={success.length > 0 ? "success.main" : "inherit"}
                >
                  성공 ({success.length})
                </Typography>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {failed.length > 0 && (
                  <CancelIcon fontSize="small" color="error" />
                )}
                <Typography
                  color={failed.length > 0 ? "error.main" : "inherit"}
                >
                  실패 ({failed.length})
                </Typography>
              </Box>
            }
          />
        </Tabs>

        {currentTab === 0 && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>학년/반</TableCell>
                  <TableCell>번호</TableCell>
                  <TableCell>로그인 ID</TableCell>
                  <TableCell>초기 비밀번호</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {success.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{`${student.grade}학년 ${student.class}반`}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.loginId}</TableCell>
                    <TableCell>123</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {currentTab === 1 && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>학년/반</TableCell>
                  <TableCell>번호</TableCell>
                  <TableCell>실패 사유</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {failed.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.studentData.name}</TableCell>
                    <TableCell>{`${item.studentData.grade}학년 ${item.studentData.studentClass}반`}</TableCell>
                    <TableCell>{item.studentData.studentId}</TableCell>
                    <TableCell>{item.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="contained">
            닫기
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default StudentRegistrationResultModal;
