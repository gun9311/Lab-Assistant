const KahootQuizContent = require("../models/KahootQuizContent");
const KahootQuizSession = require("../models/KahootQuizSession");
const { redisClient } = require("../utils/redisClient");
const {
  getSessionKey,
  getSessionQuestionsKey,
  getSessionStudentIdsSetKey,
  getSessionTakenCharactersSetKey,
} = require("../utils/redisKeys"); // redisKeys 모듈 import
const { redisJsonGet, redisJsonSet } = require("../utils/redisUtils"); // redisClient 추가
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

    // 먼저 해당 퀴즈를 찾아 사용자가 이미 좋아요를 눌렀는지 확인
    const quiz = await KahootQuizContent.findById(quizId).select("likes"); // likes 필드만 가져옴

    if (!quiz) {
      return res.status(404).send({ error: "퀴즈를 찾을 수 없습니다." });
    }

    const userHasLiked = quiz.likes.includes(userId);
    let updateOperation;

    if (userHasLiked) {
      // 이미 좋아요를 누른 상태: 좋아요 취소
      updateOperation = {
        $pull: { likes: userId }, // likes 배열에서 userId 제거
        $inc: { likeCount: -1 }, // likeCount 1 감소
      };
    } else {
      // 좋아요를 누르지 않은 상태: 좋아요 추가
      updateOperation = {
        $addToSet: { likes: userId }, // likes 배열에 userId 추가 (중복 방지)
        $inc: { likeCount: 1 }, // likeCount 1 증가
      };
    }

    // findByIdAndUpdate는 업데이트된 문서를 반환할 수 있음 (옵션 new: true)
    const updatedQuiz = await KahootQuizContent.findByIdAndUpdate(
      quizId,
      updateOperation,
      { new: true } // 업데이트된 문서를 반환받아 likeCount를 응답으로 보냄
    ).select("likeCount"); // 업데이트 후 likeCount만 필요

    if (!updatedQuiz) {
      // 이론적으로는 quiz를 처음에 찾았으므로 이 경우가 발생하면 안되지만, 방어 코드
      return res
        .status(404)
        .send({ error: "퀴즈를 업데이트하는 중 찾을 수 없습니다." });
    }

    res.status(200).json({
      likeCount: updatedQuiz.likeCount,
      userLiked: !userHasLiked, // 토글된 새로운 좋아요 상태
    });
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
  let pin;
  let isPinReserved = false;
  const RESERVATION_TTL_SECONDS = 5; // 예약이 지속되는 시간 (초)
  let attempts = 0;
  const MAX_ATTEMPTS = 20; // 무한 루프 방지를 위한 최대 시도 횟수

  while (!isPinReserved && attempts < MAX_ATTEMPTS) {
    attempts++;
    pin = generatePIN(); // 랜덤으로 6자리 PIN 생성
    const sessionPinKey = getSessionKey(pin); // 예: "session:123456"

    try {
      // NX (Not eXists) 옵션: 키가 존재하지 않을 경우에만 설정합니다.
      // EX 옵션: 지정된 시간(초) 후에 키가 만료되도록 설정합니다.
      // 이 작업은 원자적으로 수행됩니다.
      const result = await redisClient.set(
        sessionPinKey,
        JSON.stringify({ status: "reserved_by_generator", ts: Date.now() }), // 임시 예약 값
        "EX",
        RESERVATION_TTL_SECONDS,
        "NX"
      );

      if (result === "OK") {
        // PIN이 성공적으로 예약되었습니다.
        isPinReserved = true;
        logger.info(
          `PIN ${pin} successfully reserved with key ${sessionPinKey} for ${RESERVATION_TTL_SECONDS} seconds.`
        );
      } else {
        // PIN이 이미 존재하거나 (다른 동시 요청에 의해 방금 예약되었거나, TTL이 남아있는 이전 예약),
        // NX 조건으로 인해 설정에 실패했습니다.
        logger.info(
          `PIN ${pin} (key ${sessionPinKey}) could not be reserved (likely already exists or NX failed). Retrying.`
        );
        // 루프는 새로운 PIN을 생성하여 계속됩니다.
      }
    } catch (error) {
      logger.error(
        `Error during PIN reservation attempt for ${pin} (key ${sessionPinKey}):`,
        error
      );
      // 오류 발생 시, 현재 시도에서는 예약 실패로 간주하고 다음 시도를 진행합니다.
      // 심각한 오류의 경우, 여기서 예외를 다시 던지거나 루프를 중단시킬 수 있습니다.
    }
  }

  if (!isPinReserved) {
    logger.error(
      `Failed to generate and reserve a unique PIN after ${MAX_ATTEMPTS} attempts.`
    );
    throw new Error("Failed to generate and reserve a unique PIN.");
  }

  return pin; // 예약된 PIN 반환
}

