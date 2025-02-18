const KahootQuizContent = require("../models/KahootQuizContent");
const KahootQuizSession = require("../models/KahootQuizSession");
const Student = require("../models/Student"); // 학생 모델 불러오기
const QuizResult = require("../models/QuizResult");
const redisClient = require("../utils/redisClient");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3Client"); // S3 클라이언트 가져옴
const winston = require("winston");
const WebSocket = require("ws");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: "/app/logs/kahootWebsocket.log" }),
  ],
});

// 여러 개의 파일을 처리할 수 있는 설정 (퀴즈 이미지 + 문제별 이미지 + 선택지 이미지)
// 동적 필드명 처리를 위한 함수를 사용
const uploadMultiple = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + "-" + file.originalname); // 파일명을 타임스탬프와 함께 설정
    },
  }),
  fileFilter: function (req, file, cb) {
    // 동적 필드명을 처리할 수 있도록 필드 검증을 확장
    const fieldName = file.fieldname;
    if (
      /^questionImages_\d+$/.test(fieldName) ||
      /^optionImages_\d+_\d+$/.test(fieldName) ||
      fieldName === "image"
    ) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", fieldName));
    }
  },
}).any(); // .any()를 사용하여 모든 필드를 받아들임

exports.createQuiz = async (req, res) => {
  try {
    const { title, grade, subject, semester, unit, questions } = req.body;

    const parsedQuestions = JSON.parse(questions);

    let quizImageUrl = null;

    // 퀴즈 전체 이미지 처리 (업로드된 파일이 있으면 S3 URL로, 없으면 입력된 URL로 처리)
    if (req.files) {
      const imageFile = req.files.find((file) => file.fieldname === "image");
      if (imageFile) {
        quizImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${imageFile.key}`;
      }
    }

    // 이미지가 없을 경우 입력된 URL을 사용
    if (!quizImageUrl && req.body.imageUrl) {
      quizImageUrl = req.body.imageUrl;
    }

    // 문제 및 선택지 이미지 처리
    const updatedQuestions = await Promise.all(
      parsedQuestions.map(async (question, index) => {
        const questionImageKey = `questionImages_${index}`;

        // 문제 이미지 처리 (파일과 URL 둘 다 처리)
        const questionFile = req.files.find(
          (file) => file.fieldname === questionImageKey
        );
        if (questionFile) {
          const uploadedQuestionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${questionFile.key}`;
          question.imageUrl = uploadedQuestionImageUrl;
        } else if (question.imageUrl) {
          question.imageUrl = question.imageUrl; // URL 처리
        }

        // 선택지 이미지 처리 (파일과 URL 둘 다 처리)
        question.options = await Promise.all(
          question.options.map(async (option, optIndex) => {
            const optionImageKey = `optionImages_${index}_${optIndex}`;
            const optionFile = req.files.find(
              (file) => file.fieldname === optionImageKey
            ); // find로 필드 검색
            if (optionFile) {
              const uploadedOptionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${optionFile.key}`;
              option.imageUrl = uploadedOptionImageUrl;
            } else if (option.imageUrl) {
              option.imageUrl = option.imageUrl; // URL 처리
            }
            return option;
          })
        );

        return question;
      })
    );

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
    console.error("Error creating quiz:", error);
    res.status(500).send({ error: "퀴즈 생성 실패" });
  }
};

// 퀴즈 이미지 업로드 처리
exports.uploadQuizImage = uploadMultiple;

exports.deleteQuiz = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const userId = req.user._id;

    // 퀴즈를 찾고 작성자만 삭제 가능하게 설정
    const quiz = await KahootQuizContent.findById(quizId);
    if (!quiz)
      return res.status(404).json({ error: "퀴즈가 존재하지 않습니다." });
    if (quiz.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    await KahootQuizContent.findByIdAndDelete(quizId);
    res.status(200).json({ message: "퀴즈가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: "퀴즈 삭제 중 오류가 발생했습니다." });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;

    // 기존 퀴즈 찾기
    const quiz = await KahootQuizContent.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "퀴즈를 찾을 수 없습니다." });
    }

    // 제목, 학년, 학기, 과목, 단원 정보 업데이트
    quiz.title = req.body.title;
    quiz.grade = req.body.grade;
    quiz.semester = req.body.semester;
    quiz.subject = req.body.subject;
    quiz.unit = req.body.unit;

    quiz.imageUrl = null;

    // 퀴즈 전체 이미지 처리 (업로드된 파일이 있으면 S3 URL로, 없으면 입력된 URL로 처리)
    if (req.files) {
      const imageFile = req.files.find((file) => file.fieldname === "image");
      if (imageFile) {
        quiz.imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${imageFile.key}`;
      }
    }

    // 이미지가 없을 경우 입력된 URL을 사용
    if (!quiz.imageUrl && req.body.imageUrl) {
      quiz.imageUrl = req.body.imageUrl;
    }

    // 질문 목록을 업데이트 (새 질문 및 기존 질문 업데이트)
    const updatedQuestions = JSON.parse(req.body.questions).map(
      (question, index) => {
        const questionImageKey = `questionImages_${index}`;
        const questionFile = req.files.find(
          (file) => file.fieldname === questionImageKey
        );
        if (questionFile) {
          const uploadedQuestionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${questionFile.key}`;
          question.imageUrl = uploadedQuestionImageUrl;
        } else if (question.imageUrl) {
          question.imageUrl = question.imageUrl; // URL 처리
        }

        // 선택지 이미지 처리
        question.options = question.options.map((option, optIndex) => {
          const optionImageKey = `optionImages_${index}_${optIndex}`;
          const optionFile = req.files.find(
            (file) => file.fieldname === optionImageKey
          ); // find로 필드 검색
          if (optionFile) {
            const uploadedOptionImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${optionFile.key}`;
            option.imageUrl = uploadedOptionImageUrl;
          } else if (option.imageUrl) {
            option.imageUrl = option.imageUrl; // URL 처리
          }
          return option;
        });

        return question;
      }
    );

    quiz.questions = updatedQuestions;

    // 데이터 저장
    await quiz.save();
    res.status(200).json(quiz);
  } catch (error) {
    console.error("퀴즈 수정 중 오류:", error);
    res.status(500).json({ error: "퀴즈 수정에 실패했습니다." });
  }
};

exports.duplicateQuiz = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const userId = req.user._id;

    // 원본 퀴즈 찾기
    const originalQuiz = await KahootQuizContent.findById(quizId);
    if (!originalQuiz) {
      return res.status(404).json({ error: "복제할 퀴즈를 찾을 수 없습니다." });
    }

    // 제목을 "기존 제목의 복제본"으로 설정
    const clonedTitle = `${originalQuiz.title}의 복제본`;

    // 복제된 퀴즈 데이터 생성
    const duplicatedQuiz = new KahootQuizContent({
      title: clonedTitle,
      grade: originalQuiz.grade,
      subject: originalQuiz.subject,
      semester: originalQuiz.semester,
      unit: originalQuiz.unit,
      questions: originalQuiz.questions,
      createdBy: userId, // 복제한 사용자 ID로 설정
      imageUrl: originalQuiz.imageUrl, // 이미지 URL 복사
      likes: [], // 복제된 퀴즈는 좋아요가 초기화됩니다.
      likeCount: 0, // 좋아요 수 초기화
    });

    // 복제된 퀴즈 저장
    await duplicatedQuiz.save();

    res.status(201).json({
      message: "퀴즈가 성공적으로 복제되었습니다.",
      quizId: duplicatedQuiz._id,
    });
  } catch (error) {
    console.error("퀴즈 복제 중 오류:", error);
    res.status(500).json({ error: "퀴즈 복제에 실패했습니다." });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      gradeFilter,
      semesterFilter,
      subjectFilter,
      unitFilter,
      sortBy = "latest",
      createdBy,
    } = req.query;

    // 필터 조건 적용
    const filter = {};
    if (gradeFilter) filter.grade = gradeFilter;
    if (semesterFilter) filter.semester = semesterFilter;
    if (subjectFilter) filter.subject = subjectFilter;
    if (unitFilter) filter.unit = unitFilter;
    if (createdBy) filter.createdBy = createdBy; // 생성자 필터 추가 (내 퀴즈함 기능용)

    // 정렬 조건 설정
    let sortOption = {};
    if (sortBy === "likes") {
      sortOption = { likeCount: -1 }; // 좋아요 순 내림차순
    } else {
      sortOption = { createdAt: -1 }; // 최신 순 내림차순
    }

    // 필터 조건에 맞는 전체 퀴즈 개수
    const totalCount = await KahootQuizContent.countDocuments(filter);

    // 필터와 정렬이 적용된 데이터 조회 및 페이지네이션 적용
    const quizzes = await KahootQuizContent.find(filter)
      .sort(sortOption) // 정렬 적용
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select(
        "_id title grade subject semester unit questions createdBy createdAt likes likeCount imageUrl"
      );

    // 사용자 좋아요 상태 추가
    const userId = req.user._id;
    const quizzesWithDetails = quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      grade: quiz.grade,
      subject: quiz.subject,
      semester: quiz.semester,
      unit: quiz.unit || "단원 없음",
      questionsCount: quiz.questions.length,
      createdBy: quiz.createdBy,
      createdAt: quiz.createdAt,
      likeCount: quiz.likeCount,
      imageUrl: quiz.imageUrl,
      userLiked: quiz.likes.includes(userId),
    }));

    res.status(200).json({ quizzes: quizzesWithDetails, totalCount });
  } catch (error) {
    console.error("퀴즈 목록을 가져오는 중 오류 발생:", error);
    res.status(500).json({ error: "퀴즈 목록을 가져오는 데 실패했습니다." });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await KahootQuizContent.findById(quizId);

    if (!quiz) {
      return res.status(404).send({ error: "퀴즈를 찾을 수 없습니다." });
    }

    res.status(200).send(quiz);
  } catch (error) {
    res.status(500).send({ error: "퀴즈 데이터를 가져오는 데 실패했습니다." });
  }
};

