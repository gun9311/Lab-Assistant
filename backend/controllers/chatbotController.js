const { v4: uuidv4 } = require("uuid");
const { getNLPResponse } = require("../services/nlpService");
const ChatSummary = require("../models/ChatSummary");
const redisClient = require("../utils/redisClient");
const logger = require("../utils/logger");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const Student = require("../models/Student");
const { format } = require("date-fns");

let clients = {};

const DAILY_LIMIT = 15;
const MONTHLY_LIMIT = 150;
const RECENT_HISTORY_COUNT = 4; // Redis에 저장할 최근 대화 기록 수

// PII 마스킹 함수 (2.5단계)
function maskPII(text) {
  if (!text) return text;
  let maskedText = text;

  // 1. 전화번호 (휴대폰 및 주요 유선/인터넷 전화, 공백/하이픈 허용) - 수정된 정규식
  maskedText = maskedText.replace(
    /\b(?:01[016789](?:[ -]?\d{3,4}){2}|0(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4]|70)[ -]?\d{3,4}[ -]?\d{4})\b/g,
    "[전화번호]"
  );

  // 2. 주민등록번호
  maskedText = maskedText.replace(
    /\b\d{6}[- ]?[1-4]\d{6}\b/g,
    "[주민등록번호]"
  );

  // 3. 이메일 주소
  maskedText = maskedText.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[이메일]"
  );

  // --- 주소 마스킹 시작 ---
  // 4. 아파트/빌딩 동/호수 패턴 먼저 적용
  maskedText = maskedText.replace(
    // Optional building name with type + mandatory d+ 동 + optional d+ 호
    /\b(?:[가-힣]+\s*(?:아파트|빌라|빌딩|오피스텔|주공|맨션|타운)\s+)?(\d+)\s*동(?:\s+(\d+)\s*호)?\b/g,
    "[주소(동/호)]" // 마스킹 문자열 구분
  );

  // 5. 도로명 주소 패턴 적용 (위에서 마스킹되지 않은 부분 대상)
  maskedText = maskedText.replace(
    // Optional preceding words + Road name (로/길) + Building number (d, d-d, d번길) + Optional (details like 층/호/동 in parentheses/comma)
    /\b(?:[가-힣]+\s*)*([가-힣]+(?:로|길))\s+(\d+(?:-\d+)?(?:번길)?)(?:\s*[,\(]?\s*(?:(?:지하)?\d+층|\d+호|[^)]+동)\s*[,\)]?)?\b/g,
    "[주소(도로명)]" // 마스킹 문자열 구분
  );
  // --- 주소 마스킹 끝 ---

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
  "좆나",
  "좆",
  "좆년",
  "좆년새끼",
  "좆년새끼놈",
  "좆년새끼놈년",
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

  let initialRecentHistory = []; // 메모리 chatHistory 초기화
  try {
    const recentHistoryFromRedis = await redisClient.get(chatHistoryKey);
    if (recentHistoryFromRedis) {
      initialRecentHistory = JSON.parse(recentHistoryFromRedis);
      // 가져온 기록이 배열 형태인지 간단히 확인
      if (!Array.isArray(initialRecentHistory)) {
        logger.warn(
          `Invalid recent history format from Redis for user ${userId}, resetting.`
        );
        initialRecentHistory = [];
      }
      logger.info(
        `Loaded ${initialRecentHistory.length} recent messages from Redis for user ${userId}`
      );
    }
  } catch (parseOrRedisError) {
    logger.error(
      `Error reading or parsing recent chat history from Redis for user ${userId}:`,
      parseOrRedisError
    );
    initialRecentHistory = []; // 오류 발생 시 빈 배열로 시작
  }

  let chatHistory = initialRecentHistory; // 이제 chatHistory는 메모리의 전체 기록 담당

  clients[clientId] = ws;
  logger.info(
    `Client connected: ${clientId} for user ${userId}, subject: ${subject}. Total active connections: ${
      Object.keys(clients).length
    }. Initial history length (from Redis): ${initialRecentHistory.length}`
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
        await handleDisconnection(userId, subject, clientId, ws, chatHistory);
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
    ws.send(JSON.stringify({ error: "사용량 확인 중 오류가 발생했습니다." }));
    ws.close();
    return;
  }
  // --- 사용량 제한 확인 로직 끝 ---

  ws.on("message", async (message) => {
    const startTime = process.hrtime();
    let saveToHistory = true;
    let messageFiltered = false;
    let refusalBotResponse = "";

    try {
      const { grade, semester, subject, unit, topic, userMessage } =
        JSON.parse(message);

      if (userMessage && userMessage.trim()) {
        saveToHistory = true; // Indicate it's a countable message
        const todayUpdate = format(new Date(), "yyyy-MM-dd");
        const thisMonthUpdate = format(new Date(), "yyyy-MM");

        try {
          // 원자적 업데이트 시도: 조건 확인 및 업데이트를 한 번에 처리
          const updatedStudent = await Student.findOneAndUpdate(
            {
              _id: userId,
              // 업데이트 조건: 아래 조건 중 하나라도 만족해야 업데이트 시도
              $or: [
                // 1. 월이 바뀜 (항상 허용)
                { lastChatMonth: { $ne: thisMonthUpdate } },
                // 2. 날짜가 바뀌고 월은 같음 (월간 제한 내 인 경우 허용)
                {
                  lastChatDay: { $ne: todayUpdate },
                  lastChatMonth: thisMonthUpdate,
                  monthlyChatCount: { $lt: MONTHLY_LIMIT },
                },
                // 3. 날짜와 월이 같음 (일간 및 월간 제한 내 인 경우 허용)
                {
                  lastChatDay: todayUpdate,
                  dailyChatCount: { $lt: DAILY_LIMIT },
                  lastChatMonth: thisMonthUpdate,
                  monthlyChatCount: { $lt: MONTHLY_LIMIT },
                },
              ],
            },
            [
              // 집계 파이프라인을 사용하여 조건부 업데이트 로직 구현
              {
                $set: {
                  // 날짜/월 변경 시 업데이트, 아닐 시 기존 값 유지
                  lastChatDay: {
                    $cond: {
                      if: { $ne: ["$lastChatDay", todayUpdate] },
                      then: todayUpdate,
                      else: "$lastChatDay",
                    },
                  },
                  // 날짜 변경 시 1로 초기화, 아닐 시 1 증가
                  dailyChatCount: {
                    $cond: {
                      if: { $ne: ["$lastChatDay", todayUpdate] },
                      then: 1,
                      else: { $add: ["$dailyChatCount", 1] },
                    },
                  },
                  // 월 변경 시 업데이트, 아닐 시 기존 값 유지
                  lastChatMonth: {
                    $cond: {
                      if: { $ne: ["$lastChatMonth", thisMonthUpdate] },
                      then: thisMonthUpdate,
                      else: "$lastChatMonth",
                    },
                  },
                  // 월 변경 시 1로 초기화, 아닐 시 1 증가 (월이 같을 때만 증가)
                  monthlyChatCount: {
                    $cond: {
                      if: { $ne: ["$lastChatMonth", thisMonthUpdate] },
                      then: 1,
                      else: { $add: ["$monthlyChatCount", 1] },
                    },
                  },
                },
              },
            ],
            { new: true } // 업데이트 후의 문서를 반환
          );

          if (!updatedStudent) {
            // 업데이트 실패: $or 조건 불만족 (즉, 제한 초과 상태)
            // 어떤 제한에 걸렸는지 확인하기 위해 현재 상태 다시 조회
            const currentStudentState = await Student.findById(
              userId,
              "dailyChatCount lastChatDay monthlyChatCount lastChatMonth"
            );
            if (!currentStudentState) {
              // 이 경우는 거의 없지만 방어 코드
              logger.error(
                `Failed to fetch student state after failed atomic update for user ${userId}`
              );
              ws.send(JSON.stringify({ error: "사용자 정보 조회 실패" }));
              return;
            }

            let errorType = null;
            // 현재 상태와 날짜를 기준으로 어떤 제한에 걸렸는지 판단
            if (
              currentStudentState.lastChatDay === todayUpdate &&
              currentStudentState.dailyChatCount >= DAILY_LIMIT
            ) {
              errorType = "daily_limit_exceeded";
            } else if (
              currentStudentState.lastChatMonth === thisMonthUpdate &&
              currentStudentState.monthlyChatCount >= MONTHLY_LIMIT
            ) {
              // 일일 제한 초과가 아니거나 날짜가 다른 경우 월간 제한 확인
              if (
                errorType !== "daily_limit_exceeded" ||
                currentStudentState.lastChatDay !== todayUpdate
              ) {
                errorType = "monthly_limit_exceeded";
              }
            } else {
              // $or 조건이 정확하다면 이 경우는 발생하지 않아야 함
              logger.error(
                `Atomic update check failed unexpectedly for user ${userId}. State:`,
                currentStudentState
              );
              errorType = "limit_check_failed_unexpectedly";
            }

            logger.warn(
              `User ${userId} failed atomic update check, limit likely reached. Error: ${errorType}`
            );
            ws.send(JSON.stringify({ error: errorType || "limit_exceeded" }));
            return; // 메시지 처리 중단
          }

          // 업데이트 성공: 로그 남기고 계속 진행
          logger.info(
            `Usage count updated atomically for user ${userId}. New counts: D=${updatedStudent.dailyChatCount}, M=${updatedStudent.monthlyChatCount}`
          );
          // Note: 로컬 변수 dailyChatCount, monthlyChatCount 등을 업데이트할 필요는 없음 (이후 코드에서 사용하지 않음)
        } catch (updateError) {
          logger.error(
            `Error during atomic usage count update for user ${userId}:`,
            updateError
          );
          ws.send(
            JSON.stringify({ error: "사용량 업데이트 중 오류가 발생했습니다." })
          );
          return; // 오류 발생 시 처리 중단
        }
      } else {
        // 빈 메시지 또는 초기 메시지: 카운트 증가 안함
        saveToHistory = false;
        logger.info(
          `Initial or empty message received from user ${userId}, usage count not incremented.`
        );
      }

      let finalUserMessage = userMessage;
      let messageForProcessing = userMessage;

      if (
        messageForProcessing &&
        messageForProcessing.trim() &&
        saveToHistory
      ) {
        const originalMessage = messageForProcessing;
        messageForProcessing = maskPII(messageForProcessing);
        if (messageForProcessing !== originalMessage) {
          logger.info(
            `PII masked for user ${userId}, client ${clientId}. Original length: ${originalMessage.length}, Masked length: ${messageForProcessing.length}`
          );
        }
        finalUserMessage = messageForProcessing;
      }

      if (
        messageForProcessing &&
        messageForProcessing.trim() &&
        saveToHistory
      ) {
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
            refusalBotResponse =
              "죄송합니다. 해당 내용은 답변해 드리기 어렵습니다. 다른 질문을 해주시겠어요?";
            messageFiltered = true;

            ws.send(JSON.stringify({ bot: refusalBotResponse, isFinal: true }));

            if (saveToHistory) {
              chatHistory.push({
                user: finalUserMessage,
                bot: refusalBotResponse,
              });
              const recentHistoryForRedis = chatHistory.slice(
                -RECENT_HISTORY_COUNT
              );
              await redisClient.set(
                chatHistoryKey,
                JSON.stringify(recentHistoryForRedis)
              );
              logger.info(
                `Saved filtered (Moderation API) interaction to memory & recent ${RECENT_HISTORY_COUNT} to Redis for user ${userId}`
              );
            }
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

      if (
        messageForProcessing &&
        messageForProcessing.trim() &&
        saveToHistory
      ) {
        const forbiddenCheck = containsForbiddenContent(messageForProcessing);
        if (forbiddenCheck.forbidden) {
          logger.warn(
            // logger 사용
            `Input blocked by custom filter for user ${userId}, client ${clientId}. Type: ${forbiddenCheck.type}, Detail: ${forbiddenCheck.detail}`
          );
          refusalBotResponse =
            "죄송합니다. 사용할 수 없는 단어나 표현이 포함되어 있어요. 다른 질문을 해주시겠어요?";
          messageFiltered = true;

          ws.send(JSON.stringify({ bot: refusalBotResponse, isFinal: true }));

          if (saveToHistory) {
            chatHistory.push({
              user: finalUserMessage,
              bot: refusalBotResponse,
            });
            const recentHistoryForRedis = chatHistory.slice(
              -RECENT_HISTORY_COUNT
            );
            await redisClient.set(
              chatHistoryKey,
              JSON.stringify(recentHistoryForRedis)
            );
            logger.info(
              `Saved filtered (Custom Filter) interaction to memory & recent ${RECENT_HISTORY_COUNT} to Redis for user ${userId}`
            );
          }
          return;
        }
      }

      const recentHistory = chatHistory.slice(-RECENT_HISTORY_COUNT);
      const systemMessageContent = `너는 초등학생을 위한 친절하고 **매우 안전한** AI 학습 튜터야. 현재 **${grade}학년** 학생의 ${subject} ${unit ? `${unit} 단원 ` : ""}${topic} 학습을 돕고 있어. 
      **학습 배경은 대한민국이며, 한국 초등학생의 눈높이에 맞춰야 해.** 다음 원칙을 **반드시** 지켜야 해:

      ---
      
      **[핵심 안전 규칙]**
      1.  **유해 콘텐츠 금지:** 폭력, 차별, 성적, 정치/종교 편향, 거짓 정보, 개인정보 질문 등 부적절한 내용 생성 금지. (**개인정보는 마스킹됨**)
      2.  **정확성과 정직성:** 모르는 질문에는 "잘 모르겠어요." 또는 "다른 학습 질문을 해볼까요?"라고 답하고, **추측하거나 지어내지 말기**.
      3.  **학습 집중:** 주제(${topic})에 집중하고, 벗어나는 질문은 자연스럽게 학습으로 유도하기.
      4.  **긍정적 태도:** 학생을 격려하고 칭찬하며 자신감을 키워주기. 필요 시 긍정적 이모지(✨👍🤔📌😊🎉💡)를 적절히 사용.
      5.  **항상 존댓말 사용:** 모든 답변은 친절하고 정중한 **존댓말**로 작성.
      
      ---
      
      **[학생 사고 유도 규칙]**
      * 학생이 스스로 생각하고 답을 찾도록 유도합니다.
      
      1. **간단히 답변 후 확장 질문 추가**
         * 핵심만 간결히 답변하고, 이어서 생각을 확장할 질문을 합니다.
         * 예: "다른 예시도 생각나나요?", "친구라면 어떻게 했을까요?"
      
      2. **선택지 제시 및 상상 유도**
         * 선택지를 제시하거나 상상할 수 있게 질문합니다.
         * 예: "이 방법과 저 방법 중 어떤 게 좋을까요?"
      
      3. **답 대신 질문 유도**
         * 바로 답하지 말고 "왜 그렇게 생각했을까요?", "다른 방법은 없을까요?"처럼 질문을 던집니다.
         * 어려워하면 결정적 힌트나 쉬운 질문으로 돕습니다.
      
      4. **개념 확인 및 응용 질문**
         * 설명 후 "왜 중요할까요?", "이걸로 무엇을 할 수 있을까요?" 같은 질문을 합니다.
      
      5. **긍정적 연결**
         * 실수해도 긍정적으로 피드백합니다.
      
      ---
      
      **[답변 스타일]**
      * 답변은 핵심만 간결하고 명확하게.
      * 필요시 목록(*, 숫자)과 강조(**굵게**)를 마크다운으로 사용.
      * 이모지는 꼭 필요할 때만 사용합니다.
      
      `;  

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

      if (!messageFiltered) {
        try {
          const streamResponse = getNLPResponse(messages);
          let botResponseContent = "";
          for await (const botResponse of streamResponse) {
            ws.send(JSON.stringify({ bot: botResponse, isFinal: false }));
            botResponseContent += botResponse;
          }
          ws.send(JSON.stringify({ bot: null, isFinal: true }));

          if (botResponseContent && botResponseContent.trim()) {
            try {
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

              const originalBotResponseForMasking = botResponseContent;
              botResponseContent = maskPII(botResponseContent);
              if (botResponseContent !== originalBotResponseForMasking) {
                logger.info(
                  `PII masked in bot response for user ${userId}, client ${clientId}.`
                );
              }

              const forbiddenCheckOutput =
                containsForbiddenContent(botResponseContent);
              if (forbiddenCheckOutput.forbidden) {
                logger.warn(
                  // logger 사용
                  `Output blocked/modified by custom filter for user ${userId}, client ${clientId}. Type: ${
                    forbiddenCheckOutput.type
                  }, Detail: ${
                    forbiddenCheckOutput.detail
                  }. Original (start): ${botResponseContent.substring(
                    0,
                    100
                  )}...`
                );
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

          if (saveToHistory && finalUserMessage.trim() && botResponseContent) {
            chatHistory.push({
              user: finalUserMessage,
              bot: botResponseContent,
            });
            const recentHistoryForRedis = chatHistory.slice(
              -RECENT_HISTORY_COUNT
            );
            try {
              await redisClient.set(
                chatHistoryKey,
                JSON.stringify(recentHistoryForRedis)
              );
              logger.info(
                `Chat history saved to memory & recent ${RECENT_HISTORY_COUNT} to Redis for user ${userId}`
              );
            } catch (redisSetError) {
              logger.error(
                `Failed to save recent history to Redis for user ${userId}:`,
                redisSetError
              );
              // Redis 저장 실패는 일단 계속 진행 (메모리에는 있음)
            }
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
    await handleDisconnection(userId, subject, clientId, ws, chatHistory);
  });

  ws.on("error", async (error) => {
    logger.error(`Error occurred on client ${clientId}: ${error}`);
    clearInterval(pingInterval); // pingInterval 정리
    await handleDisconnection(userId, subject, clientId, ws, chatHistory); // 비정상 종료 처리
  });
};

const handleDisconnection = async (
  userId,
  subject,
  clientId,
  ws,
  chatHistory
) => {
  await saveChatSummaryInternal(userId, subject, chatHistory);

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

const saveChatSummaryInternal = async (userId, subject, chatHistory) => {
  const chatHistoryKey = `chatHistories:${userId}`;

  try {
    if (!chatHistory || !Array.isArray(chatHistory)) {
      logger.warn(
        `Invalid or missing chat history in memory for user ${userId} to save summary.`
      );
      try {
        await redisClient.del(chatHistoryKey);
      } catch (delErr) {
        /* ignore */
      }
      return;
    }

    const summaryText = chatHistory
      .map((msg) => `You: ${msg.user}\nBot: ${msg.bot}`)
      .join("\n");

    if (!summaryText || summaryText.trim() === "") {
      logger.info(
        `Empty summary generated from memory for user ${userId}, skipping save.`
      );
      try {
        await redisClient.del(chatHistoryKey);
      } catch (delErr) {
        /* ignore */
      }
      return;
    }

    const newSummaryEntry = { summary: summaryText, createdAt: new Date() };
    let chatSummaryDoc = await ChatSummary.findOne({ student: userId });

    if (chatSummaryDoc) {
      logger.info(
        `Found existing ChatSummary document for student ${userId}. Updating subjects.`
      );
      let subjectData = chatSummaryDoc.subjects.find(
        (sub) => sub.subject === subject
      );

      if (subjectData) {
        logger.debug(
          `Subject '${subject}' found in document for student ${userId}, adding new summary to the beginning.`
        );
        subjectData.summaries.unshift(newSummaryEntry);
      } else {
        logger.debug(
          `Subject '${subject}' not found for student ${userId}, adding new subject entry.`
        );
        chatSummaryDoc.subjects.push({
          subject: subject,
          summaries: [newSummaryEntry],
        });
      }
    } else {
      logger.info(
        `No existing ChatSummary document found for student ${userId}, creating new one with subject '${subject}'.`
      );
      chatSummaryDoc = new ChatSummary({
        student: userId,
        subjects: [{ subject: subject, summaries: [newSummaryEntry] }],
      });
    }

    await chatSummaryDoc.save();
    logger.info(
      `Chat summary saved successfully from memory for student ${userId}, subject '${subject}'.`
    );

    try {
      await redisClient.del(chatHistoryKey);
    } catch (delErr) {
      /* ignore */
    }
  } catch (error) {
    logger.error(
      `Failed to save chat summary from memory for student ${userId}, subject '${subject}':`,
      {
        error: error.message,
        stack: error.stack,
        redisKey: chatHistoryKey,
      }
    );
  }
};

module.exports = {
  handleWebSocketConnection,
  handleDisconnection,
  saveChatSummaryInternal,
};
