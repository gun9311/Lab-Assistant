const KahootQuizContent = require("../models/KahootQuizContent");
const KahootQuizSession = require("../models/KahootQuizSession");
// const redisClient = require("../utils/redisClient");
const { getSessionKey, getSessionQuestionsKey } = require("../utils/redisKeys"); // redisKeys 모듈 import
const { redisJsonGet, redisJsonSet } = require("../utils/redisUtils"); // 새로운 헬퍼 함수 import
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3Client"); // S3 클라이언트 가져옴
const logger = require("../utils/logger");
const { getS3FileUrl } = require("../utils/s3Utils"); // s3Utils 모듈 import

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

// 새로운 헬퍼 함수 정의
/**
 * req.files와 fallback URL을 기반으로 최종 이미지 URL을 결정합니다.
 * @param {Array} filesArray - req.files 배열
 * @param {string} targetFieldname - 찾고자 하는 파일의 fieldname
 * @param {string} [fallbackBodyUrl=null] - 파일이 없을 경우 사용할 대체 URL
 * @returns {string|null} 결정된 이미지 URL 또는 null
 */
const determineImageUrl = (
  filesArray,
  targetFieldname,
  fallbackBodyUrl = null
) => {
  let finalImageUrl = null;

  if (filesArray) {
    const imageFile = filesArray.find(
      (file) => file.fieldname === targetFieldname
    );
    if (imageFile) {
      finalImageUrl = getS3FileUrl(imageFile.key);
    }
  }

  if (!finalImageUrl && fallbackBodyUrl) {
    finalImageUrl = fallbackBodyUrl;
  }

  return finalImageUrl;
};

exports.createQuiz = async (req, res) => {
  try {
    const { title, grade, subject, semester, unit, questions } = req.body;
    const parsedQuestions = JSON.parse(questions);

    // 퀴즈 전체 이미지 처리
    const quizImageUrl = determineImageUrl(
      req.files,
      "image",
      req.body.imageUrl
    );

    // 문제 및 선택지 이미지 처리
    const updatedQuestions = await Promise.all(
      parsedQuestions.map(async (question, index) => {
        const questionImageKey = `questionImages_${index}`;
        // 문제 이미지 처리
        question.imageUrl = determineImageUrl(
          req.files,
          questionImageKey,
          question.imageUrl // 기존 question 객체에 imageUrl이 있을 수 있음
        );

        // 선택지 이미지 처리
        question.options = await Promise.all(
          question.options.map(async (option, optIndex) => {
            const optionImageKey = `optionImages_${index}_${optIndex}`;
            option.imageUrl = determineImageUrl(
              req.files,
              optionImageKey,
              option.imageUrl // 기존 option 객체에 imageUrl이 있을 수 있음
            );
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
      imageUrl: quizImageUrl,
    });

    await newQuiz.save();
    res.status(201).send(newQuiz);
  } catch (error) {
    logger.error("Error creating quiz:", error);
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
    logger.error("퀴즈 삭제 중 오류가 발생했습니다.", error);
    res.status(500).json({ error: "퀴즈 삭제 중 오류가 발생했습니다." });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user._id; // 현재 사용자 ID 가져오기

    const quiz = await KahootQuizContent.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "퀴즈를 찾을 수 없습니다." });
    }

    // 사용자가 퀴즈의 생성자인지 확인
    if (quiz.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "퀴즈를 수정할 권한이 없습니다." });
    }

    quiz.title = req.body.title;
    quiz.grade = req.body.grade;
    quiz.semester = req.body.semester;
    quiz.subject = req.body.subject;
    quiz.unit = req.body.unit;

    // 퀴즈 전체 이미지 처리
    // req.body.imageUrl은 클라이언트가 이미지 URL을 직접 제공하거나,
    // 파일을 업로드하지 않고 기존 이미지를 유지하거나 삭제하려는 경우에 사용될 수 있습니다.
    // 업데이트 시에는 명시적으로 null로 설정하지 않으면 기존 이미지가 유지될 수 있으므로,
    // 새로운 파일이 없고 req.body.imageUrl도 없으면 null이 되도록 합니다.
    quiz.imageUrl = determineImageUrl(req.files, "image", req.body.imageUrl);

    // 질문 목록을 업데이트 (새 질문 및 기존 질문 업데이트)
    const updatedQuestions = JSON.parse(req.body.questions).map(
      (question, index) => {
        const questionImageKey = `questionImages_${index}`;
        // 문제 이미지 처리
        question.imageUrl = determineImageUrl(
          req.files,
          questionImageKey,
          question.imageUrl // 클라이언트가 보낸 questions 배열 내의 imageUrl
        );

        // 선택지 이미지 처리
        question.options = question.options.map((option, optIndex) => {
          const optionImageKey = `optionImages_${index}_${optIndex}`;
          option.imageUrl = determineImageUrl(
            req.files,
            optionImageKey,
            option.imageUrl // 클라이언트가 보낸 questions 배열 내 option의 imageUrl
          );
          return option;
        });
        return question;
      }
    );

    quiz.questions = updatedQuestions;

    await quiz.save();
    res.status(200).json(quiz);
  } catch (error) {
    logger.error("퀴즈 수정 중 오류:", error);
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
    logger.error("퀴즈 복제 중 오류:", error);
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
    logger.error("퀴즈 목록을 가져오는 중 오류 발생:", error);
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
    logger.error("퀴즈 데이터를 가져오는 데 실패했습니다.", error);
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
    logger.error("좋아요 처리 중 오류가 발생했습니다.", error);
    res.status(500).send({ error: "좋아요 처리 중 오류가 발생했습니다." });
  }
};

