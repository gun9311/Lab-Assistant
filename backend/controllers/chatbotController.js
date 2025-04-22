const { v4: uuidv4 } = require("uuid");
const { getNLPResponse } = require("../services/nlpService");
const ChatSummary = require("../models/ChatSummary");
const redisClient = require("../utils/redisClient");
const winston = require("winston");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const Student = require("../models/Student");
const { format } = require("date-fns");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: '/app/logs/websocket.log' })
  ],
});

let clients = {};

const DAILY_LIMIT = 20;
const MONTHLY_LIMIT = 150;

// PII 마스킹 함수 (2.5단계)
function maskPII(text) {
  if (!text) return text;
  let maskedText = text;
  // 전화번호 (010-xxxx-xxxx, 01x-xxx-xxxx, 0x0-xxxx-xxxx 등, 공백/하이픈 허용)
  maskedText = maskedText.replace(
    /\b01[016789](?:[ -]?\d{3,4}){2}\b/g,
    "[전화번호]"
  );
  // 주민등록번호 (xxxxxx-xxxxxxx)
  maskedText = maskedText.replace(
    /\b\d{6}[- ]?[1-4]\d{6}\b/g,
    "[주민등록번호]"
  );
  // 이메일 주소
  maskedText = maskedText.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[이메일]"
  );
  // 간단한 주소 패턴 (시/도/구/군/동/면/읍/리/길/로 + 숫자) - 오탐 가능성 높음, 필요시 정교화
  // maskedText = maskedText.replace(/([가-힣]+(시|도|구|군|동|면|읍|리|길|로))(\s?\d+)/g, "[주소]");
  return maskedText;
}

// --- 4단계: 금지 키워드 및 패턴 정의 시작 ---
const forbiddenKeywords = [
  // 카테고리 1: 비난, 모욕, 따돌림
  "바보",
  "멍청이",
  "찐따",
  "못생김",
  "죽어",
  "꺼져",
  "저리가",
  // 카테고리 2: 욕설 및 비속어 (기본적인 수준, 추후 확장 필요)
  "씨발",
  "시발",
  "개새끼",
  "새끼",
  "미친",
  "존나",
  "병신",
  // 카테고리 3: 폭력적이거나 무서운 내용 (일부)
  "살인",
  "자살",
  // 카테고리 4: 부적절/민감 주제 (매우 기본적인 예시)
  "야동",
  "섹스",
  // 카테고리 5: 챗봇 기능 악용/탈옥 시도 (기본 패턴)
  "ignore",
  "disregard",
  "시스템",
  "프롬프트",
  "명령",
  // 카테고리 6: 사회 이슈
  "종북",
  "종북당",
  "종북놈",
  "종북년",
  "종북새끼",
  "종북미친",
  "종북병신",
  "종북놈",
  "종북년",
  "종북새끼",
  "종북미친",
  "종북병신",
];

const forbiddenPatterns = [
  // 카테고리 1
  /\b(나쁜|이상한)\s*(놈|년|새끼)\b/i,
  // 카테고리 3
  /(죽여|때려)버릴거야/i,
  // 카테고리 4
  /(성관계|마약)/i,
  // 카테고리 5
  /규칙을?\s*(무시|잊어|어겨|바꿔)/i,
  /너는 이제부터/i,
  /대답하지마/i,
  /개발자 모드/i,
  /내 지시만 따라/i,
];

// 4단계: 금지 콘텐츠 확인 함수
function containsForbiddenContent(text) {
  if (!text) return { forbidden: false };
  const lowerCaseText = text.toLowerCase(); // 키워드 비교용

  // 금지 키워드 확인 (부분 문자열 일치)
  const foundKeyword = forbiddenKeywords.find((keyword) =>
    lowerCaseText.includes(keyword)
  );
  if (foundKeyword) {
    return { forbidden: true, type: "keyword", detail: foundKeyword };
  }

  // 금지 정규식 패턴 확인
  const foundPattern = forbiddenPatterns.find((pattern) => pattern.test(text));
  if (foundPattern) {
    return {
      forbidden: true,
      type: "pattern",
      detail: foundPattern.toString(),
    };
  }

  return { forbidden: false };
}
// --- 4단계: 금지 키워드 및 패턴 정의 끝 ---

