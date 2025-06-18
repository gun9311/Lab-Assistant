// import React from 'react';
// import { Box, Typography, Grid, Button } from '@mui/material';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import CancelIcon from '@mui/icons-material/Cancel';

// type Feedback = {
//   studentId: string;
//   name: string;
//   score: number;
//   isCorrect: boolean;
// };

// interface FeedbackComponentProps {
//   feedbacks: Feedback[];
//   isLastQuestion: boolean;
//   handleNextQuestion: () => void;
//   handleEndQuiz: () => void;
//   handleViewResults: () => void;
// }

// const FeedbackComponent: React.FC<FeedbackComponentProps> = ({
//   feedbacks,
//   isLastQuestion,
//   handleNextQuestion,
//   handleEndQuiz,
//   handleViewResults,
// }) => {
//   return (
//     <Box sx={{ 
//       position: 'absolute', 
//       top: '20%', 
//       width: '100%', 
//       textAlign: 'center', 
//       color: '#fff', // 피드백을 배경 위에서 잘 보이도록 흰색으로 설정
//       padding: '0 2rem',
//     }}>
//       <Typography variant="h4" sx={{ marginBottom: '2rem', fontWeight: 'bold' }}>
//         {isLastQuestion ? '최종 결과' : '정답 피드백'}
//       </Typography>

//       <Grid container spacing={3} justifyContent="center">
//         {feedbacks.map((feedback) => (
//           <Grid item xs={12} sm={6} md={4} key={feedback.studentId}>
//             <Box
//               sx={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 backgroundColor: feedback.isCorrect ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)', // 정답과 오답에 따라 배경색을 다르게 설정
//                 borderRadius: '8px',
//                 padding: '1rem',
//                 transition: 'background-color 0.3s ease',
//               }}
//             >
//               {feedback.isCorrect ? (
//                 <CheckCircleIcon sx={{ fontSize: '3rem', color: 'lightgreen' }} />
//               ) : (
//                 <CancelIcon sx={{ fontSize: '3rem', color: 'red' }} />
//               )}

//               <Typography variant="h6" sx={{ marginTop: '1rem' }}>
//                 {feedback.name}
//               </Typography>

//               <Typography variant="subtitle1" sx={{ marginTop: '0.5rem', color: '#fff' }}>
//                 점수: {feedback.score}
//               </Typography>
//             </Box>
//           </Grid>
//         ))}
//       </Grid>

//       <Box sx={{ marginTop: '3rem' }}>
//         {isLastQuestion ? (
//           <>
//             <Typography variant="h6" sx={{ marginBottom: '2rem' }}>
//               퀴즈가 끝났습니다. 결과를 확인해보세요.
//             </Typography>
//             <Box sx={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
//               <Button variant="contained" color="primary" onClick={handleEndQuiz}>
//                 퀴즈 종료
//               </Button>
//               <Button variant="outlined" color="secondary" onClick={handleViewResults}>
//                 결과 자세히 보기
//               </Button>
//             </Box>
//           </>
//         ) : (
//           <Button variant="contained" color="primary" onClick={handleNextQuestion}>
//             다음 문제
//           </Button>
//         )}
//       </Box>
//     </Box>
//   );
// };

// export default FeedbackComponent;
