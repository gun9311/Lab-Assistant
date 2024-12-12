// import React, { useState, useEffect } from 'react';
// import { Modal, Box, Button, TextField, InputLabel, FormControl, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, InputAdornment } from '@mui/material';

// type StudentAccountModalProps = {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: (studentData: any) => void;
//   school: string | null; // 학교 정보를 prop으로 받음
// };

// const StudentAccountModal: React.FC<StudentAccountModalProps> = ({ open, onClose, onSubmit, school }) => {
//   const initialStudents = Array(10).fill({ name: '', studentId: '', loginId: '', password: '' }).map((student, index) => ({ ...student, studentId: (index + 1).toString() }));
//   const [students, setStudents] = useState(initialStudents);
//   const [commonGrade, setCommonGrade] = useState('');
//   const [commonClass, setCommonClass] = useState('');

//   // schoolPrefix를 컴포넌트 범위에서 정의
//   const schoolPrefix = school ? school.split('초등학교')[0] : 'school';

//   // 학년이나 반이 변경될 때마다 학생 목록을 초기화
//   useEffect(() => {
//     setStudents(initialStudents.map((student, index) => {
//       const paddedStudentId = (index + 1).toString().padStart(2, '0');
//       return {
//         ...student,
//         studentId: (index + 1).toString(), // 화면에 표시되는 번호는 자연수
//         loginId: `${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
//         password: '123',
//       };
//     }));
//   }, [commonGrade, commonClass, schoolPrefix]);

//   const handleStudentChange = (index: number, field: string, value: string) => {
//     const updatedStudents = [...students];
//     updatedStudents[index] = { ...updatedStudents[index], [field]: value };
//     setStudents(updatedStudents);
//   };

//   const handleAddStudent = () => {
//     const maxId = Math.max(...students.map(student => parseInt(student.studentId || '0', 10)));
//     const newStudentId = (maxId + 1).toString();
//     const paddedStudentId = newStudentId.padStart(2, '0');
//     const newStudent = {
//       name: '',
//       studentId: newStudentId, // 화면에 표시되는 번호는 자연수
//       loginId: `${schoolPrefix}${commonGrade}${commonClass}${paddedStudentId}`,
//       password: '123',
//     };
//     setStudents([...students, newStudent]);
//   };

//   const handleRemoveStudent = (index: number) => {
//     const updatedStudents = students.filter((_, i) => i !== index);
//     setStudents(updatedStudents);
//   };

//   const handleReset = () => {
//     setStudents(initialStudents);
//     setCommonGrade('');
//     setCommonClass('');
//   };

//   const handleSubmit = () => {
//     const studentData = students.map((student) => ({
//       ...student,
//       school, // 학교 정보 적용
//       grade: commonGrade,
//       studentClass: commonClass,
//     }));
//     onSubmit(studentData);
//     onClose();
//   };

//   return (
//     <Modal open={open} onClose={onClose}>
//       <Box sx={{ 
//         position: 'absolute', 
//         top: '50%', 
//         left: '50%', 
//         transform: 'translate(-50%, -50%)', 
//         padding: 4, 
//         backgroundColor: 'white', 
//         maxWidth: 800, 
//         maxHeight: '80vh', 
//         overflowY: 'auto', 
//         borderRadius: 2,
//         boxShadow: 3
//       }}>
//         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
//           <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
//             {school} 학생 계정 생성
//           </Typography>
//           <Button onClick={handleReset} variant="outlined" color="secondary">리셋</Button>
//         </Box>
//         <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
//           <FormControl sx={{ minWidth: 120, marginRight: 2 }}>
//             <InputLabel>학년</InputLabel>
//             <Select
//               value={commonGrade}
//               onChange={(e) => setCommonGrade(e.target.value)}
//               label="학년"
//             >
//               <MenuItem value={3}>3</MenuItem>
//               <MenuItem value={4}>4</MenuItem>
//               <MenuItem value={5}>5</MenuItem>
//               <MenuItem value={6}>6</MenuItem>
//             </Select>
//           </FormControl>
//           <TextField
//             value={commonClass}
//             onChange={(e) => setCommonClass(e.target.value)}
//             sx={{ width: 100 }}
//             InputProps={{
//               endAdornment: <InputAdornment position="end">반</InputAdornment>,
//             }}
//           />
//         </Box>
//         <TableContainer component={Paper} sx={{ maxHeight: 400, overflowY: 'auto', marginBottom: 2, opacity: commonGrade && commonClass ? 1 : 0.5 }}>
//           <Table stickyHeader>
//             <TableHead>
//               <TableRow>
//                 <TableCell align="center">번호</TableCell>
//                 <TableCell align="center">이름</TableCell>
//                 <TableCell align="center">아이디</TableCell>
//                 <TableCell align="center">비밀번호</TableCell>
//                 <TableCell align="center">작업</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {students.map((student, index) => (
//                 <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 }, height: 40 }}>
//                   <TableCell align="center" contentEditable={!!commonGrade && !!commonClass} suppressContentEditableWarning onBlur={(e) => handleStudentChange(index, 'studentId', e.currentTarget.textContent || '')} sx={{ padding: '4px' }}>
//                     {student.studentId}
//                   </TableCell>
//                   <TableCell align="center" contentEditable={!!commonGrade && !!commonClass} suppressContentEditableWarning onBlur={(e) => handleStudentChange(index, 'name', e.currentTarget.textContent || '')} sx={{ padding: '4px' }}>
//                     {student.name}
//                   </TableCell>
//                   <TableCell align="center" contentEditable={!!commonGrade && !!commonClass} suppressContentEditableWarning onBlur={(e) => handleStudentChange(index, 'loginId', e.currentTarget.textContent || '')} sx={{ padding: '4px' }}>
//                     {student.loginId}
//                   </TableCell>
//                   <TableCell align="center" contentEditable={!!commonGrade && !!commonClass} suppressContentEditableWarning onBlur={(e) => handleStudentChange(index, 'password', e.currentTarget.textContent || '')} sx={{ padding: '4px' }}>
//                     {student.password}
//                   </TableCell>
//                   <TableCell align="center" sx={{ padding: '4px' }}>
//                     <Button onClick={() => handleRemoveStudent(index)} color="error" disabled={!commonGrade || !commonClass}>삭제</Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </TableContainer>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
//           <Button onClick={handleAddStudent} variant="contained" color="primary" sx={{ marginBottom: 2 }} disabled={!commonGrade || !commonClass}>학생 추가</Button>
//           <Button onClick={handleSubmit} variant="contained" color="success" disabled={!commonGrade || !commonClass}>저장</Button>
//         </Box>
//       </Box>
//     </Modal>
//   );
// };

// export default StudentAccountModal;