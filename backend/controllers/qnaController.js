const QnA = require("../models/QnA");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");
const { sendNotification } = require("../services/fcmService");
const logger = require("../utils/logger");
const { redisClient } = require("../utils/redisClient"); // 🔹 Redis 캐시용

// 질문 생성 (교사 전용)
const createQuestion = async (req, res, next) => {
  try {
    const { title, content, category, priority, isPrivate, attachments } =
      req.body;

    // 작성자 정보 조회
    const teacher = await Teacher.findById(req.user._id);
    if (!teacher) {
      return res.status(404).json({ error: "교사 정보를 찾을 수 없습니다." });
    }

    const qna = new QnA({
      title,
      content,
      category,
      priority,
      isPrivate: isPrivate || false,
      attachments: attachments || [],
      author: req.user._id,
      authorName: teacher.name,
      authorSchool: teacher.school,
    });

    await qna.save();

    // 관리자들에게 새 질문 알림 전송 (선택사항)
    // await notifyAdminsNewQuestion(qna);

    res.status(201).json({
      message: "질문이 성공적으로 등록되었습니다.",
      qna: qna,
    });
  } catch (error) {
    logger.error("Failed to create question:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user._id,
    });
    const err = new Error("질문 등록에 실패했습니다. 다시 시도해주세요.");
    err.statusCode = 500;
    next(err);
  }
};