const handleWebSocketConnection = async (ws, userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;
  const clientId = uuidv4();

  let chatHistory = await redisClient.get(chatHistoryKey);
  if (!chatHistory) {
    chatHistory = [];
  } else {
    chatHistory = JSON.parse(chatHistory);
  }

  clients[clientId] = ws;
  logger.info(
    `Client connected: ${clientId} for user ${userId}, subject: ${subject}. Total active connections: ${
      Object.keys(clients).length
    }. Checking usage limits.`
  );

  let isAlive = true;

  ws.on("pong", () => {
    isAlive = true;
  });

  const pingInterval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      if (!isAlive) {
        logger.warn(
          `Client ${clientId} did not respond to ping, terminating connection`
        );
        await handleDisconnection(userId, subject, clientId, ws);
      } else {
        isAlive = false;
        ws.ping();
        logger.info(`Ping sent to client ${clientId}`);
      }
    }
  }, 60000);

  // --- 사용량 제한 확인 로직 시작 ---
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const thisMonth = format(new Date(), "yyyy-MM");

    const student = await Student.findById(userId);
    if (!student) {
      logger.error(`Student not found for ID: ${userId}`);
      ws.send(JSON.stringify({ error: "사용자 정보를 찾을 수 없습니다." }));
      ws.close();
      return;
    }

    let { dailyChatCount, lastChatDay, monthlyChatCount, lastChatMonth } =
      student;
    let needsUpdate = false;
    const updateOps = { $inc: {}, $set: {} };

    // 날짜/달 비교 및 카운트 초기화
    if (lastChatDay !== today) {
      dailyChatCount = 0;
      updateOps.$set.dailyChatCount = 0;
      updateOps.$set.lastChatDay = today;
      needsUpdate = true;
    }
    if (lastChatMonth !== thisMonth) {
      monthlyChatCount = 0;
      updateOps.$set.monthlyChatCount = 0;
      updateOps.$set.lastChatMonth = thisMonth;
      needsUpdate = true;
    }

    // 제한 확인
    if (dailyChatCount >= DAILY_LIMIT) {
      logger.warn(`User ${userId} exceeded daily limit.`);
      ws.send(JSON.stringify({ error: "daily_limit_exceeded" }));
      // ws.close(); // 연결을 바로 닫지 않고 메시지만 보낼 수도 있습니다.
      // return; // 메시지 처리를 여기서 중단해야 함
    } else if (monthlyChatCount >= MONTHLY_LIMIT) {
      logger.warn(`User ${userId} exceeded monthly limit.`);
      ws.send(JSON.stringify({ error: "monthly_limit_exceeded" }));
      // ws.close();
      // return; // 메시지 처리를 여기서 중단해야 함
    } else {
      // 제한 내 사용 시 카운트 증가 준비
      updateOps.$inc.dailyChatCount = 1;
      updateOps.$inc.monthlyChatCount = 1;
      // 날짜/달 업데이트가 필요 없다면, 카운트 증가만 DB에 반영하기 위해 needsUpdate 설정
      if (
        !needsUpdate &&
        (updateOps.$inc.dailyChatCount || updateOps.$inc.monthlyChatCount)
      ) {
        needsUpdate = true;
      }
      // 실제 업데이트는 메시지 처리 로직에서 성공적으로 완료된 후에 수행하는 것이 더 안전할 수 있습니다.
      // 여기서는 일단 업데이트 준비만 합니다.
    }

    // 만약 제한 초과 시, 여기서 바로 return 하여 아래의 메시지 처리 로직이 실행되지 않도록 합니다.
    if (dailyChatCount >= DAILY_LIMIT || monthlyChatCount >= MONTHLY_LIMIT) {
      // DB 업데이트는 필요 시 수행 (초기화가 발생했을 수 있으므로)
      if (needsUpdate) {
        // 빈 $inc 객체 제거
        if (Object.keys(updateOps.$inc).length === 0) delete updateOps.$inc;
        if (Object.keys(updateOps.$set).length === 0) delete updateOps.$set;
        if (Object.keys(updateOps).length > 0) {
          await Student.findByIdAndUpdate(userId, updateOps);
          logger.info(
            `Usage limits updated for ${userId} due to initialization.`
          );
        }
      }
      return; // 메시지 처리 중단
    }
  } catch (error) {
    logger.error(
      `Error checking/updating usage limits for user ${userId}:`,
      error
    );
    ws.send(JSON.stringify({ error: "사용량 확인 중 오류 발생" }));
    ws.close();
    return;
  }
  // --- 사용량 제한 확인 로직 끝 ---

  ws.on("message", async (message) => {
    const startTime = process.hrtime();
    let saveToHistory = true;

    try {
      // --- 추가: 메시지 처리 전 사용량 제한 재확인 ---
      try {
        const student = await Student.findById(userId);
        if (!student) {
          // 이 경우는 거의 없겠지만 방어적으로 추가
          logger.error(`Student not found mid-session: ${userId}`);
          ws.send(JSON.stringify({ error: "사용자 정보를 찾을 수 없습니다." }));
          return; // 처리 중단
        }

        const today = format(new Date(), "yyyy-MM-dd");
        const thisMonth = format(new Date(), "yyyy-MM");
        let { dailyChatCount, lastChatDay, monthlyChatCount, lastChatMonth } =
          student;

        // 날짜/달 비교 및 카운트 초기화 (메시지 받을 때마다 확인)
        // 실제 DB 업데이트는 아래에서 하므로 여기서는 변수 값만 조정
        if (lastChatDay !== today) {
          dailyChatCount = 0;
        }
        if (lastChatMonth !== thisMonth) {
          monthlyChatCount = 0;
        }

        // 현재 카운트로 제한 확인
        if (dailyChatCount >= DAILY_LIMIT) {
          logger.warn(`User ${userId} exceeded daily limit mid-session.`);
          ws.send(JSON.stringify({ error: "daily_limit_exceeded" }));
          return; // NLP 호출 등 다음 단계로 넘어가지 않음
        }
        if (monthlyChatCount >= MONTHLY_LIMIT) {
          logger.warn(`User ${userId} exceeded monthly limit mid-session.`);
          ws.send(JSON.stringify({ error: "monthly_limit_exceeded" }));
          return; // NLP 호출 등 다음 단계로 넘어가지 않음
        }
      } catch (checkError) {
        logger.error(
          `Error re-checking usage limits for user ${userId} mid-session:`,
          checkError
        );
        ws.send(
          JSON.stringify({ error: "사용량 확인 중 오류 발생 (세션 중)" })
        );
        return; // 처리 중단
      }
      // --- 사용량 제한 재확인 끝 ---

      const { grade, semester, subject, unit, topic, userMessage } =
        JSON.parse(message);

      let finalUserMessage = userMessage;
      let messageForProcessing = userMessage;

      // --- 2.5단계: PII 마스킹 ---
      if (messageForProcessing && messageForProcessing.trim()) {
        const originalMessage = messageForProcessing;
        messageForProcessing = maskPII(messageForProcessing);
        if (messageForProcessing !== originalMessage) {
          logger.info(
            `PII masked for user ${userId}, client ${clientId}. Original length: ${originalMessage.length}, Masked length: ${messageForProcessing.length}`
          );
        }
        finalUserMessage = messageForProcessing;
      }

      // --- 2단계: 입력 필터링 (Moderation API) ---
      if (messageForProcessing && messageForProcessing.trim()) {
        try {
          const moderationResponse = await openai.moderations.create({
            input: messageForProcessing,
          });
          const moderationResult = moderationResponse.results[0];

          if (moderationResult.flagged) {
            logger.warn(
              `Input (masked) flagged by Moderation API for user ${userId}, client ${clientId}. Categories: ${JSON.stringify(
                moderationResult.categories
              )}`
            );
            ws.send(
              JSON.stringify({
                bot: "죄송합니다. 해당 내용은 답변해 드리기 어렵습니다. 다른 질문을 해주시겠어요?",
                isFinal: true,
              })
            );
            return;
          }
        } catch (moderationError) {
          logger.error(
            `Error calling Moderation API for client ${clientId}:`,
            moderationError
          );
          ws.send(
            JSON.stringify({
              error: "메시지 검토 중 오류가 발생했습니다.",
            })
          );
          return;
        }
      }

      // --- 4단계: 입력 필터링 (키워드/패턴) ---
      if (messageForProcessing && messageForProcessing.trim()) {
        const forbiddenCheck = containsForbiddenContent(messageForProcessing);
        if (forbiddenCheck.forbidden) {
          logger.warn(
            // logger 사용
            `Input blocked by custom filter for user ${userId}, client ${clientId}. Type: ${forbiddenCheck.type}, Detail: ${forbiddenCheck.detail}`
          );
          ws.send(
            JSON.stringify({
              bot: "죄송합니다. 사용할 수 없는 단어나 표현이 포함되어 있어요. 다른 질문을 해주시겠어요?",
              isFinal: true,
            })
          );
          return; // 처리 중단
        }
      }
      // --- 4단계: 입력 필터링 (키워드/패턴) 끝 ---

      const recentHistory = chatHistory.slice(-3);

      const systemMessageContent = `너는 초등학생을 위한 친절하고 **매우 안전한** AI 학습 튜터야. 현재 ${grade}학년 ${subject} ${
        unit ? `${unit} 단원 ` : ""
      }${topic} 학습을 돕고 있어. 다음 원칙을 **반드시** 지켜줘:

      **[핵심 안전 규칙]**
      1.  **유해 콘텐츠 절대 금지:** 폭력, 차별, 성적, 정치/종교 편향, 거짓 정보, 개인정보 질문 등 부적절한 내용은 절대 생성 불가. (**사용자 입력의 개인정보는 마스킹 처리됨**)
      2.  **정확성 및 정직성:** 모르는 내용이나 부적절한 질문에는 "잘 모르겠어요." 또는 "다른 학습 질문 해볼까요?"라고 솔직하게 답변. **절대 추측하거나 지어내지 않기.**
      3.  **학습 집중:** 현재 학습 주제(${topic})에 집중하고, 벗어나는 질문은 학습으로 다시 유도.
      4.  **긍정적 태도:** 학생을 격려하고, 정답보다 스스로 생각하도록 돕기. 쉬운 단어와 존댓말 사용.

      **[답변 스타일]**
      *   답변은 핵심 위주로 간결하게.
      *   필요시 명확성을 위해 마크다운(목록: *, 숫자: 1., 강조: **) 사용.
      *   긍정적 이모지(✨👍🤔📌😊🎉💡)는 꼭 필요할 때만 최소한으로 사용.`;

      let messages;

      if (!userMessage.trim() && chatHistory.length === 0) {
        saveToHistory = false;
        const initialPromptContent = `안녕하세요! ${topic}(${
          unit ? `${unit} 단원 ` : ""
        }${subject} ${grade}학년) 학습을 시작하려고 합니다. 편하게 인사해 주세요.`;
        messages = [
          { role: "system", content: systemMessageContent },
          { role: "user", content: initialPromptContent },
        ];
      } else {
        saveToHistory = true;
        messages = [
          { role: "system", content: systemMessageContent },
          ...recentHistory
            .map((chat) => [
              { role: "user", content: chat.user },
              { role: "assistant", content: chat.bot },
            ])
            .flat(),
          { role: "user", content: messageForProcessing },
        ];
      }

      if (!messages || !messages.every((m) => typeof m.content === "string")) {
        logger.error(
          `Invalid messages format before NLP call for client ${clientId}:`,
          messages
        );
        ws.send(
          JSON.stringify({
            error: "메시지 형식이 올바르지 않아 처리할 수 없습니다.",
          })
        );
        return;
      }

      // 3. NLP 서비스 호출 및 응답 스트리밍
      try {
        const streamResponse = getNLPResponse(messages);
        let botResponseContent = "";
        for await (const botResponse of streamResponse) {
          ws.send(JSON.stringify({ bot: botResponse, isFinal: false }));
          botResponseContent += botResponse;
        }
        ws.send(JSON.stringify({ bot: null, isFinal: true }));

        // --- 3단계 & 4단계: 출력 필터링 ---
        if (botResponseContent && botResponseContent.trim()) {
          try {
            // 3.1 Moderation API 검사
            const moderationResponse = await openai.moderations.create({
              input: botResponseContent,
            });
            const moderationResult = moderationResponse.results[0];

            if (moderationResult.flagged) {
              logger.warn(
                `Output flagged by Moderation API for user ${userId}, client ${clientId}. Categories: ${JSON.stringify(
                  moderationResult.categories
                )}. Original response (start): ${botResponseContent.substring(
                  0,
                  100
                )}...`
              );
              botResponseContent =
                "죄송합니다. 답변 생성 중 문제가 발생했습니다. 다른 질문을 해주시겠어요?";
            }

            // 3.2 PII 마스킹
            const originalBotResponseForMasking = botResponseContent;
            botResponseContent = maskPII(botResponseContent);
            if (botResponseContent !== originalBotResponseForMasking) {
              logger.info(
                `PII masked in bot response for user ${userId}, client ${clientId}.`
              );
            }

            // 4단계: 출력 필터링 (키워드/패턴) - PII 마스킹 후 검사
            const forbiddenCheckOutput =
              containsForbiddenContent(botResponseContent);
            if (forbiddenCheckOutput.forbidden) {
              logger.warn(
                // logger 사용
                `Output blocked/modified by custom filter for user ${userId}, client ${clientId}. Type: ${
                  forbiddenCheckOutput.type
                }, Detail: ${
                  forbiddenCheckOutput.detail
                }. Original (start): ${botResponseContent.substring(0, 100)}...`
              );
              // 부적절한 응답은 안전한 메시지로 대체
              botResponseContent =
                "죄송합니다. 답변 내용에 부적절한 표현이 포함되어 수정되었습니다.";
            }
          } catch (outputFilterError) {
            logger.error(
              `Error during output filtering for client ${clientId}:`,
              outputFilterError
            );
            botResponseContent =
              "답변 처리 중 오류가 발생하여 내용을 표시할 수 없습니다.";
          }
        }
        // --- 3단계 & 4단계: 출력 필터링 끝 ---

        // --- 사용량 카운트 DB 업데이트 (성공적으로 응답 생성 후) ---
        // 첫 인사말이 아닐 경우에만 카운트 업데이트 (saveToHistory가 true일 때)
        if (saveToHistory) {
          try {
            const todayUpdate = format(new Date(), "yyyy-MM-dd");
            const thisMonthUpdate = format(new Date(), "yyyy-MM");
            const finalUpdateOps = {
              $inc: { dailyChatCount: 1, monthlyChatCount: 1 },
              $set: {},
            };
            const studentData = await Student.findById(
              userId,
              "lastChatDay lastChatMonth"
            );
            if (studentData && studentData.lastChatDay !== todayUpdate) {
              finalUpdateOps.$set.lastChatDay = todayUpdate;
              finalUpdateOps.$set.dailyChatCount = 1; // 날짜 바뀌면 1로 설정
              delete finalUpdateOps.$inc.dailyChatCount;
            }
            if (studentData && studentData.lastChatMonth !== thisMonthUpdate) {
              finalUpdateOps.$set.lastChatMonth = thisMonthUpdate;
              finalUpdateOps.$set.monthlyChatCount = 1; // 달 바뀌면 1로 설정
              delete finalUpdateOps.$inc.monthlyChatCount;
            }
            if (Object.keys(finalUpdateOps.$inc).length === 0)
              delete finalUpdateOps.$inc;
            if (Object.keys(finalUpdateOps.$set).length === 0)
              delete finalUpdateOps.$set;
            if (Object.keys(finalUpdateOps).length > 0) {
              await Student.findByIdAndUpdate(userId, finalUpdateOps);
              logger.info(`Usage count incremented for user ${userId}`);
            }
          } catch (updateError) {
            logger.error(
              `Failed to update usage count for user ${userId}:`,
              updateError
            );
          }
        } else {
          // 첫 인사말인 경우 로그만 남김 (선택 사항)
          logger.info(
            `Initial greeting processed for user ${userId}, usage count not incremented.`
          );
        }
        // --- 사용량 카운트 DB 업데이트 끝 ---

        // 4. 대화 기록 저장 (모든 필터링/마스킹 거친 내용)
        if (saveToHistory && finalUserMessage.trim() && botResponseContent) {
          chatHistory.push({ user: finalUserMessage, bot: botResponseContent });
          await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));
          logger.info(
            `Chat history (user masked, bot filtered/masked) saved for user ${userId}`
          );
        } else if (!saveToHistory) {
          logger.info(
            `Initial greeting sent to user ${userId}, not saved to history.`
          );
        }
      } catch (nlpError) {
        logger.error(
          `[chatbotController] Error getting NLP response for client ${clientId}:`,
          nlpError
        );
        ws.send(
          JSON.stringify({ error: "챗봇 응답 생성 중 오류가 발생했습니다." })
        );
      }
    } catch (error) {
      logger.error(
        `[chatbotController] Error handling message for client ${clientId}:`,
        error
      );
      ws.send(JSON.stringify({ error: "메시지 처리 중 오류가 발생했습니다." }));
    } finally {
      const endTime = process.hrtime(startTime);
      const elapsedTime = endTime[0] * 1000 + endTime[1] / 1e6;
      logger.info(
        `Message processed for client ${clientId}: ${elapsedTime.toFixed(2)}ms`
      );
    }
  });

  ws.on("close", async () => {
    logger.info(
      `Client ${clientId} disconnected. Total active connections: ${
        Object.keys(clients).length - 1
      }`
    );
    clearInterval(pingInterval); // pingInterval 정리
    await handleDisconnection(userId, subject, clientId, ws);
  });

  ws.on("error", async (error) => {
    logger.error(`Error occurred on client ${clientId}: ${error}`);
    clearInterval(pingInterval); // pingInterval 정리
    await handleDisconnection(userId, subject, clientId, ws); // 비정상 종료 처리
  });
};

