const KahootQuizContent = require('../models/KahootQuizContent');
const KahootQuizSession = require('../models/KahootQuizSession');
const Student = require('../models/Student'); // 학생 모델 불러오기
const QuizResult = require('../models/QuizResult');
const redisClient = require('../utils/redisClient'); 
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../utils/s3Client'); // S3 클라이언트 가져옴
const winston = require('winston');
const WebSocket = require('ws');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/kahootWebsocket.log' })
  ]
});

// 여러 개의 파일을 처리할 수 있는 설정 (퀴즈 이미지 + 문제별 이미지 + 선택지 이미지)
// 동적 필드명 처리를 위한 함수를 사용
const uploadMultiple = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname); // 파일명을 타임스탬프와 함께 설정
    },
  }),
  fileFilter: function (req, file, cb) {
    // 동적 필드명을 처리할 수 있도록 필드 검증을 확장
    const fieldName = file.fieldname;
    if (/^questionImages_\d+$/.test(fieldName) || /^optionImages_\d+_\d+$/.test(fieldName) || fieldName === 'image') {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', fieldName));
    }
  }
}).any();  // .any()를 사용하여 모든 필드를 받아들임


exports.createQuiz = async (req, res) => {
  try {
    const { title, grade, subject, semester, unit, questions } = req.body;

    const parsedQuestions = JSON.parse(questions);

    let quizImageUrl = null;

    // 퀴즈 전체 이미지 처리 (업로드된 파일이 있으면 S3 URL로, 없으면 입력된 URL로 처리)
    if (req.files) {
      const imageFile = req.files.find(file => file.fieldname === 'image');
      if (imageFile) {
        quizImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${imageFile.key}`;
      }
    }

    // 이미지가 없을 경우 입력된 URL을 사용
    if (!quizImageUrl && req.body.imageUrl) {
      quizImageUrl = req.body.imageUrl;
    }

    // 문제 및 선택지 이미지 처리
    const updatedQuestions = await Promise.all(parsedQuestions.map(async (question, index) => {
      const questionImageKey = `questionImages_${index}`;
      
      // 문제 이미지 처리 (파일과 URL 둘 다 처리)
      const questionFile = req.files.find(file => file.fieldname === questionImageKey);
      if (questionFile) {
        const uploadedQuestionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${questionFile.key}`;
        question.imageUrl = uploadedQuestionImageUrl;
      } else if (question.imageUrl) {
        question.imageUrl = question.imageUrl;  // URL 처리
      }

      // 선택지 이미지 처리 (파일과 URL 둘 다 처리)
      question.options = await Promise.all(question.options.map(async (option, optIndex) => {
        const optionImageKey = `optionImages_${index}_${optIndex}`;
        const optionFile = req.files.find(file => file.fieldname === optionImageKey); // find로 필드 검색
        if (optionFile) {
          const uploadedOptionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${optionFile.key}`;
          option.imageUrl = uploadedOptionImageUrl;
        } else if (option.imageUrl) {
          option.imageUrl = option.imageUrl;  // URL 처리
        }
        return option;
      }));

      return question;
    }));

    // 새로운 퀴즈 객체 생성
    const newQuiz = new KahootQuizContent({
      title,
      grade,
      subject,
      semester,
      unit,
      questions: updatedQuestions,
      createdBy: req.user._id,
      imageUrl: quizImageUrl, // 퀴즈 이미지 URL 저장
    });

    await newQuiz.save();
    res.status(201).send(newQuiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).send({ error: '퀴즈 생성 실패' });
  }
};
  

// 퀴즈 이미지 업로드 처리
exports.uploadQuizImage = uploadMultiple;

exports.updateQuiz = async (req, res) => {
    try {
      const { title, unit, questions } = req.body;
      const quizId = req.params.id;
  
      let updatedQuiz = await KahootQuizContent.findById(quizId);
  
      if (!updatedQuiz) {
        return res.status(404).send({ error: '퀴즈를 찾을 수 없습니다.' });
      }
  
      updatedQuiz.title = title;
      updatedQuiz.unit = unit;
  
      // 퀴즈 전체 이미지 처리
      if (req.files && req.files.image) {
        updatedQuiz.uploadedImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${req.files.image[0].key}`;
      }
  
      // 문제 및 선택지 이미지 처리
      updatedQuiz.questions = await Promise.all(questions.map(async (question, index) => {
        if (req.files && req.files.questionImages && req.files.questionImages[index]) {
          const uploadedQuestionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${req.files.questionImages[index].key}`;
          question.uploadedImageUrl = uploadedQuestionImageUrl;
        }
  
        // 선택지 이미지 처리
        question.options = await Promise.all(question.options.map(async (option, optIndex) => {
          if (req.files && req.files.optionImages && req.files.optionImages[index * 4 + optIndex]) {
            const uploadedOptionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${req.files.optionImages[index * 4 + optIndex].key}`;
            option.uploadedImageUrl = uploadedOptionImageUrl;
          }
          return option;
        }));
  
        return question;
      }));
  
      await updatedQuiz.save();
      res.status(200).send(updatedQuiz);
    } catch (error) {
      res.status(500).send({ error: '퀴즈 수정 실패' });
    }
  };

exports.getQuizzes = async (req, res) => {
  try {
    // 요청한 사용자의 ID를 가져옵니다. (토큰에서 추출되었다고 가정)
    const userId = req.user._id;

    // 퀴즈 목록을 가져올 때 필요한 필드만 선택
    const quizzes = await KahootQuizContent.find()
      .select('_id title grade subject semester unit questions createdBy createdAt likes likeCount imageUrl');

    // 퀴즈 목록을 사용자 좋아요 여부와 함께 반환
    const quizzesWithDetails = quizzes.map(quiz => ({
      _id: quiz._id,
      title: quiz.title,
      grade: quiz.grade,
      subject: quiz.subject,
      semester: quiz.semester,
      unit: quiz.unit || '단원 없음',  // unit이 없으면 '단원 없음'으로 설정
      questionsCount: quiz.questions.length,
      createdBy: quiz.createdBy,
      createdAt: quiz.createdAt,
      likeCount: quiz.likeCount,
      imageUrl: quiz.imageUrl,
      // 요청한 사용자가 좋아요를 눌렀는지 확인
      userLiked: quiz.likes.includes(userId)  // likes 배열에 userId가 포함되어 있는지 확인
    }));

    res.status(200).json(quizzesWithDetails);
  } catch (error) {
    res.status(500).json({ error: '퀴즈 목록을 가져오는 데 실패했습니다.' });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await KahootQuizContent.findById(quizId);

    if (!quiz) {
      return res.status(404).send({ error: '퀴즈를 찾을 수 없습니다.' });
    }

    res.status(200).send(quiz);
  } catch (error) {
    res.status(500).send({ error: '퀴즈 데이터를 가져오는 데 실패했습니다.' });
  }
};


// 좋아요 토글 기능
exports.toggleLike = async (req, res) => {
    try {
      const quizId = req.params.quizId;
      const userId = req.user._id;
      
      const quiz = await KahootQuizContent.findById(quizId);
      
      if (!quiz) {
        return res.status(404).send({ error: '퀴즈를 찾을 수 없습니다.' });
      }
  
      const likeIndex = quiz.likes.indexOf(userId);
  
      if (likeIndex === -1) {
        // 좋아요 추가
        quiz.likes.push(userId);
        quiz.likeCount += 1;
      } else {
        // 좋아요 제거
        quiz.likes.splice(likeIndex, 1);
        quiz.likeCount -= 1;
      }
  
      await quiz.save();
      res.status(200).json({ likeCount: quiz.likeCount });
    } catch (error) {
      res.status(500).send({ error: '좋아요 처리 중 오류가 발생했습니다.' });
    }
  };  

function generatePIN() {
return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자 생성
}

// 고유한 6자리 이상의 PIN 생성 함수
async function generateUniquePIN() {
    let pin = generatePIN();  // 랜덤으로 6자리 PIN 생성
    let isPinUnique = false;
  
    while (!isPinUnique) {
      const existingSession = await redisClient.get(`session:pin:${pin}`);  // PIN을 기준으로 Redis에서 조회
      if (!existingSession) {
        isPinUnique = true;
      } else {
        pin = generatePIN();  // 중복된 경우 다시 PIN 생성
      }
    }
  
    return pin;
  }


exports.startQuizSession = async (req, res) => {
    try {
        const isTeamMode = req.body.isTeamMode;  // isTeamMode 값을 body에서 가져옴
        const quizId = req.params.quizId;  // req.params.quizId로 quizId 값을 가져옴
        // 고유한 PIN 생성
        const pin = await generateUniquePIN();

        // 새로운 세션 생성
        const newSession = new KahootQuizSession({
            quizContent: quizId,
            teacher: req.user._id,
            isTeamMode,
            pin,  // 고유 PIN 저장
            participants: [], // 학생 참여 목록 초기화
        });

        await newSession.save();

        // 세션을 Redis에 캐시 (교사만 생성 시점에 저장)
        await redisClient.set(`session:${pin}`, JSON.stringify(newSession), {
            EX: 3600,  // 세션 데이터는 1시간 동안 캐시됨
        });

        // 교사에게 PIN과 세션 정보 제공
        res.status(201).send({ pin, sessionId: newSession._id });
    } catch (error) {
        console.error("Error starting quiz session:", error);
        res.status(500).send({ error: '퀴즈 세션 시작 실패' });
    }
};

// 학생 퀴즈 세션 참여
exports.joinQuizSession = async (req, res) => {
  try {
    const { pin } = req.body;
    const studentId = req.user._id;

    // 락 획득 시도 (재시도 로직 포함)
    const lockAcquired = await acquireLockWithRetry(pin);
    if (!lockAcquired) {
      return res.status(429).send({ error: 'Another join request is being processed. Please wait.' });
    }

    try {
      // Redis에서 세션 조회
      let session = await redisClient.get(`session:${pin}`);
      if (!session) {
        return res.status(404).send({ error: 'Session not found' });
      }

      session = JSON.parse(session);

      // 학생이 이미 참여했는지 확인
      const alreadyJoined = session.participants.some(p => p.student.toString() === studentId.toString());
      if (alreadyJoined) {
        return res.status(400).send({ error: 'Already joined' });
      }

      // 학생의 이름을 DB에서 조회
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).send({ error: 'Student not found' });
      }

      // 학생을 세션에 추가 (이름 포함)
      session.participants.push({ 
        student: studentId, 
        name: student.name,   
        score: 0, 
        responses: [],
        status: 'joined'  
      });

      // Redis에 세션 업데이트
      await redisClient.set(`session:${pin}`, JSON.stringify(session), { EX: 3600 });

      res.status(200).send({ message: 'Successfully joined the session', session });
    } finally {
      // 잠금 해제
      await releaseLock(pin);
    }
  } catch (error) {
    console.error("Error joining quiz session:", error);
    res.status(500).send({ error: '퀴즈 세션 참여 실패' });
  }
};