exports.startQuizSession = async (req, res) => {
  // --- BEGIN MODIFICATION: Add Lock ---
  const teacherIdForLock = req.user._id.toString(); // 락 키에는 문자열 ID 사용
  const quizIdForLock = req.params.quizId;
  const lockKey = `lock:startsession:${teacherIdForLock}:${quizIdForLock}`;
  let lockAcquired = false;
  // --- END MODIFICATION: Add Lock ---

  try {
    // --- BEGIN MODIFICATION: Acquire Lock ---
    const result = await redisClient.set(lockKey, "locked", "EX", 5, "NX"); // 20초 타임아웃
    lockAcquired = result === "OK";

    if (!lockAcquired) {
      logger.warn(
        `[StartSession] Could not acquire lock for teacher ${teacherIdForLock}, quiz ${quizIdForLock}. Session start likely in progress by the same teacher.`
      );
      return res.status(429).send({
        error:
          "Session creation for this quiz by you is already in progress. Please wait.",
      }); // 429 Too Many Requests
    }
    // --- END MODIFICATION: Acquire Lock ---

    const { quizId } = req.params; // quizIdForLock과 동일하지만, 명시적으로 다시 가져옴
    const teacherId = req.user._id; // teacherIdForLock과 동일

    const quizContent = await KahootQuizContent.findById(quizId);
    if (!quizContent) {
      return res.status(404).send({ error: "Quiz content not found." });
    }

    const pin = await generateUniquePIN();

    const newSession = new KahootQuizSession({
      teacher: teacherId,
      pin: pin,
      grade: quizContent.grade,
      subject: quizContent.subject,
      semester: quizContent.semester,
      unit: quizContent.unit,
      questionsSnapshot: quizContent.questions.map((q) => ({
        originalQuestionId: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options.map((opt) => ({
          text: opt.text,
          imageUrl: opt.imageUrl,
        })),
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit,
        imageUrl: q.imageUrl,
      })),
      isTeamMode: req.body.isTeamMode || false,
      initialTeams:
        req.body.isTeamMode && req.body.teams
          ? req.body.teams.map((team) => ({
              teamName: team.teamName,
              memberStudentIds: team.memberStudentIds || [],
            }))
          : [],
    });

    await newSession.save();
    logger.info(
      `New KahootQuizSession created in DB. PIN: ${pin}, SessionID: ${newSession._id}`
    );

    const sessionMetadataKey = getSessionKey(pin);
    const sessionQuestionsKey = getSessionQuestionsKey(pin);
    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    const takenCharactersSetKey = getSessionTakenCharactersSetKey(pin);

    const sessionMetadataForRedis = {
      sessionId: newSession._id.toString(),
      teacherId: teacherId.toString(),
      pin: pin,
      quizContentId: quizId.toString(),
      currentQuestionIndex: -1,
      isQuestionActive: false,
      quizStarted: false,
      quizEndedByTeacher: false,
      grade: newSession.grade,
      subject: newSession.subject,
      semester: newSession.semester,
      unit: newSession.unit,
      isTeamMode: newSession.isTeamMode,
      questionsSnapshot: newSession.questionsSnapshot.map((q) =>
        q._id.toString()
      ),
    };

    const questionsSnapshotForRedis = newSession.questionsSnapshot.map((q) =>
      typeof q.toObject === "function" ? q.toObject() : q
    );

    await redisJsonSet(sessionMetadataKey, sessionMetadataForRedis, {
      EX: 3600,
    });
    await redisJsonSet(sessionQuestionsKey, questionsSnapshotForRedis, {
      EX: 3600,
    });
    // 새로운 학생 ID Set 초기화
    await redisClient.del(studentIdsSetKey);
    // 선점된 캐릭터 Set 초기화
    await redisClient.del(takenCharactersSetKey);

    logger.info(
      `Session metadata, questions snapshot, student IDs Set, and taken characters Set initialized in Redis for PIN: ${pin}.`
    );

    res.status(201).send({
      message: "Quiz session started successfully",
      pin: pin,
      sessionId: newSession._id,
    });
  } catch (error) {
    logger.error("Error starting quiz session:", error);
    res.status(500).send({ error: "Failed to start quiz session." });
  } finally {
    // --- BEGIN MODIFICATION: Release Lock ---
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
    // --- END MODIFICATION: Release Lock ---
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