// 좋아요 토글 기능
exports.toggleLike = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const userId = req.user._id;

    const quiz = await KahootQuizContent.findById(quizId);

    if (!quiz) {
      return res.status(404).send({ error: "퀴즈를 찾을 수 없습니다." });
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
    res.status(500).send({ error: "좋아요 처리 중 오류가 발생했습니다." });
  }
};

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자 생성
}

// 고유한 6자리 이상의 PIN 생성 함수
async function generateUniquePIN() {
  let pin = generatePIN(); // 랜덤으로 6자리 PIN 생성
  let isPinUnique = false;

  while (!isPinUnique) {
    const existingSession = await redisClient.get(`session:pin:${pin}`); // PIN을 기준으로 Redis에서 조회
    if (!existingSession) {
      isPinUnique = true;
    } else {
      pin = generatePIN(); // 중복된 경우 다시 PIN 생성
    }
  }

  return pin;
}

// 대기 중인 학생들을 관리하기 위한 객체
const waitingStudents = {};

// 세션 시작 시 초기화
exports.startQuizSession = async (req, res) => {
  try {
    const isTeamMode = req.body.isTeamMode; // isTeamMode 값을 body에서 가져옴
    const quizId = req.params.quizId; // req.params.quizId로 quizId 값을 가져옴
    // 고유한 PIN 생성
    const pin = await generateUniquePIN();

    // 새로운 세션 생성
    const newSession = new KahootQuizSession({
      quizContent: quizId,
      teacher: req.user._id,
      isTeamMode,
      pin, // 고유 PIN 저장
      // participants: [], // 학생 참여 목록 초기화
    });

    await newSession.save();

    // 세션을 Redis에 캐시
    await redisClient.set(
      `session:${pin}`,
      JSON.stringify({
        quizContent: quizId,
        teacher: req.user._id,
        isTeamMode,
        pin,
        sessionId: newSession._id,
        currentQuestionId: null,
        isQuestionActive: false, // 문제 풀이 중인지 여부를 나타내는 플래그 추가
      }),
      {
        EX: 3600,
      }
    );

    // 대기 중인 학생 초기화
    waitingStudents[pin] = [];

    res.status(201).send({ pin, sessionId: newSession._id });
  } catch (error) {
    console.error("Error starting quiz session:", error);
    res.status(500).send({ error: "퀴즈 세션 시작 실패" });
  }
};