const kahootClients = {}; // 각 세션의 클라이언트를 저장하는 객체

const broadcastToTeacher = (pin, message) => {
    const session = kahootClients[pin]; // 해당 세션의 교사와 학생들이 저장된 객체
    if (session && session.teacher) {
      // 교사 웹소켓 연결이 있는 경우 메시지를 전송
      session.teacher.send(JSON.stringify(message));
      logger.info(`Message sent to teacher of session ${pin}: ${JSON.stringify(message)}`);
    } else {
      logger.warn(`Teacher for session ${pin} not found.`);
    }
  };  

  // 특정 핀(pin)으로 세션에 연결된 학생들에게 메시지 전송
const broadcastToStudents = (pin, message) => {
  // 해당 세션에 연결된 학생들이 있는지 확인
  if (kahootClients[pin] && kahootClients[pin].students) {
      // 학생 목록을 순회하며 각 WebSocket에 메시지 전송
      Object.values(kahootClients[pin].students).forEach(studentWs => {
          if (studentWs.readyState === studentWs.OPEN) {
              studentWs.send(JSON.stringify(message));  // 메시지를 JSON 형식으로 변환하여 전송
          }
      });
  } else {
      console.error(`No students connected for session with pin: ${pin}`);
  }
};

// 교사 웹소켓 핸들러
exports.handleTeacherWebSocketConnection = async (ws, teacherId, pin) => {

  if (!kahootClients[pin]) {
      kahootClients[pin] = {
        teacher: null,
        students: {}
      };
  }

  kahootClients[pin].teacher = ws;
  logger.info(`Teacher connected to session: ${pin}`);  

  let session = await redisClient.get(`session:${pin}`);
  session = JSON.parse(session);

  // Redis에서 questionContent를 조회
  let questionContent = await redisClient.get(`questionContent:${session.quizContent}`);

  // Redis에서 콘텐츠를 찾지 못한 경우 DB에서 조회 후 캐싱
  if (!questionContent) {
    questionContent = await KahootQuizContent.findById(session.quizContent).select('questions');

    if (!questionContent) {
      ws.send(JSON.stringify({ error: 'Quiz content not found' }));
      return;
    }

    // Redis에 퀴즈 콘텐츠 캐싱 (1시간 만료)
    await redisClient.set(`questionContent:${session.quizContent}`, JSON.stringify(questionContent), { EX: 3600 });
    logger.info(`Quiz content for quizId ${session.quizContent} cached in Redis`);
  } else {
    questionContent = JSON.parse(questionContent);
    // 캐시 만료 시간 갱신 (1시간 연장)
    await redisClient.expire(`questionContent:${session.quizContent}`, 3600);
    logger.info(`Quiz content expiration refreshed for quizId ${session.quizContent}`);
  }

  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let currentQuestionIndex = 0; // 현재 문제 인덱스를 저장

  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);
    let session = await redisClient.get(`session:${pin}`);
    session = JSON.parse(session);

    if (parsedMessage.type === 'startQuiz') {

      //1. 준비 중 메시지를 먼저 교사와 학생들에게 전송
      const readyMessage = {
          type: 'quizStartingSoon',  // 준비 상태를 나타내는 메시지 타입
          message: '퀴즈가 곧 시작됩니다',  // 준비 화면에서 보여줄 메시지
      };

      // 교사와 학생들에게 준비 중 메시지를 전송
      ws.send(JSON.stringify(readyMessage));  // 교사에게 전송
      broadcastToStudents(pin, readyMessage); // 학생들에게 전송
    
      // 2. 잠시 대기 (예: 3초 후에 첫 번째 문제 전송)
      setTimeout(async () => {
        const currentTime = Date.now();
        const timeLimit = questionContent.questions[0].timeLimit * 1000; // 밀리초로 변환
        const endTime = currentTime + timeLimit; // 종료 시간 계산
        // 첫 번째 문제 전송 로직 (기존 로직 그대로)
        ws.send(JSON.stringify({
            type: 'quizStarted',
            questionId: questionContent.questions[0]._id,  // 첫 번째 문제 ID
            currentQuestion: questionContent.questions[0], // 첫 번째 문제 내용
            questionNumber: 1,
            totalQuestions: questionContent.questions.length,
            // timeLimit: questionContent.questions[0].timeLimit
            endTime: endTime // 종료 시간 전송
        }));

        const questionOptions = questionContent.questions[0].options.map(option => ({ text: option.text, imageUrl: option.imageUrl }));
        broadcastToStudents(pin, {
            type: 'newQuestionOptions',  // 학생들에게는 선택지만 전송
            questionId: questionContent.questions[0]._id,  
            timeLimit: questionContent.questions[0].timeLimit,
            options: questionOptions
        });
      }, 3000);  // 3초 대기 후 첫 번째 문제 전송
  }

    // 교사가 'nextQuestion' 메시지를 보내면 다음 문제로 이동
    if (parsedMessage.type === 'nextQuestion') {
      currentQuestionIndex++; // 다음 문제로 이동

      session.participants.forEach(participant => {
        participant.hasSubmitted = false; // 새로운 문제에 대한 제출 상태 초기화
      });

      // Redis에 세션 업데이트
      await redisClient.set(`session:${pin}`, JSON.stringify(session), { EX: 3600 });

      // Redis에서 콘텐츠 만료 시간 갱신
      await redisClient.expire(`questionContent:${session.quizContent}`, 3600);

      const nextQuestion = questionContent.questions[currentQuestionIndex];

      if (nextQuestion) {
        // 1. 먼저 준비 화면 전송

        // 마지막 문제인지 확인
        const isLastQuestion = currentQuestionIndex === questionContent.questions.length - 1;

        const readyMessage = {
          type: 'preparingNextQuestion',  // 준비 상태를 나타내는 메시지 타입
          message: isLastQuestion ? '마지막 문제입니다...' : '다음 문제가 곧 출제됩니다...',
          isLastQuestion: isLastQuestion  // 마지막 문제 여부 추가
        };
        ws.send(JSON.stringify(readyMessage));  // 교사에게 전송
        broadcastToStudents(pin, readyMessage); // 학생들에게 전송
  
        // 2. 3초 대기 후 실제 문제 전송
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'newQuestion',
            questionId: nextQuestion._id,  // 문제 ID
            currentQuestion: nextQuestion,  // 교사에게 문제와 보기 전송
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: questionContent.questions.length,
            timeLimit: nextQuestion.timeLimit,
            isLastQuestion: isLastQuestion  // 마지막 문제 여부 추가
          }));
  
          // 학생들에게는 보기만 전송
          const questionOptions = nextQuestion.options.map(option => ({ text: option.text, imageUrl: option.imageUrl }));
          broadcastToStudents(pin, {
            type: 'newQuestionOptions',  // 학생들에게는 선택지만 전송
            questionId: nextQuestion._id,  // 문제 ID
            timeLimit: nextQuestion.timeLimit,
            options: questionOptions,
            isLastQuestion: isLastQuestion  // 마지막 문제 여부 추가
          });
        }, 3000); // 3초 후 문제 전송
      } else {
        // 문제가 더 이상 없으면 퀴즈 종료
        broadcastToStudents(pin, { type: 'quizCompleted' });
        ws.send(JSON.stringify({ type: 'quizCompleted' }));
      }
    }

    // 교사가 'endQuiz' 메시지를 보낼 때 세션 종료 처리
    if (parsedMessage.type === 'endQuiz') {
      try {
        // 1. 퀴즈 결과 저장
        const quizResults = [];
        for (let participant of session.participants) {
          const correctAnswers = participant.responses.filter(r => r.isCorrect).length;
          const totalQuestions = participant.responses.length;
          const totalScore = (correctAnswers / totalQuestions) * 100; // 100점 만점 기준

          // KahootQuizContent에서 과목, 학기, 단원 정보 가져오기
          const quizContent = await KahootQuizContent.findById(session.quizContent).select('subject semester unit');

          // QuizResult 스키마에 결과 저장
          const quizResult = new QuizResult({
            studentId: participant.student,
            subject: quizContent.subject,
            semester: quizContent.semester,
            unit: quizContent.unit,
            results: participant.responses.map(r => ({
              questionId: r.question,
              studentAnswer: r.answer,
              isCorrect: r.isCorrect
            })),
            score: totalScore
          });
          await quizResult.save();
          quizResults.push(quizResult);
        }

        // 2. 학생들에게 세션 종료 신호 전송
        broadcastToStudents(pin, { type: 'sessionEnded', message: '퀴즈가 종료되었습니다.' });
        ws.send(JSON.stringify({ type: 'sessionEnded', message: '퀴즈가 종료되었습니다.' }));

        // 3. Redis에서 세션 데이터 삭제
        await redisClient.del(`session:${pin}`);
        logger.info(`Session ${pin} deleted from Redis.`);

        // 4. 웹소켓 연결 종료 (옵션)
        Object.values(kahootClients[pin].students).forEach(studentWs => {
          if (studentWs.readyState === studentWs.OPEN) {
            studentWs.close();
          }
        });
        ws.close();
        delete kahootClients[pin]; // 세션 클라이언트 데이터 삭제

        logger.info(`Session ${pin} closed and participants disconnected.`);
      } catch (error) {
        console.error("Error during quiz session end:", error);
        ws.send(JSON.stringify({ error: '퀴즈 종료 중 오류가 발생했습니다.' }));
      }
    }
    // 교사가 결과 자세히 보기를 요청할 때
    if (parsedMessage.type === 'viewDetailedResults') {
      // Redis에 저장된 세션 데이터에서 참여 학생과 각 학생의 응답 결과 가져오기
      const participantsResults = session.participants.map(participant => ({
          studentId: participant.student,
          name: participant.name,
          score: participant.score,
          responses: participant.responses.map(response => ({
              questionId: response.question,
              answer: response.answer,
              isCorrect: response.isCorrect
          }))
      }));

      // 교사에게 결과 데이터를 전송
      ws.send(JSON.stringify({
          type: 'detailedResults',
          results: participantsResults
      }));
    } 
  });
};