// 질문 목록 조회
const getQuestions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20, // 기본 개수를 20개로 증가
      status,
      category,
      priority,
      school,
      search,
      sortBy = "latest",
      viewType = "all", // 새로운 파라미터: "all" | "my"
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 필터 조건 구성
    let filter = {};

    // 교사의 경우: viewType에 따라 본인 질문만 보거나 모든 질문 보기
    if (req.user.role === "teacher") {
      if (viewType === "my") {
        filter.author = req.user._id; // 본인 질문만
      }
      // viewType이 "all"이면 모든 교사의 질문을 볼 수 있음 (단, 비공개 질문은 제외)
      if (viewType === "all") {
        filter.$or = [
          { isPrivate: false }, // 공개 질문
          { author: req.user._id }, // 또는 본인 질문
        ];
      }
    }
    // 관리자는 모든 질문 (비공개 포함)

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (school && req.user.role === "admin") filter.authorSchool = school;

    // 검색 조건
    if (search) {
      filter.$or = filter.$or
        ? [
            ...filter.$or,
            { title: { $regex: search, $options: "i" } },
            { content: { $regex: search, $options: "i" } },
          ]
        : [
            { title: { $regex: search, $options: "i" } },
            { content: { $regex: search, $options: "i" } },
          ];
    }

    // 정렬 조건
    let sort = {};
    switch (sortBy) {
      case "latest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "priority":
        // 우선순위 정렬: 긴급(1) -> 높음(2) -> 보통(3) -> 낮음(4)
        const priorityOrder = { 긴급: 1, 높음: 2, 보통: 3, 낮음: 4 };
        sort = { priority: 1, createdAt: -1 };
        break;
      case "status":
        // 상태 정렬: 대기중(1) -> 답변완료(2) -> 해결됨(3)
        const statusOrder = { 대기중: 1, 답변완료: 2, 해결됨: 3 };
        sort = { status: 1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const questions = await QnA.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-attachments -__v") // 🔹 큰/민감 필드 제외
      .populate("author", "name email school")
      .populate("answeredBy", "name")

    const totalCount = await QnA.countDocuments(filter);

    res.status(200).json({
      questions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        hasMore: skip + questions.length < totalCount,
      },
    });
  } catch (error) {
    logger.error("Failed to get questions:", {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user._id,
    });
    const err = new Error("질문 목록을 불러오는데 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 질문 상세 조회
const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const question = await QnA.findById(id)
      .populate("author", "name email school")
      .populate("answeredBy", "name");

    if (!question) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    // 권한 확인 수정: 교사는 공개 질문이거나 본인 질문, 관리자는 모든 질문
    if (req.user.role === "teacher") {
      const isOwner = question.author._id.toString() === req.user._id;
      const isPublic = !question.isPrivate;

      if (!isOwner && !isPublic) {
        return res
          .status(403)
          .json({ error: "비공개 질문에 접근할 수 없습니다." });
      }
    }

    // 조회수 증가
    await QnA.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    res.status(200).json(question);
  } catch (error) {
    logger.error("Failed to get question by id:", {
      error: error.message,
      stack: error.stack,
      questionId: req.params.id,
      userId: req.user._id,
    });
    const err = new Error("질문을 불러오는데 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 질문 수정 (교사 전용, 답변 전에만)
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, priority, isPrivate, attachments } =
      req.body;

    const question = await QnA.findById(id);
    if (!question) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    // 권한 확인
    if (question.author.toString() !== req.user._id) {
      return res.status(403).json({ error: "수정 권한이 없습니다." });
    }

    // 답변이 이미 있으면 수정 불가
    if (question.answer) {
      return res
        .status(400)
        .json({ error: "답변이 완료된 질문은 수정할 수 없습니다." });
    }

    const updatedQuestion = await QnA.findByIdAndUpdate(
      id,
      {
        title,
        content,
        category,
        priority,
        isPrivate,
        attachments: attachments || [],
      },
      { new: true }
    ).populate("author", "name email school");

    res.status(200).json({
      message: "질문이 성공적으로 수정되었습니다.",
      question: updatedQuestion,
    });
  } catch (error) {
    logger.error("Failed to update question:", {
      error: error.message,
      stack: error.stack,
      questionId: req.params.id,
      body: req.body,
      userId: req.user._id,
    });
    const err = new Error("질문 수정에 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 질문 삭제 (교사 전용, 답변 전에만)
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const question = await QnA.findById(id);
    if (!question) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    // 권한 확인
    if (question.author.toString() !== req.user._id) {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    // 답변이 이미 있으면 삭제 불가
    if (question.answer) {
      return res
        .status(400)
        .json({ error: "답변이 완료된 질문은 삭제할 수 없습니다." });
    }

    await QnA.findByIdAndDelete(id);

    res.status(200).json({ message: "질문이 성공적으로 삭제되었습니다." });
  } catch (error) {
    logger.error("Failed to delete question:", {
      error: error.message,
      stack: error.stack,
      questionId: req.params.id,
      userId: req.user._id,
    });
    const err = new Error("질문 삭제에 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 답변 작성/수정 (관리자 전용)
const answerQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ error: "답변 내용을 입력해주세요." });
    }

    const question = await QnA.findById(id).populate("author", "name tokens");
    if (!question) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    // 답변 저장
    const updatedQuestion = await QnA.findByIdAndUpdate(
      id,
      {
        answer: answer.trim(),
        answeredBy: req.user._id,
        answeredAt: new Date(),
        status: "답변완료",
      },
      { new: true }
    )
      .populate("author", "name email school")
      .populate("answeredBy", "name");

    // 교사에게 답변 알림 전송
    await sendAnswerNotification(question, answer);

    res.status(200).json({
      message: "답변이 성공적으로 등록되었습니다.",
      question: updatedQuestion,
    });
  } catch (error) {
    logger.error("Failed to answer question:", {
      error: error.message,
      stack: error.stack,
      questionId: req.params.id,
      body: req.body,
      userId: req.user._id,
    });
    const err = new Error("답변 등록에 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 질문 상태 변경 (관리자 전용)
const updateQuestionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["대기중", "답변완료", "해결됨"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "유효하지 않은 상태입니다." });
    }

    const question = await QnA.findById(id);
    if (!question) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    // 교사인 경우 권한 체크
    if (req.user.role === "teacher") {
      // 본인 질문인지 확인
      if (question.author.toString() !== req.user._id) {
        return res
          .status(403)
          .json({ error: "본인의 질문만 수정할 수 있습니다." });
      }

      // 교사는 "해결됨"으로만 변경 가능하고, 답변이 있어야 함
      if (status !== "해결됨") {
        return res
          .status(403)
          .json({ error: "교사는 해결됨 상태로만 변경할 수 있습니다." });
      }

      if (!question.answer) {
        return res
          .status(400)
          .json({ error: "답변이 있는 질문만 해결됨으로 변경할 수 있습니다." });
      }
    }

    const updatedQuestion = await QnA.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("author", "name email school")
      .populate("answeredBy", "name");

    res.status(200).json({
      message: "상태가 성공적으로 변경되었습니다.",
      question: updatedQuestion,
    });
  } catch (error) {
    logger.error("Failed to update question status:", {
      error: error.message,
      stack: error.stack,
      questionId: req.params.id,
      body: req.body,
      userId: req.user._id,
    });
    const err = new Error("상태 변경에 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// QnA 통계 조회 (관리자 전용)
const getQnAStatistics = async (req, res, next) => {
  try {
    // �� 1) 캐시 조회 (TTL 5분)
    const cached = await redisClient.get("qna:stats");
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // �� 2) 단일 aggregate 파이프라인
    const [stats] = await QnA.aggregate([
      {
        $facet: {
          overview: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          categoryStats: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          priorityStats: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          schoolStats: [
            { $group: { _id: "$authorSchool", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          recent7Days: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $count: "count" },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    // 🔹 3) facet 결과를 원하는 형태로 재구성
    const overviewMap = Object.fromEntries(
      (stats.overview || []).map((o) => [o._id, o.count])
    );

    const result = {
      overview: {
        total: stats.total?.[0]?.count || 0,
        unanswered: overviewMap["대기중"] || 0,
        answered: overviewMap["답변완료"] || 0,
        resolved: overviewMap["해결됨"] || 0,
        recent7Days: stats.recent7Days?.[0]?.count || 0,
      },
      categoryStats: stats.categoryStats || [],
      priorityStats: stats.priorityStats || [],
      schoolStats: stats.schoolStats || [],
    };

    // 🔹 4) 캐시 저장 (EX 300초 = 5분)
    await redisClient.set("qna:stats", JSON.stringify(result), { EX: 300 });

    res.status(200).json(result);
  } catch (error) {
    logger.error("Failed to get QnA statistics:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
    });
    const err = new Error("통계 조회에 실패했습니다.");
    err.statusCode = 500;
    next(err);
  }
};

// 답변 알림 전송 헬퍼 함수
const sendAnswerNotification = async (question, answer) => {
  try {
    // 알림 저장
    const notification = new Notification({
      recipientId: question.author._id,
      recipientType: "Teacher",
      message: `"${question.title}" 질문에 대한 답변이 등록되었습니다.`,
      type: "qna_answer",
      data: {
        questionId: question._id,
        recipientType: "Teacher",
      },
    });

    await notification.save();

    // FCM 푸시 알림 전송
    if (question.author.tokens && question.author.tokens.length > 0) {
      const tokens = question.author.tokens.map((t) => t.token);

      for (const token of tokens) {
        try {
          await sendNotification(token, {
            title: "Q&A 답변 알림",
            body: `"${question.title}" 질문에 대한 답변이 등록되었습니다.`,
            data: {
              notificationId: notification._id.toString(),
              type: "qna_answer",
              questionId: question._id.toString(),
            },
          });
        } catch (error) {
          logger.warn("Failed to send FCM notification:", {
            error: error.message,
            token,
            questionId: question._id,
          });
        }
      }
    }
  } catch (error) {
    logger.error("Failed to send answer notification:", {
      error: error.message,
      stack: error.stack,
      questionId: question._id,
    });
    // 알림 실패는 전체 프로세스를 중단시키지 않음
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  answerQuestion,
  updateQuestionStatus,
  getQnAStatistics,
};