// PIN 생성 함수 (기존 코드 유지 또는 필요시 수정)
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateUniquePIN() {
  let pin = generatePIN(); // 랜덤으로 6자리 PIN 생성
  let isPinUnique = false;

  while (!isPinUnique) {
    const existingSession = await redisJsonGet(getSessionKey(pin));
    if (!existingSession) {
      isPinUnique = true;
    } else {
      pin = generatePIN(); // 중복된 경우 다시 PIN 생성
    }
  }

  return pin;
}

exports.startQuizSession = async (req, res) => {
  try {
    const { quizId } = req.params;
    const teacherId = req.user._id;

    // 1. 원본 KahootQuizContent 조회
    const quizContent = await KahootQuizContent.findById(quizId);
    if (!quizContent) {
      return res.status(404).send({ error: "Quiz content not found." });
    }

    // 2. 고유 PIN 생성
    const pin = await generateUniquePIN();

    // 3. KahootQuizSession 문서 생성 (단순화된 스키마 기준)
    const newSession = new KahootQuizSession({
      teacher: teacherId,
      pin: pin,
      // startedAt: 기본값으로 Date.now()가 설정됨

      // 원본 퀴즈의 메타데이터 복사
      grade: quizContent.grade,
      subject: quizContent.subject,
      semester: quizContent.semester,
      unit: quizContent.unit,
      // originalQuizImageUrl: quizContent.imageUrl, // 필요하다면 원본 퀴즈 이미지 URL도 복사

      // 질문 스냅샷 생성 (원본 질문의 _id도 포함하여 나중에 참조 가능하도록)
      questionsSnapshot: quizContent.questions.map((q) => ({
        originalQuestionId: q._id, // 원본 질문의 ObjectId
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options.map((opt) => ({
          text: opt.text,
          imageUrl: opt.imageUrl,
          // originalOptionId: opt._id // 필요시 원본 옵션 ID도 저장
        })),
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit,
        imageUrl: q.imageUrl,
      })),

      // 팀 모드 관련 정보 (요청 본문에 따라 설정, 여기서는 기본값으로 처리)
      isTeamMode: req.body.isTeamMode || false, // 요청에서 isTeamMode를 받을 수 있도록
      initialTeams:
        req.body.isTeamMode && req.body.teams
          ? req.body.teams.map((team) => ({
              teamName: team.teamName,
              memberStudentIds: team.memberStudentIds || [], // 학생 ID 배열
            }))
          : [],

      // 제거된 필드: status, endedAt, participants 등
    });

    await newSession.save();
    logger.info(
      `New KahootQuizSession created in DB. PIN: ${pin}, SessionID: ${newSession._id}`
    );

    // 4. Redis에 세션 메타데이터 및 문제 스냅샷 저장
    const sessionMetadataKey = getSessionKey(pin);
    const sessionQuestionsKey = getSessionQuestionsKey(pin);

    // Redis에 저장할 세션 메타데이터 (MongoDB ObjectId는 문자열로 변환)
    const sessionMetadataForRedis = {
      sessionId: newSession._id.toString(), // MongoDB 세션 문서의 ID
      teacherId: teacherId.toString(),
      pin: pin,
      quizContentId: quizId.toString(), // 원본 KahootQuizContent의 ID (참조용)
      // 퀴즈 진행에 필요한 초기 상태값들
      currentQuestionIndex: -1, // 퀴즈 시작 전이므로 -1 또는 null
      isQuestionActive: false,
      quizStarted: false, // 명시적으로 퀴즈 시작 여부 관리
      quizEndedByTeacher: false, // 명시적으로 교사가 종료했는지 여부
      // KahootQuizSession에 저장했던 grade, subject 등 메타데이터 추가
      grade: newSession.grade,
      subject: newSession.subject,
      semester: newSession.semester,
      unit: newSession.unit,
      isTeamMode: newSession.isTeamMode, // 팀모드 여부 추가
      // initialTeams: newSession.initialTeams, // 초기 팀 정보도 필요시 추가 (객체이므로 redis 저장시 주의)
      questionsSnapshot: newSession.questionsSnapshot.map((q) =>
        q._id.toString()
      ), // 질문 ID 목록만 저장하거나, 필요한 최소 정보만 저장 고려
    };

    // Redis에 문제 스냅샷 저장 (newSession.questionsSnapshot은 이미 plain JS 객체 배열일 것임)
    // Mongoose 문서의 toObject()나 lean()을 사용하지 않아도 될 수 있지만, 확실히 하기 위해 toObject() 사용 권장
    const questionsSnapshotForRedis = newSession.questionsSnapshot.map(
      (q) => (typeof q.toObject === "function" ? q.toObject() : q) // 각 질문 객체를 plain object로
    );

    await redisJsonSet(sessionMetadataKey, sessionMetadataForRedis, {
      EX: 3600,
    }); // 예: 1시간 TTL
    await redisJsonSet(sessionQuestionsKey, questionsSnapshotForRedis, {
      EX: 3600,
    }); // 예: 1시간 TTL

    logger.info(
      `Session metadata and questions snapshot cached in Redis for PIN: ${pin}`
    );

    res.status(201).send({
      message: "Quiz session started successfully",
      pin: pin,
      sessionId: newSession._id, // 생성된 MongoDB 세션 ID
      // 프론트엔드에서 필요하다면 다른 정보도 전달 가능
    });
  } catch (error) {
    logger.error("Error starting quiz session:", error);
    res.status(500).send({ error: "Failed to start quiz session." });
  }
};

// 학생 퀴즈 세션 참여
exports.joinQuizSession = async (req, res) => {
  try {
    const { pin } = req.body;

    const sessionData = await redisJsonGet(getSessionKey(pin));
    if (!sessionData) {
      return res.status(404).send({ error: "세션을 찾을 수 없습니다." });
    }

    res.status(200).send({ message: "세션에 성공적으로 참여했습니다." });
  } catch (error) {
    logger.error("Error joining quiz session:", error);
    res.status(500).send({ error: "퀴즈 세션 참여 실패" });
  }
};
