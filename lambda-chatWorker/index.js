const { SQSClient, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const mongoose = require("mongoose");
const winston = require("winston"); // 또는 console 사용 시 이 줄 제거

// --- 로거 설정 ---
// (Winston 사용 시 - console.log 사용 시 이 부분 제거/수정)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "warn", // 환경 변수로 로그 레벨 제어 가능
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// --- MongoDB 설정 및 모델 정의 ---
// 환경 변수에서 MongoDB 연결 정보 가져오기
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  logger.error("MongoDB URL environment variable (MONGODB_URL) is not set.");
  // Lambda 초기화 단계에서 실패하도록 에러 발생시킬 수 있음
  throw new Error("MongoDB URL environment variable (MONGODB_URL) is not set.");
}

// ChatSummary 모델 스키마 정의 (백엔드 모델과 동일해야 함)
// 주의: 실제 백엔드 모델 파일을 직접 가져오거나(require) 내용을 동기화해야 합니다.
const chatSummarySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    unique: true,
  },
  subjects: [
    {
      subject: { type: String, required: true },
      summaries: [
        {
          summary: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  ],
});
// 인덱스도 동일하게 설정하는 것이 좋습니다.
chatSummarySchema.index({ student: 1 });
chatSummarySchema.index({ "subjects.subject": 1 });

// 모델 컴파일 (이미 컴파일된 경우 에러 방지)
const ChatSummary =
  mongoose.models.ChatSummary ||
  mongoose.model("ChatSummary", chatSummarySchema);

// --- MongoDB 연결 관리 ---
// Lambda 실행 컨텍스트 간에 DB 연결 재사용을 위함
let dbConnection = null;

const connectToDatabase = async () => {
  if (dbConnection && dbConnection.readyState === 1) {
    logger.debug("Using existing database connection");
    return dbConnection;
  }

  try {
    logger.info("Connecting to MongoDB...");
    dbConnection = await mongoose.connect(MONGODB_URL, {
      // 최신 Mongoose는 아래 옵션들이 기본값이거나 필요 없을 수 있음
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 연결 시도 시간 제한
    });
    logger.info("Successfully connected to MongoDB");
    return dbConnection;
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", {
      message: error.message,
      stack: error.stack,
    });
    throw error; // 연결 실패 시 에러 전파
  }
};

// --- SQS 클라이언트 설정 ---
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-northeast-2",
});
const queueUrl = process.env.CHAT_QUEUE_URL;
if (!queueUrl) {
  logger.error(
    "SQS Queue URL environment variable (SQS_QUEUE_URL) is not set."
  );
  throw new Error(
    "SQS Queue URL environment variable (SQS_QUEUE_URL) is not set."
  );
}