// 학생 퀴즈 세션 참여
exports.joinQuizSession = async (req, res) => {
  try {
    const { pin } = req.body;
    const studentId = req.user._id;

    const sessionData = await redisClient.get(`session:${pin}`);
    if (!sessionData) {
      return res.status(404).send({ error: "세션을 찾을 수 없습니다." });
    }

    res.status(200).send({ message: "세션에 성공적으로 참여했습니다." });
  } catch (error) {
    console.error("Error joining quiz session:", error);
    res.status(500).send({ error: "퀴즈 세션 참여 실패" });
  }
};

const kahootClients = {}; // 각 세션의 클라이언트를 저장하는 객체

const broadcastToTeacher = (pin, message) => {
  const session = kahootClients[pin]; // 해당 세션의 교사와 학생들이 저장된 객체
  if (session && session.teacher) {
    // 교사 웹소켓 연결이 있는 경우 메시지를 전송
    session.teacher.send(JSON.stringify(message));
    logger.info(
      `Message sent to teacher of session ${pin}: ${JSON.stringify(message)}`
    );
  } else {
    logger.warn(`Teacher for session ${pin} not found.`);
  }
};

// 특정 핀(pin)으로 세션에 연결된 학생들에게 메시지 전송
const broadcastToStudents = (pin, message) => {
  // 해당 세션에 연결된 학생들이 있는지 확인
  if (kahootClients[pin] && kahootClients[pin].students) {
    // 학생 목록을 순회하며 각 WebSocket에 메시지 전송
    Object.values(kahootClients[pin].students).forEach((studentWs) => {
      if (studentWs.readyState === studentWs.OPEN) {
        studentWs.send(JSON.stringify(message)); // 메시지를 JSON 형식으로 변환하여 전송
      }
    });
  } else {
    console.error(`No students connected for session with pin: ${pin}`);
  }
};

const broadcastToActiveStudents = async (pin, message) => {
  const participantKeys = await redisClient.keys(
    `session:${pin}:participant:*`
  );
  const activeStudentIds = participantKeys.map((key) => key.split(":")[3]); // studentId 추출

  if (kahootClients[pin] && kahootClients[pin].students) {
    Object.entries(kahootClients[pin].students).forEach(
      ([studentId, studentWs]) => {
        if (
          studentWs.readyState === studentWs.OPEN &&
          activeStudentIds.includes(studentId)
        ) {
          studentWs.send(JSON.stringify(message));
        }
      }
    );
  } else {
    console.error(`No students connected for session with pin: ${pin}`);
  }
};

