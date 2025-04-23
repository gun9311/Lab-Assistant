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

  let chatHistory = await redisClient.get(chatHistoryKey);
  if (!chatHistory) {
    chatHistory = [];
  } else {
    try {
      chatHistory = JSON.parse(chatHistory);
    } catch (parseError) {
      logger.error(
        `Error parsing chat history for user ${userId}:`,
        parseError
      );
      chatHistory = []; // Reset history on parse error
    }
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
    let messageFiltered = false;
    let refusalBotResponse = "";

    try {
      // --- 사용량 제한 재확인 (변경 없음) ---
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
        if (
          dailyChatCount >= DAILY_LIMIT ||
          monthlyChatCount >= MONTHLY_LIMIT
        ) {
          // ... (send limit exceeded error and return) ...
          logger.warn(`User ${userId} exceeded limit upon message receive.`);
          const errorType =
            dailyChatCount >= DAILY_LIMIT
              ? "daily_limit_exceeded"
              : "monthly_limit_exceeded";
          ws.send(JSON.stringify({ error: errorType }));
          return; // Stop processing
        }
      } catch (checkError) {
        // ... (error handling for limit check) ...
        return;
      }
      // --- 사용량 제한 재확인 끝 ---

      const { grade, semester, subject, unit, topic, userMessage } =
        JSON.parse(message);

      // --- *** 핵심 변경: DB 카운트 증가를 여기로 이동 *** ---
      // 사용자가 빈 메시지가 아닌 실제 요청을 보냈을 때 카운트 증가
      if (userMessage && userMessage.trim()) {
        saveToHistory = true; // Indicate it's a countable message
        try {
          const todayUpdate = format(new Date(), "yyyy-MM-dd");
          const thisMonthUpdate = format(new Date(), "yyyy-MM");
          const finalUpdateOps = {
            $inc: {}, // Initialize $inc
            $set: {}, // Initialize $set
          };

          // Fetch current lastChatDay/Month to avoid race conditions if possible, though might be omitted for performance
          const studentData = await Student.findById(
            userId,
            "lastChatDay lastChatMonth dailyChatCount monthlyChatCount"
          );

          // Determine increments and resets based on fetched data or assume current limits are accurate enough for immediate increment
          let currentDaily = studentData
            ? studentData.dailyChatCount
            : dailyChatCount; // Use count from initial check or fetched
          let currentMonthly = studentData
            ? studentData.monthlyChatCount
            : monthlyChatCount;
          let lastDay = studentData ? studentData.lastChatDay : lastChatDay;
          let lastMonth = studentData
            ? studentData.lastChatMonth
            : lastChatMonth;

          if (lastDay !== todayUpdate) {
            finalUpdateOps.$set.lastChatDay = todayUpdate;
            finalUpdateOps.$set.dailyChatCount = 1; // Reset and set to 1 for today
            currentDaily = 1; // Reflect the change locally for potential subsequent checks (though unlikely needed now)
          } else {
            finalUpdateOps.$inc.dailyChatCount = 1; // Increment today's count
            currentDaily += 1;
          }

          if (lastMonth !== thisMonthUpdate) {
            finalUpdateOps.$set.lastChatMonth = thisMonthUpdate;
            finalUpdateOps.$set.monthlyChatCount = 1; // Reset and set to 1 for this month
            currentMonthly = 1;
          } else {
            // Only increment monthly if daily was also incremented (or reset)
            if (
              finalUpdateOps.$inc.dailyChatCount ||
              finalUpdateOps.$set.dailyChatCount
            ) {
              finalUpdateOps.$inc.monthlyChatCount = 1;
              currentMonthly += 1;
            }
          }

          // Clean up empty operators
          if (Object.keys(finalUpdateOps.$inc).length === 0)
            delete finalUpdateOps.$inc;
          if (Object.keys(finalUpdateOps.$set).length === 0)
            delete finalUpdateOps.$set;

          // Perform the update only if there's something to update
          if (Object.keys(finalUpdateOps).length > 0) {
            await Student.findByIdAndUpdate(userId, finalUpdateOps, {
              new: true,
            }); // `new: true` is optional
            logger.info(
              `Usage count incremented for user ${userId} *before* processing message.`
            );

            // Optional: Update local counts if needed elsewhere, though maybe not necessary now
            dailyChatCount = currentDaily;
            monthlyChatCount = currentMonthly;
          }
        } catch (updateError) {
          logger.error(
            `Failed to update usage count for user ${userId} before processing:`,
            updateError
          );
          // Decide how to handle: maybe send an error, or just log and continue?
          // For now, let's log and potentially let the user know an error occurred during counting.
          // ws.send(JSON.stringify({ error: "사용량 집계 중 오류가 발생했습니다." }));
          // return; // Or maybe continue processing the message anyway? Let's continue for now.
        }
      } else {
        // This is likely the initial empty message from frontend to start the chat
        saveToHistory = false;
        logger.info(
          `Initial empty message received from user ${userId}, usage count not incremented.`
        );
      }
      // --- *** DB 카운트 증가 로직 끝 *** ---

      let finalUserMessage = userMessage;
      let messageForProcessing = userMessage;

      // --- PII 마스킹 (변경 없음) ---
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

      // --- 입력 필터링 (Moderation API) (변경 없음) ---
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
              await redisClient.set(
                chatHistoryKey,
                JSON.stringify(chatHistory)
              );
              logger.info(
                `Saved filtered (Moderation API) interaction for user ${userId}`
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

      // --- 입력 필터링 (키워드/패턴) (변경 없음) ---
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
            await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));
            logger.info(
              `Saved filtered (Custom Filter) interaction for user ${userId}`
            );
          }
          return;
        }
      }

      // --- NLP 호출 준비 (첫 인사말 로직 등은 유지) ---
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
      if (!messageFiltered) {
        try {
          const streamResponse = getNLPResponse(messages);
          let botResponseContent = "";
          for await (const botResponse of streamResponse) {
            ws.send(JSON.stringify({ bot: botResponse, isFinal: false }));
            botResponseContent += botResponse;
          }
          ws.send(JSON.stringify({ bot: null, isFinal: true }));

          // --- 출력 필터링 (변경 없음) ---
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
                  }. Original (start): ${botResponseContent.substring(
                    0,
                    100
                  )}...`
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
          // --- 출력 필터링 끝 ---

          // --- 대화 기록 저장 (변경 없음) ---
          if (saveToHistory && finalUserMessage.trim() && botResponseContent) {
            chatHistory.push({
              user: finalUserMessage,
              bot: botResponseContent,
            });
            await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));
            logger.info(
              `Chat history (user masked, bot filtered/masked) saved for user ${userId}`
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
      logger.warn(
        `No chat history found in Redis for user ${userId} to save summary.`
      );
      return;
    }

    // Redis에서 가져온 데이터 파싱 및 유효성 검사
    let parsedChatHistory;
    try {
      parsedChatHistory = JSON.parse(chatHistory);
    } catch (parseError) {
      logger.error(
        `Invalid JSON in Redis chat history for user ${userId}. Key: ${chatHistoryKey}`,
        { error: parseError.message }
      );
      await redisClient.del(chatHistoryKey); // 잘못된 데이터 삭제
      return;
    }

    if (!Array.isArray(parsedChatHistory)) {
      logger.error(
        `Invalid chat history format retrieved from Redis for user ${userId}. Expected array, got ${typeof parsedChatHistory}. Key: ${chatHistoryKey}`
      );
      await redisClient.del(chatHistoryKey); // 잘못된 데이터 삭제
      return;
    }

    // 요약 텍스트 생성
    const summaryText = parsedChatHistory
      .map((msg) => `You: ${msg.user}\nBot: ${msg.bot}`)
      .join("\n");

    // 요약 텍스트가 비어있으면 저장하지 않음
    if (!summaryText || summaryText.trim() === "") {
      logger.info(
        `Empty summary generated for user ${userId} (Key: ${chatHistoryKey}), skipping save.`
      );
      await redisClient.del(chatHistoryKey); // Redis 기록은 삭제
      return;
    }

    const newSummaryEntry = { summary: summaryText, createdAt: new Date() };

    // 1. 학생 ID로 기존 ChatSummary 문서 찾기
    let chatSummaryDoc = await ChatSummary.findOne({ student: userId });

    if (chatSummaryDoc) {
      // 2. 문서가 있으면 업데이트
      logger.info(
        `Found existing ChatSummary document for student ${userId}. Updating subjects.`
      );
      let subjectData = chatSummaryDoc.subjects.find(
        (sub) => sub.subject === subject
      );

      if (subjectData) {
        // b. 과목이 이미 있으면 summaries 배열의 맨 앞에 새 요약 추가 (최신순 저장)
        logger.debug(
          `Subject '${subject}' found in document for student ${userId}, adding new summary to the beginning.`
        );
        subjectData.summaries.unshift(newSummaryEntry);
      } else {
        // c. 과목이 없으면 subjects 배열에 새 과목 객체 추가
        logger.debug(
          `Subject '${subject}' not found for student ${userId}, adding new subject entry.`
        );
        chatSummaryDoc.subjects.push({
          subject: subject,
          summaries: [newSummaryEntry],
        });
      }
    } else {
      // 3. 문서가 없으면 새로 생성
      logger.info(
        `No existing ChatSummary document found for student ${userId}, creating new one with subject '${subject}'.`
      );
      chatSummaryDoc = new ChatSummary({
        student: userId,
        subjects: [{ subject: subject, summaries: [newSummaryEntry] }],
      });
    }

    // 4. 변경된 문서 저장
    await chatSummaryDoc.save();
    logger.info(
      `Chat summary saved successfully for student ${userId}, subject '${subject}'.`
    );

    // 5. Redis에서 채팅 기록 삭제
    await redisClient.del(chatHistoryKey);
    logger.debug(`Deleted chat history from Redis for key ${chatHistoryKey}.`);
  } catch (error) {
    // 에러 로깅 강화
    logger.error(
      `Failed to save chat summary for student ${userId}, subject '${subject}':`,
      {
        error: error.message,
        stack: error.stack,
        redisKey: chatHistoryKey,
      }
    );
    // Redis 삭제 실패 시 에러가 발생할 수 있으므로, DB 저장 실패 시 Redis 삭제 여부 결정 필요
    // 여기서는 일단 DB 저장 실패 시 Redis는 남겨두는 것으로 가정 (재시도나 확인을 위해)
  }
};

module.exports = {
  handleWebSocketConnection,
  handleDisconnection,
  saveChatSummaryInternal,
};