const handleDisconnection = async (userId, subject, clientId, ws) => {
  await saveChatSummaryInternal(userId, subject);

  delete clients[clientId];
  logger.info(
    `Client ${clientId} removed from memory. Total active connections: ${
      Object.keys(clients).length
    }`
  );

  if (ws.readyState === ws.OPEN || ws.readyState === ws.CLOSING) {
    ws.terminate(); // WebSocket 연결 상태가 열려있거나 닫히는 중일 때만 terminate 호출
    logger.info(`WebSocket connection for client ${clientId} terminated.`);
  }
};

const saveChatSummaryInternal = async (userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;

  try {
    let chatHistory = await redisClient.get(chatHistoryKey);
    if (!chatHistory) {
      logger.warn("No chat history found for this user");
      return;
    }

    chatHistory = JSON.parse(chatHistory);
    const summary = chatHistory
      .map((msg) => `You: ${msg.user}\nBot: ${msg.bot}`)
      .join("\n");

    let chatSummary = await ChatSummary.findOne({
      student: userId,
      "subjects.subject": subject,
    });

    if (chatSummary) {
      // 성능 개선: subjects 배열에서 해당 과목을 찾을 때 find 사용
      let subjectData = chatSummary.subjects.find(
        (sub) => sub.subject === subject
      );

      if (subjectData) {
        subjectData.summaries.push({ summary, createdAt: new Date() });
      } else {
        chatSummary.subjects.push({
          subject,
          summaries: [{ summary, createdAt: new Date() }],
        });
      }
    } else {
      chatSummary = new ChatSummary({
        student: userId,
        subjects: [
          { subject, summaries: [{ summary, createdAt: new Date() }] },
        ],
      });
    }

    await chatSummary.save();
    await redisClient.del(chatHistoryKey); // Redis에서 기록 삭제

    logger.info("Chat summary saved successfully");
  } catch (error) {
    logger.error("Failed to save chat summary:", error);
  }
};

module.exports = {
  handleWebSocketConnection,
  handleDisconnection,
  saveChatSummaryInternal,
};
