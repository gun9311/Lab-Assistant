// import React, { useState, useEffect, useRef } from "react";
// import { Box, Button, TextField, Typography, Paper, Divider, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
// import { AccessTime, Send } from '@mui/icons-material';

// type Task = {
//   _id: string;
//   taskText: string;
// };

// type Quiz = {
//   _id: string;
//   grade: string;
//   semester: string;
//   subject: string;
//   unit: string;
//   tasks: Task[];
// };

// const QuizComponent: React.FC<{ 
//   quiz: Quiz; 
//   onSubmit: (answers: { [key: string]: string }) => void;
//   onAutoSubmit: () => void;
// }> = ({ quiz, onSubmit, onAutoSubmit }) => {
//   const [answers, setAnswers] = useState<{ [key: string]: string }>({});
//   const answersRef = useRef(answers);
//   const [timeLeft, setTimeLeft] = useState<number>(1800); // 30분 = 1800초
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);

//   console.log(timeLeft);

//   useEffect(() => {
//     answersRef.current = answers; // answers 상태가 변경될 때마다 ref를 업데이트
//   }, [answers]);

//   useEffect(() => {
//     const timer = setInterval(() => {
//       setTimeLeft((prevTime) => {
//         if (prevTime <= 1) {
//           clearInterval(timer);
//           handleSubmit(true); // 시간 초과 시 자동 제출
//           return 0;
//         }
//         return prevTime - 1;
//       });
//     }, 1000);
//     return () => clearInterval(timer);
//   }, []);

//   useEffect(() => {
//     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
//       if (!isSubmitting) {
//         event.preventDefault();
//         event.returnValue = ''; // 브라우저에서 기본 경고 메시지 표시
//       }
//     };

//     const handleUnload = () => {
//       if (!isSubmitting) {
//         handleSubmit(true);
//       }
//     };

//     window.addEventListener('beforeunload', handleBeforeUnload);
//     window.addEventListener('unload', handleUnload);

//     return () => {
//       window.removeEventListener('beforeunload', handleBeforeUnload);
//       window.removeEventListener('unload', handleUnload);
//     };
//   }, [isSubmitting]);

//   const handleChange = (taskId: string, value: string) => {
//     setAnswers((prevAnswers) => ({ ...prevAnswers, [taskId]: value }));
//   };

//   const handleSubmit = (isAutoSubmit = false) => {
//     if (!isAutoSubmit) {
//       setConfirmDialogOpen(true);
//       return;
//     } else {
//       onAutoSubmit(); // 부모 컴포넌트에서 자동 제출 로직을 처리하도록 호출
//       performSubmit(); // 자동 제출 처리
//     }
//   };

//   const performSubmit = () => {
//     setIsSubmitting(true);
//     onSubmit(answersRef.current); // 항상 최신의 answers 상태를 사용하여 제출
//   };

//   return (
//     <Paper elevation={3} sx={{ padding: 4, mt: 2, borderRadius: '16px', boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)', backgroundColor: '#f9f9f9' }}>
//       <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
//         <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
//           {quiz.subject} - {quiz.unit}
//         </Typography>
//         <Box display="flex" alignItems="center">
//           <AccessTime sx={{ color: '#6c757d', mr: 1 }} />
//           <Typography variant="body1" sx={{ color: '#6c757d', fontWeight: 'bold' }}>
//             남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
//           </Typography>
//         </Box>
//       </Box>

//       <Divider sx={{ mb: 3 }} />

//       {quiz.tasks.map((task, index) => (
//         <Box key={task._id} sx={{ mb: 4 }}>
//           <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>
//             {index + 1}. {task.taskText}
//           </Typography>
//           <TextField
//             fullWidth
//             variant="outlined"
//             value={answers[task._id] || ""}
//             onChange={(e) => handleChange(task._id, e.target.value)}
//             sx={{ borderRadius: '8px', backgroundColor: '#fff', borderColor: '#ced4da' }}
//           />
//         </Box>
//       ))}

//       <Box textAlign="center" sx={{ mt: 3 }}>
//         <Button 
//           variant="contained" 
//           color="primary" 
//           onClick={() => handleSubmit(false)} 
//           startIcon={<Send />} 
//           sx={{
//             padding: '10px 20px',
//             borderRadius: '24px',
//             fontWeight: 'bold',
//             background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
//           }}
//         >
//           퀴즈 제출
//         </Button>
//       </Box>

//       {/* 퀴즈 제출 확인 Dialog */}
//       <Dialog
//         open={confirmDialogOpen}
//         onClose={() => setConfirmDialogOpen(false)}
//       >
//         <DialogTitle>퀴즈 제출</DialogTitle>
//         <DialogContent>
//           <DialogContentText>
//             퀴즈를 제출하시겠습니까? 제출 후에는 다시 풀 수 없으며, 수정이 불가합니다.
//           </DialogContentText>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
//             취소
//           </Button>
//           <Button onClick={performSubmit} color="secondary">
//             제출
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Paper>
//   );
// };

// export default QuizComponent;