// 교사 웹소켓 핸들러
exports.handleTeacherWebSocketConnection = async (ws, teacherId, pin) => {
  if (!kahootClients[pin]) {
    kahootClients[pin] = {
      teacher: null,
      students: {},
    };
  }

  kahootClients[pin].teacher = ws;
  logger.info(`Teacher connected to session: ${pin}`);

  let session = await redisClient.get(`session:${pin}`);
  session = JSON.parse(session);

  // Redis에서 questionContent를 조회
  let questionContent = await redisClient.get(
    `questionContent:${session.quizContent}`
  );

  // Redis에서 콘텐츠를 찾지 못한 경우 DB에서 조회 후 캐싱
  if (!questionContent) {
    questionContent = await KahootQuizContent.findById(
      session.quizContent
    ).select("questions");

    if (!questionContent) {
      ws.send(JSON.stringify({ error: "Quiz content not found" }));
      return;
    }

    // Redis에 퀴즈 콘텐츠 캐싱 (1시간 만료)
    await redisClient.set(
      `questionContent:${session.quizContent}`,
      JSON.stringify(questionContent),
      { EX: 3600 }
    );
    logger.info(
      `Quiz content for quizId ${session.quizContent} cached in Redis`
    );
  } else {
    questionContent = JSON.parse(questionContent);
    // 캐시 만료 시간 갱신 (1시간 연장)
    await redisClient.expire(`questionContent:${session.quizContent}`, 3600);
    logger.info(
      `Quiz content expiration refreshed for quizId ${session.quizContent}`
    );
  }

  let currentQuestionIndex = 0; // 현재 문제 인덱스를 저장

  let isAlive = true;

  ws.on("pong", () => {
    isAlive = true;
    clearTimeout(pongTimeout); // 퐁 응답이 오면 타임아웃을 취소
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      if (!isAlive) {
        logger.warn(
          `Teacher connection for pin ${pin} did not respond to ping, terminating connection`
        );
        ws.terminate();
      } else {
        isAlive = false;
        ws.ping();
        logger.info(`Ping sent to teacher for pin ${pin}`);

        // 퐁 응답 타임아웃 설정
        pongTimeout = setTimeout(() => {
          if (!isAlive) {
            logger.warn(
              `Teacher connection for pin ${pin} did not respond to pong within 5 seconds, terminating connection`
            );
            ws.terminate();
          }
        }, 5000); // 7초 타임아웃
      }
    }
  }, 10000); // 10초마다 핑 전송

  ws.on("close", async () => {
    clearInterval(pingInterval);

    if (kahootClients[pin] && kahootClients[pin].students) {
      Object.values(kahootClients[pin].students).forEach((studentWs) => {
        if (studentWs.readyState === WebSocket.OPEN) {
          studentWs.send(JSON.stringify({ type: "sessionEnded" }));
        }
      });
    }

    try {
      // Redis에서 세션 ID 가져오기
      const sessionData = await redisClient.get(`session:${pin}`);
      if (!sessionData) {
        logger.warn(`No session data found for pin: ${pin}`);
        return;
      }

      const { sessionId } = JSON.parse(sessionData);

      delete kahootClients[pin];

      await redisClient.del(`session:${pin}`);
      const participantKeys = await redisClient.keys(
        `session:${pin}:participant:*`
      );
      await Promise.all(participantKeys.map((key) => redisClient.del(key)));

      try {
        await KahootQuizSession.findByIdAndDelete(sessionId);
        logger.info(`Session ${sessionId} deleted from database.`);
      } catch (error) {
        logger.error(
          `Error deleting session ${sessionId} from database:`,
          error
        );
      }

      logger.info(`Session ${pin} closed and all participants disconnected.`);
    } catch (error) {
      logger.error(`Error handling session close for pin ${pin}:`, error);
    }
  });

  ws.on("error", (error) => {
    logger.error(
      `Error occurred on teacher connection for pin ${pin}: ${error}`
    );
    clearInterval(pingInterval);
    // ... 기존 오류 처리 ...
  });

  ws.on("message", async (message) => {
    const parsedMessage = JSON.parse(message);
    let session = await redisClient.get(`session:${pin}`);
    session = JSON.parse(session);

    if (parsedMessage.type === "startQuiz") {
      //1. 준비 중 메시지를 먼저 교사와 학생들에게 전송
      const readyMessage = {
        type: "quizStartingSoon", // 준비 상태를 나타내는 메시지 타입
        message: "퀴즈가 곧 시작됩니다", // 준비 화면에서 보여줄 메시지
        totalQuestions: questionContent.questions.length,
      };

      // currentQuestionId 업데이트
      session.isQuestionActive = true;
      session.currentQuestionId = questionContent.questions[0]._id.toString();
      logger.info("session.currentQuestionId", session.currentQuestionId);
      await redisClient.set(`session:${pin}`, JSON.stringify(session));

      // 교사와 학생들에게 준비 중 메시지를 전송
      ws.send(JSON.stringify(readyMessage)); // 교사에게 전송
      broadcastToActiveStudents(pin, readyMessage); // 학생들에게 전송

      // 2. 잠시 대기 (예: 3초 후에 첫 번째 문제 전송)
      setTimeout(async () => {
        const currentTime = Date.now();
        const timeLimit = questionContent.questions[0].timeLimit * 1000; // 밀리초로 변환
        const bufferTime = 2000;
        const endTime = currentTime + timeLimit + bufferTime; // 종료 시간 계산
        // 첫 번째 문제 전송 로직 (기존 로직 그대로)
        ws.send(
          JSON.stringify({
            type: "quizStarted",
            questionId: questionContent.questions[0]._id, // 첫 번째 문제 ID
            currentQuestion: questionContent.questions[0], // 첫 번째 문제 내용
            questionNumber: 1,
            totalQuestions: questionContent.questions.length,
            // timeLimit: questionContent.questions[0].timeLimit
            endTime: endTime, // 종료 시간 전송
          })
        );

        const questionOptions = questionContent.questions[0].options.map(
          (option) => ({ text: option.text, imageUrl: option.imageUrl })
        );
        broadcastToActiveStudents(pin, {
          type: "newQuestionOptions", // 학생들에게는 선택지만 전송
          questionId: questionContent.questions[0]._id,
          // timeLimit: questionContent.questions[0].timeLimit,
          options: questionOptions,
          endTime: endTime,
        });
      }, 3000); // 3초 대기 후 첫 번째 문제 전송
    }

    // 교사가 'nextQuestion' 메시지를 보내면 다음 문제로 이동
    if (parsedMessage.type === "nextQuestion") {
      currentQuestionIndex++; // 다음 문제로 이동
      const participantKeys = await redisClient.keys(
        `session:${pin}:participant:*`
      );
      await Promise.all(
        participantKeys.map(async (key) => {
          const participantData = await redisClient.get(key);
          const participant = JSON.parse(participantData);
          participant.hasSubmitted = false;
          await redisClient.set(key, JSON.stringify(participant), { EX: 3600 });
        })
      );

      // Redis에서 콘텐츠 만료 시간 갱신
      await redisClient.expire(`questionContent:${session.quizContent}`, 3600);

      const nextQuestion = questionContent.questions[currentQuestionIndex];

      // currentQuestionId 업데이트
      session.isQuestionActive = true;
      session.currentQuestionId = nextQuestion._id.toString();
      await redisClient.set(`session:${pin}`, JSON.stringify(session));

      if (nextQuestion) {
        // 1. 먼저 준비 화면 전송

        const isLastQuestion =
          currentQuestionIndex === questionContent.questions.length - 1;

        const readyMessage = {
          type: "preparingNextQuestion", // 준비 상태를 나타내는 메시지 타입
          message: isLastQuestion
            ? "마지막 문제입니다..."
            : "다음 문제가 곧 출제됩니다...",
          isLastQuestion: isLastQuestion, // 마지막 문제 여부 추가
        };
        ws.send(JSON.stringify(readyMessage)); // 교사에게 전송
        broadcastToActiveStudents(pin, readyMessage); // 학생들에게 전송

        // 2. 3초 대기 후 실제 문제 전송
        setTimeout(() => {
          const currentTime = Date.now();
          const timeLimit = nextQuestion.timeLimit * 1000; // 밀리초로 변환
          const bufferTime = 2000;
          const endTime = currentTime + timeLimit + bufferTime; // 종료 시간 계산
          ws.send(
            JSON.stringify({
              type: "newQuestion",
              questionId: nextQuestion._id, // 문제 ID
              currentQuestion: nextQuestion, // 교사에게 문제와 보기 전송
              questionNumber: currentQuestionIndex + 1,
              totalQuestions: questionContent.questions.length,
              // timeLimit: nextQuestion.timeLimit,
              isLastQuestion: isLastQuestion, // 마지막 문제 여부 추가
              endTime: endTime, // 종료 시간 전송
            })
          );

          // 학생들에게는 보기만 전송
          const questionOptions = nextQuestion.options.map((option) => ({
            text: option.text,
            imageUrl: option.imageUrl,
          }));
          broadcastToActiveStudents(pin, {
            type: "newQuestionOptions", // 학생들에게는 선택지만 전송
            questionId: nextQuestion._id, // 문제 ID
            // timeLimit: nextQuestion.timeLimit,
            endTime: endTime,
            options: questionOptions,
            isLastQuestion: isLastQuestion, // 마지막 문제 여부 추가
          });
        }, 3000); // 3초 후 문제 전송
      } else {
        // 문제가 더 이상 없으면 퀴즈 종료
        broadcastToActiveStudents(pin, { type: "quizCompleted" });
        ws.send(JSON.stringify({ type: "quizCompleted" }));
      }
    }

    // 교사가 'endQuiz' 메시지를 보낼 때 세션 종료 처리
    if (parsedMessage.type === "endQuiz") {
      try {
        const quizResults = [];
        const participantKeys = await redisClient.keys(
          `session:${pin}:participant:*`
        );
        const allParticipants = await Promise.all(
          participantKeys.map(async (key) => {
            const data = await redisClient.get(key);
            return JSON.parse(data);
          })
        );
        for (let participant of allParticipants) {
          if (participant.responses.length === 0) {
            // responses 배열이 비어 있는 참가자는 건너뜁니다.
            continue;
          }

          const correctAnswers = participant.responses.filter(
            (r) => r.isCorrect
          ).length;
          const totalQuestions = participant.responses.length;
          const totalScore = (correctAnswers / totalQuestions) * 100;

          const quizContent = await KahootQuizContent.findById(
            session.quizContent
          ).select("subject semester unit");

          // studentId와 quizId의 조합으로 결과 저장 또는 업데이트
          const quizResult = await QuizResult.findOneAndUpdate(
            { studentId: participant.student, quizId: session.quizContent },
            {
              studentId: participant.student,
              quizId: session.quizContent,
              subject: quizContent.subject,
              semester: quizContent.semester,
              unit: quizContent.unit,
              results: participant.responses.map((r) => ({
                questionId: r.question,
                studentAnswer: r.answer,
                isCorrect: r.isCorrect,
              })),
              score: totalScore,
              createdAt: new Date(),
            },
            { upsert: true, new: true } // upsert 옵션으로 존재하지 않으면 생성
          );
          quizResults.push(quizResult);
        }

        // 2. 학생들에게 세션 종료 신호 전송
        broadcastToStudents(pin, {
          type: "sessionEnded",
          message: "퀴즈가 종료되었습니다.",
        });
        ws.send(
          JSON.stringify({
            type: "sessionEnded",
            message: "퀴즈가 종료되었습니다.",
          })
        );

        // 3. Redis에서 세션 데이터 삭제
        await redisClient.del(`session:${pin}`);
        await Promise.all(participantKeys.map((key) => redisClient.del(key)));
        logger.info(`Session ${pin} deleted from Redis.`);

        // 대기열 초기화
        delete waitingStudents[pin];

        // 4. 웹소켓 연결 종료 (옵션)
        Object.values(kahootClients[pin].students).forEach((studentWs) => {
          if (studentWs.readyState === studentWs.OPEN) {
            studentWs.close();
          }
        });
        ws.close();
        delete kahootClients[pin]; // 세션 클라이언트 데이터 삭제

        logger.info(`Session ${pin} closed and participants disconnected.`);
      } catch (error) {
        console.error("Error during quiz session end:", error);
        ws.send(JSON.stringify({ error: "퀴즈 종료 중 오류가 발생했습니다." }));
      }
    }
    // 교사가 결과 자세히 보기를 요청할 때
    if (parsedMessage.type === "viewDetailedResults") {
      const participantKeys = await redisClient.keys(
        `session:${pin}:participant:*`
      );
      const participantsResults = await Promise.all(
        participantKeys.map(async (key) => {
          const participantData = await redisClient.get(key);
          const participant = JSON.parse(participantData);
          return {
            studentId: participant.student,
            name: participant.name,
            score: participant.score,
            responses: participant.responses.map((response) => ({
              questionId: response.question,
              answer: response.answer,
              isCorrect: response.isCorrect,
            })),
          };
        })
      );

      // 교사에게 결과 데이터를 전송
      ws.send(
        JSON.stringify({
          type: "detailedResults",
          results: participantsResults,
        })
      );
    }
  });
};