// --- Lambda 핸들러 함수 ---
exports.handler = async (event, context) => {
  // 콜백 대기 비활성화 (async 함수 사용 시 권장)
  context.callbackWaitsForEmptyEventLoop = false;

  // DB 연결 확인 및 수행
  try {
    await connectToDatabase();
  } catch (dbConnectError) {
    // DB 연결 실패 시 모든 메시지 처리 불가
    logger.error("Database connection failed, cannot process messages.");
    // 여기서 에러를 다시 던져서 Lambda 실행 실패 및 메시지 재처리 유도
    throw dbConnectError;
  }

  const processingPromises = event.Records.map(async (record) => {
    const messageId = record.messageId;
    const receiptHandle = record.receiptHandle;
    let parsedBody;

    try {
      logger.info(`Processing message ID: ${messageId}`);
      parsedBody = JSON.parse(record.body);
      const { userId, subject, summaryText } = parsedBody;

      if (!userId || !subject || !summaryText) {
        logger.warn(
          `Invalid message format received (missing fields): ${messageId}`,
          { body: record.body }
        );
        // 잘못된 형식의 메시지는 DLQ로 보내기 위해 삭제 처리 (또는 별도 로깅 후 삭제)
        // 여기서는 일단 삭제 처리
        await deleteMessage(receiptHandle, messageId, "Invalid format");
        return; // 다음 레코드로
      }

      logger.info(`Saving chat summary for user ${userId}, subject ${subject}`);

      // --- DB 저장 로직 ---
      const newSummaryEntry = { summary: summaryText, createdAt: new Date() };
      // ObjectId 변환 시도 (문자열로 들어왔을 경우 대비)
      const studentObjectId = new mongoose.Types.ObjectId(userId);

      // upsert 옵션을 사용하여 문서를 한 번의 쿼리로 처리 시도 (더 효율적)
      const updateResult = await ChatSummary.updateOne(
        { student: studentObjectId },
        {
          $push: {
            "subjects.$[subj].summaries": {
              $each: [newSummaryEntry],
              $sort: { createdAt: -1 }, // 필요 시 정렬 (선택적)
            },
          },
          $setOnInsert: { student: studentObjectId }, // 문서가 없을 때만 student 필드 설정
        },
        {
          upsert: true, // 문서가 없으면 새로 생성
          arrayFilters: [{ "subj.subject": subject }], // 해당 subject를 찾기 위한 필터
        }
      );

      // 만약 위 updateOne이 arrayFilters로 인해 해당 subject를 못 찾았다면 (subject가 없는 경우)
      // subject 배열 자체를 추가해야 함
      if (updateResult.matchedCount === 1 && updateResult.modifiedCount === 0) {
        logger.info(
          `Subject [${subject}] not found for user ${userId}, adding new subject entry.`
        );
        await ChatSummary.updateOne(
          { student: studentObjectId },
          {
            $push: {
              subjects: { subject: subject, summaries: [newSummaryEntry] },
            },
          }
        );
      } else if (updateResult.upsertedCount === 1) {
        // 문서 자체가 새로 생성된 경우 (upsert=true), subjects 배열도 추가해야 함
        logger.info(
          `New document created for user ${userId}, adding initial subject [${subject}].`
        );
        await ChatSummary.updateOne(
          { student: studentObjectId }, // _id: updateResult.upsertedId 로 찾아도 됨
          {
            $push: {
              subjects: { subject: subject, summaries: [newSummaryEntry] },
            },
          }
        );
      }

      logger.info(
        `Successfully processed chat summary for user ${userId}, subject ${subject}`
      );
      // --- DB 저장 로직 끝 ---

      // 성공적으로 처리 후 SQS 메시지 삭제
      await deleteMessage(receiptHandle, messageId);
    } catch (error) {
      logger.error(`Error processing message ID ${messageId}:`, {
        message: error.message,
        stack: error.stack,
        body: record.body, // 오류 발생 시 메시지 내용 로깅
      });
      // 중요: 오류 발생 시 메시지를 삭제하지 않고 에러를 다시 던져서 SQS 재처리/DLQ 이동 유도
      throw error; // Promise.allSettled를 사용하지 않으므로, 하나의 에러가 전체 실행을 중단시킴
    }
  });

  // 모든 메시지 처리 시도 (Promise.all은 하나라도 실패하면 즉시 에러 반환)
  // 개별 메시지 실패가 다른 메시지 처리에 영향을 주지 않게 하려면 Promise.allSettled 사용 고려
  try {
    await Promise.all(processingPromises);
    logger.info(`Successfully processed ${event.Records.length} records.`);
    return { statusCode: 200, body: "Processing complete" };
  } catch (batchError) {
    logger.error("Error occurred during batch processing:", {
      message: batchError.message,
    });
    // Lambda 실행 환경에 오류 전달 (호출 자체는 실패로 간주될 수 있음)
    // SQS 트리거는 기본적으로 실패한 메시지만 재시도하거나 DLQ로 보냄
    throw batchError;
  }
};

// SQS 메시지 삭제 헬퍼 함수
const deleteMessage = async (
  receiptHandle,
  messageId,
  reason = "Processed successfully"
) => {
  try {
    const deleteCommand = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    await sqsClient.send(deleteCommand);
    logger.info(`Deleted message ID ${messageId}. Reason: ${reason}`);
  } catch (deleteError) {
    // 메시지 삭제 실패는 로깅만 하고, 주 로직 실패로 간주하지 않음 (메시지가 다시 처리될 수 있음)
    logger.warn(`Failed to delete message ID ${messageId}:`, {
      message: deleteError.message,
    });
  }
};