// 락 관리 객체
const locks = {};
const lockExpiryTime = 3000; // 3초 후에 자동으로 락 해제

// 락 획득 함수 (재시도 로직 포함)
const acquireLock = async (pin) => {
  const currentTime = Date.now();

  // 락이 이미 존재하고 만료되지 않은 경우
  if (locks[pin] && (currentTime - locks[pin].timestamp) < lockExpiryTime) {
    return false;
  }

  // 락 획득 및 타임스탬프 저장
  locks[pin] = { timestamp: currentTime };
  return true;
};

// 락 해제 함수
const releaseLock = async (pin) => {
  delete locks[pin]; // 락 해제
};

// 락을 획득할 때 재시도 로직 추가 (최대 3번 재시도)
const acquireLockWithRetry = async (pin, retryCount = 20, delay = 100) => {
  for (let i = 0; i < retryCount; i++) {
    const lockAcquired = await acquireLock(pin);
    if (lockAcquired) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay)); // 일정 시간 대기 후 재시도
  }
  return false;
};

exports.handleStudentWebSocketConnection = async (ws, studentId, pin) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      ws.send(JSON.stringify({ error: 'Student not found' }));
      ws.close();
      return;
    }

    kahootClients[pin].students[studentId] = ws;
    logger.info(`Student connected to session: ${pin}`);
    
    let session = await redisClient.get(`session:${pin}`);
    if (!session) {
      ws.send(JSON.stringify({ error: 'Session not found' }));
      ws.close();
      return;
    }
    session = JSON.parse(session);

    let questionContent = await redisClient.get(`questionContent:${session.quizContent}`);
    if (!questionContent) {
      ws.send(JSON.stringify({ error: 'Quiz content not found' }));
      return;
    }
    questionContent = JSON.parse(questionContent);

    ws.on('message', async (message) => {
      const parsedMessage = JSON.parse(message);
      // 락 획득 시도 (재시도 로직 포함)
      const lockAcquired = await acquireLockWithRetry(pin);
      // logger.info(`락 획득: ${lockAcquired}`);
      if (!lockAcquired) {
        // logger.info(`락 기다림: ${lockAcquired}`);
        ws.send(JSON.stringify({ error: 'Another operation is being processed. Please wait.' }));
        return;
      }

      try {
        // 잠금이 걸린 상태에서 세션을 읽음
        let session = await redisClient.get(`session:${pin}`);
        if (!session) {
          ws.send(JSON.stringify({ error: 'Session not found' }));
          ws.close();
          return;
        }
        session = JSON.parse(session);

        if (parsedMessage.type === 'characterSelected') {
          const character = parsedMessage.character;
          const participant = session.participants.find(p => p.student.toString() === studentId.toString());
          if (participant) {
            participant.character = character;
            await redisClient.set(`session:${pin}`, JSON.stringify(session), { EX: 3600 }); // 세션 저장
            
            // 락 해제
            await releaseLock(pin);

            broadcastToTeacher(pin, {
              type: 'studentJoined',
              studentId: studentId,
              name: student.name,
              character: character
            });

            ws.send(JSON.stringify({ type: 'characterAcknowledged', message: 'Character selection successful' }));
          } else {
            ws.send(JSON.stringify({ error: 'Participant not found' }));
          }
        }

        if (parsedMessage.type === 'ready') {
          const participant = session.participants.find(p => p.student.toString() === studentId.toString());
          if (participant) {
            participant.status = 'ready';
            await redisClient.set(`session:${pin}`, JSON.stringify(session), { EX: 3600 }); // 세션 저장
            
            // 락 해제
            await releaseLock(pin);

            broadcastToTeacher(pin, {
              type: 'studentReady',
              studentId: studentId,
              name: student.name,
              status: 'ready'
            });
          }
          ws.send(JSON.stringify({ type: 'readyAcknowledged', message: 'You are ready!' }));
        }

        if (parsedMessage.type === 'submitAnswer') {
          const { questionId, answerIndex, responseTime } = parsedMessage;

          const currentQuestion = questionContent.questions.find(q => q._id.toString() === questionId);
          if (!currentQuestion) {
            ws.send(JSON.stringify({ error: 'Invalid question ID' }));
            return;
          }

          let isCorrect = false;
          if (answerIndex !== -1) {
            isCorrect = Number(currentQuestion.correctAnswer) === Number(answerIndex);
          }

          const participant = session.participants.find(p => p.student.toString() === studentId.toString());

          if (participant) {
            participant.responses.push({
              question: currentQuestion._id,
              answer: answerIndex !== -1 ? answerIndex : null,
              isCorrect: isCorrect,
              responseTime: responseTime
            });

            const maxScore = 1000;
            const baseScore = 500;
            const responseTimeInSeconds = responseTime / 1000;
            const timeFactor = Math.max(0, (currentQuestion.timeLimit - responseTimeInSeconds)) / currentQuestion.timeLimit;

            if (isCorrect) {
              const score = baseScore + Math.floor((maxScore - baseScore) * timeFactor);
              participant.score += score;

              if (session.isTeamMode) {
                const team = session.teams.find(t => t.members.includes(studentId));
                if (team) {
                  team.teamScore += score;
                }
              }
            }

            participant.hasSubmitted = true;

            await redisClient.set(`session:${pin}`, JSON.stringify(session), { EX: 3600 }); // 세션 저장

            // 락 해제
            // logger.info(`락 해제 직전: ${lockAcquired}`);
            await releaseLock(pin);

            broadcastToTeacher(pin, {
              type: 'studentSubmitted',
              studentId: studentId,
              name: student.name,
              character: participant.character
            });

            const allSubmitted = session.participants.every(p => p.hasSubmitted);

            if (allSubmitted) {
              session.participants.forEach((participant) => {
                const studentWs = kahootClients[pin].students[participant.student];
                if (studentWs && studentWs.readyState === WebSocket.OPEN) {
                  const response = participant.responses.find(r => r.question.toString() === currentQuestion._id.toString());

                  studentWs.send(JSON.stringify({
                    type: 'feedback',
                    correct: response.isCorrect,
                    score: participant.score,
                    teamScore: session.isTeamMode ? team.teamScore : null,
                  }));
                }
              });

              broadcastToTeacher(pin, {
                type: 'allStudentsSubmitted',
                feedback: session.participants
                  .sort((a, b) => b.score - a.score)
                  .map((p, index) => ({
                    studentId: p.student,
                    name: p.name,
                    score: p.score,
                    isCorrect: p.responses[p.responses.length - 1].isCorrect,
                    rank: index + 1,
                  })),
              });
            }
          } else {
            ws.send(JSON.stringify({ error: 'Participant not found' }));
          }
        }
      } finally {
        // 만약 try 블록 내에서 예외가 발생하면 락 해제를 여기서도 처리
        await releaseLock(pin);
      }
    });
  } catch (error) {
    console.error('WebSocket error:', error);
    ws.send(JSON.stringify({ error: 'An error occurred during the WebSocket communication' }));
    ws.close();
  }
};