exports.handleStudentWebSocketConnection = async (ws, studentId, pin) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      ws.send(JSON.stringify({ error: "Student not found" }));
      ws.close();
      return;
    }

    kahootClients[pin].students[studentId] = ws;
    logger.info(`Student connected to session: ${pin}`);

    let session = await redisClient.get(`session:${pin}`);
    if (!session) {
      ws.send(JSON.stringify({ error: "Session not found" }));
      ws.close();
      return;
    }
    session = JSON.parse(session);

    let questionContent = await redisClient.get(
      `questionContent:${session.quizContent}`
    );
    if (!questionContent) {
      ws.send(JSON.stringify({ error: "Quiz content not found" }));
      return;
    }
    questionContent = JSON.parse(questionContent);

    let isAlive = true;

    ws.on("pong", () => {
      isAlive = true;
      clearTimeout(pongTimeout); // 퐁 응답이 오면 타임아웃을 취소
    });

    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        if (!isAlive) {
          logger.warn(
            `Student connection for pin ${pin} did not respond to ping, terminating connection`
          );
          ws.terminate();
        } else {
          isAlive = false;
          ws.ping();
          logger.info(`Ping sent to student for pin ${pin}`);

          // 퐁 응답 타임아웃 설정
          pongTimeout = setTimeout(() => {
            if (!isAlive) {
              logger.warn(
                `Student connection for pin ${pin} did not respond to pong within 5 seconds, terminating connection`
              );
              ws.terminate();
            }
          }, 5000); // 7초 타임아웃
        }
      }
    }, 10000); // 10초마다 핑 전송

    ws.on("close", async () => {
      clearInterval(pingInterval);
      const student = await Student.findById(studentId);

      // 클라이언트 목록에서 제거하기 전에 존재 여부 확인
      if (kahootClients[pin] && kahootClients[pin].students) {
        delete kahootClients[pin].students[studentId];
      }

      // 대기명단에서 학생 제거
      if (waitingStudents[pin]) {
        waitingStudents[pin] = waitingStudents[pin].filter(
          (id) => id !== studentId
        );
      }

      // 세션 데이터 업데이트 (예: Redis에서 상태 변경)
      const participantKey = `session:${pin}:participant:${studentId}`;
      redisClient.del(participantKey);

      // 남아 있는 학생 수 확인
      if (kahootClients[pin] && kahootClients[pin].students) {
        const remainingStudents = Object.keys(
          kahootClients[pin].students
        ).length;
        // 만약 남아 있는 학생이 없다면 알림
        if (remainingStudents === 0) {
          broadcastToTeacher(pin, {
            type: "studentDisconnected",
            studentId: studentId,
            name: student.name,
          });
          broadcastToTeacher(pin, {
            type: "noStudentsRemaining", // 새로운 메시지 타입 추가
            message: "모든 학생이 퀴즈를 떠났습니다. 세션을 종료하시겠습니까?",
          });
          return; // 남아 있는 학생이 없으므로 아래 로직을 건너뜁니다.
        } else {
          broadcastToTeacher(pin, {
            type: "studentDisconnected",
            studentId: studentId,
            name: student.name,
          });
        }
      }
      // 로그 기록
      logger.info(`Student ${studentId} disconnected from session: ${pin}`);

      // 모든 학생이 제출했는지 확인
      const participantKeys = await redisClient.keys(
        `session:${pin}:participant:*`
      );

      const sessionData = await redisClient.get(`session:${pin}`);
      if (!sessionData) {
        return;
      }
      const session = JSON.parse(sessionData);
      const questionId = session.currentQuestionId;
      logger.info("questionId", questionId);

      // questionId가 null이면 아직 퀴즈가 시작되지 않았으므로 아래 로직을 건너뜁니다.
      if (!questionId) {
        return;
      }

      const currentQuestion = questionContent.questions.find(
        (q) => q._id.toString() === questionId
      );
      if (!currentQuestion) {
        ws.send(JSON.stringify({ error: "Invalid question ID" }));
        return;
      }

      // console.log("currentQuestion", currentQuestion);
      // logger.info("currentQuestion", currentQuestion);

      const allParticipants = await Promise.all(
        participantKeys.map(async (key) => {
          const data = await redisClient.get(key);
          return JSON.parse(data);
        })
      );

      // console.log("allParticipants", allParticipants);
      // logger.info("allParticipants", allParticipants);

      const allSubmitted = allParticipants.every((p) => p.hasSubmitted);

      if (allSubmitted) {
        allParticipants.forEach(async (participant) => {
          const studentWs = kahootClients[pin].students[participant.student];
          if (studentWs && studentWs.readyState === WebSocket.OPEN) {
            const response = participant.responses.find(
              (r) => r.question.toString() === currentQuestion._id.toString()
            );

            studentWs.send(
              JSON.stringify({
                type: "feedback",
                correct: response.isCorrect,
                score: participant.score,
                teamScore: session.isTeamMode ? team.teamScore : null,
              })
            );
          }

          // 피드백을 보낸 후 제출 여부를 false로 설정
          participant.hasSubmitted = false;
          const participantKey = `session:${pin}:participant:${participant.student}`;
          await redisClient.set(participantKey, JSON.stringify(participant), {
            EX: 3600,
          });
        });

        broadcastToTeacher(pin, {
          type: "allStudentsSubmitted",
          feedback: allParticipants
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
              studentId: p.student,
              name: p.name,
              score: p.score,
              isCorrect: p.responses[p.responses.length - 1].isCorrect,
              rank: index + 1,
            })),
        });

        session.isQuestionActive = false;
        await redisClient.set(`session:${pin}`, JSON.stringify(session), {
          EX: 3600,
        });
        // 대기 중인 학생 추가
        const studentsToAdd = waitingStudents[pin] || [];
        for (const { id: studentId, character } of studentsToAdd) {
          const student = await Student.findById(studentId);
          if (student) {
            const participantKey = `session:${pin}:participant:${studentId}`;
            const participantData = {
              student: studentId,
              name: student.name,
              score: 0,
              responses: [],
              status: "joined",
              hasSubmitted: false,
              character: character,
            };
            await redisClient.set(
              participantKey,
              JSON.stringify(participantData),
              {
                EX: 3600,
              }
            );
          }

          broadcastToTeacher(pin, {
            type: "studentJoined",
            studentId: studentId,
            name: student.name,
            character: character,
            isReady: true,
          });
          console.log(
            `Notified teacher about student ${studentId} joining with character ${character}`
          );
        }
        // 대기열 초기화
        waitingStudents[pin] = [];
      }
    });

    ws.on("error", (error) => {
      logger.error(
        `Error occurred on student connection for pin ${pin}: ${error}`
      );
      clearInterval(pingInterval);
      // ... 기존 오류 처리 ...
    });

    ws.on("message", async (message) => {
      const parsedMessage = JSON.parse(message);
      console.log(`Received message from student ${studentId}:`, parsedMessage);

      try {
        let session = await redisClient.get(`session:${pin}`);
        if (!session) {
          ws.send(JSON.stringify({ error: "Session not found" }));
          ws.close();
          return;
        }
        session = JSON.parse(session);

        if (parsedMessage.type === "characterSelected") {
          const character = parsedMessage.character;

          if (session.isQuestionActive) {
            // 문제 풀이 중이면 대기열에 추가 (중복 방지)
            if (
              !waitingStudents[pin].some((student) => student.id === studentId)
            ) {
              waitingStudents[pin].push({ id: studentId, character });
            }
            ws.send(
              JSON.stringify({
                message: "대기 중입니다. 잠시 후 참여 가능합니다.",
              })
            );
            return;
          }

          // 대기 중이 아니면 바로 추가
          if (!student) {
            ws.send(JSON.stringify({ error: "학생을 찾을 수 없습니다." }));
            return;
          }

          const participantKey = `session:${pin}:participant:${studentId}`;
          const existingParticipant = await redisClient.get(participantKey);
          if (existingParticipant) {
            ws.send(JSON.stringify({ error: "Already joined" }));
            return;
          }

          const participantData = {
            student: studentId,
            name: student.name,
            score: 0,
            responses: [],
            status: "ready",
            hasSubmitted: false, // 제출 여부 초기값 설정
            character: character,
          };

          await redisClient.set(
            participantKey,
            JSON.stringify(participantData),
            {
              EX: 3600,
            }
          );

          broadcastToTeacher(pin, {
            type: "studentJoined",
            studentId: studentId,
            name: student.name,
            character: character,
            isReady: true,
          });
          console.log(
            `Notified teacher about student ${studentId} joining with character ${character}`
          );

          // 학생들에게도 캐릭터 선택을 알림 (자신 제외)
          Object.entries(kahootClients[pin].students).forEach(
            ([id, studentWs]) => {
              if (studentWs.readyState === WebSocket.OPEN && id !== studentId) {
                studentWs.send(
                  JSON.stringify({
                    type: "characterSelected",
                    studentId: studentId,
                    character: character,
                  })
                );
              }
            }
          );

          ws.send(
            JSON.stringify({
              type: "characterAcknowledged",
              message: "Character selection successful",
            })
          );
        }

        if (parsedMessage.type === "submitAnswer") {
          const { questionId, answerIndex, responseTime } = parsedMessage;

          const currentQuestion = questionContent.questions.find(
            (q) => q._id.toString() === questionId
          );
          if (!currentQuestion) {
            ws.send(JSON.stringify({ error: "Invalid question ID" }));
            return;
          }

          let isCorrect = false;
          if (answerIndex !== -1) {
            isCorrect =
              Number(currentQuestion.correctAnswer) === Number(answerIndex);
          }

          const participantKey = `session:${pin}:participant:${studentId}`;
          const participantData = await redisClient.get(participantKey);

          if (participantData) {
            const participant = JSON.parse(participantData);
            participant.responses.push({
              question: currentQuestion._id,
              answer: answerIndex !== -1 ? answerIndex : null,
              isCorrect: isCorrect,
              responseTime: responseTime,
            });

            const maxScore = 1000;
            const baseScore = 500;
            const responseTimeInSeconds = responseTime / 1000;
            const timeFactor =
              Math.max(0, currentQuestion.timeLimit - responseTimeInSeconds) /
              currentQuestion.timeLimit;

            if (isCorrect) {
              const score =
                baseScore + Math.floor((maxScore - baseScore) * timeFactor);
              participant.score += score;

              if (session.isTeamMode) {
                const team = session.teams.find((t) =>
                  t.members.includes(studentId)
                );
                if (team) {
                  team.teamScore += score;
                }
              }
            }

            participant.hasSubmitted = true;

            await redisClient.set(participantKey, JSON.stringify(participant), {
              EX: 3600,
            });

            broadcastToTeacher(pin, {
              type: "studentSubmitted",
              studentId: studentId,
              name: student.name,
              character: participant.character,
            });

            // Check if all participants have submitted
            const participantKeys = await redisClient.keys(
              `session:${pin}:participant:*`
            );
            const allParticipants = await Promise.all(
              participantKeys.map(async (key) => {
                const data = await redisClient.get(key);
                return JSON.parse(data);
              })
            );

            const allSubmitted = allParticipants.every((p) => p.hasSubmitted);

            if (allSubmitted) {
              allParticipants.forEach(async (participant) => {
                const studentWs =
                  kahootClients[pin].students[participant.student];
                if (studentWs && studentWs.readyState === WebSocket.OPEN) {
                  const response = participant.responses.find(
                    (r) =>
                      r.question.toString() === currentQuestion._id.toString()
                  );

                  studentWs.send(
                    JSON.stringify({
                      type: "feedback",
                      correct: response.isCorrect,
                      score: participant.score,
                      teamScore: session.isTeamMode ? team.teamScore : null,
                    })
                  );
                }

                // 피드백을 보낸 후 제출 여부를 false로 설정
                participant.hasSubmitted = false;
                const participantKey = `session:${pin}:participant:${participant.student}`;
                await redisClient.set(
                  participantKey,
                  JSON.stringify(participant),
                  {
                    EX: 3600,
                  }
                );
              });

              broadcastToTeacher(pin, {
                type: "allStudentsSubmitted",
                feedback: allParticipants
                  .sort((a, b) => b.score - a.score)
                  .map((p, index) => ({
                    studentId: p.student,
                    name: p.name,
                    score: p.score,
                    isCorrect: p.responses[p.responses.length - 1].isCorrect,
                    rank: index + 1,
                  })),
              });
              session.isQuestionActive = false;
              await redisClient.set(`session:${pin}`, JSON.stringify(session), {
                EX: 3600,
              });
              // 대기 중인 학생 추가
              const studentsToAdd = waitingStudents[pin] || [];
              for (const { id: studentId, character } of studentsToAdd) {
                const student = await Student.findById(studentId);
                if (student) {
                  const participantKey = `session:${pin}:participant:${studentId}`;
                  const participantData = {
                    student: studentId,
                    name: student.name,
                    score: 0,
                    responses: [],
                    status: "joined",
                    hasSubmitted: false,
                    character: character,
                  };
                  await redisClient.set(
                    participantKey,
                    JSON.stringify(participantData),
                    {
                      EX: 3600,
                    }
                  );
                }

                broadcastToTeacher(pin, {
                  type: "studentJoined",
                  studentId: studentId,
                  name: student.name,
                  character: character,
                  isReady: true,
                });
                console.log(
                  `Notified teacher about student ${studentId} joining with character ${character}`
                );
              }
              // 대기열 초기화
              waitingStudents[pin] = [];
            }
          } else {
            ws.send(JSON.stringify({ error: "Participant not found" }));
          }
        }

        if (parsedMessage.type === "getTakenCharacters") {
          logger.info("메세지 도착 : getTakenCharacters");
          const participantKeys = await redisClient.keys(
            `session:${pin}:participant:*`
          );
          const takenCharacters = new Set();

          for (const key of participantKeys) {
            const participantData = await redisClient.get(key);
            const participant = JSON.parse(participantData);
            if (participant.character) {
              const characterIndex =
                parseInt(participant.character.replace("character", "")) - 1;
              takenCharacters.add(characterIndex);
            }
          }

          ws.send(
            JSON.stringify({
              type: "takenCharacters",
              takenCharacters: Array.from(takenCharacters),
            })
          );
        }
      } finally {
        // await releaseLock(pin);
      }
    });
  } catch (error) {
    console.error("WebSocket error:", error);
    ws.send(
      JSON.stringify({
        error: "An error occurred during the WebSocket communication",
      })
    );
    ws.close();
  }
};
