const Student = require("../models/Student");
const logger = require("../utils/logger");
const { format } = require("date-fns");
const config = require("../config");

const { DAILY_LIMIT, MONTHLY_LIMIT } = config.chatLimits;

/**
 * 학생의 채팅 사용량을 확인하고, 필요한 경우 DB의 카운트를 초기화합니다.
 * @param {string} userId 학생 ID
 * @returns {Promise<{allow: boolean, errorType: string|null, dailyCount: number, monthlyCount: number}>}
 *          allow: 사용 가능 여부, errorType: 제한 초과 시 타입, dailyCount/monthlyCount: 현재 카운트
 */
async function checkAndUpdateUsageOnInit(userId) {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const thisMonth = format(new Date(), "yyyy-MM");

    const student = await Student.findById(userId);
    if (!student) {
      logger.error(`[ChatUsageService] Student not found for ID: ${userId}`);
      return {
        allow: false,
        errorType: "user_not_found",
        dailyCount: 0,
        monthlyCount: 0,
      };
    }

    let { dailyChatCount, lastChatDay, monthlyChatCount, lastChatMonth } =
      student;
    let needsUpdate = false;
    const updateOps = { $set: {} }; // $inc는 메시지 처리 시에만 발생

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
      // 월이 바뀌면 일일 카운트도 0으로 설정 (이미 위에서 처리되었을 수 있지만, 명확성을 위해)
      if (!updateOps.$set.dailyChatCount) {
        // lastChatDay !== today 조건이 이미 충족된 경우 중복 방지
        updateOps.$set.dailyChatCount = 0;
      }
      if (!updateOps.$set.lastChatDay) {
        updateOps.$set.lastChatDay = today;
      }
      needsUpdate = true;
    }

    if (dailyChatCount >= DAILY_LIMIT) {
      logger.warn(
        `[ChatUsageService] User ${userId} exceeded daily limit. Count: ${dailyChatCount}`
      );
      if (needsUpdate && Object.keys(updateOps.$set).length > 0) {
        // 초기화 업데이트는 수행
        await Student.findByIdAndUpdate(userId, updateOps);
        logger.info(
          `[ChatUsageService] Usage limits initialized for ${userId} (daily limit exceeded).`
        );
      }
      return {
        allow: false,
        errorType: "daily_limit_exceeded",
        dailyCount: dailyChatCount,
        monthlyCount: monthlyChatCount,
      };
    }
    if (monthlyChatCount >= MONTHLY_LIMIT) {
      logger.warn(
        `[ChatUsageService] User ${userId} exceeded monthly limit. Count: ${monthlyChatCount}`
      );
      if (needsUpdate && Object.keys(updateOps.$set).length > 0) {
        // 초기화 업데이트는 수행
        await Student.findByIdAndUpdate(userId, updateOps);
        logger.info(
          `[ChatUsageService] Usage limits initialized for ${userId} (monthly limit exceeded).`
        );
      }
      return {
        allow: false,
        errorType: "monthly_limit_exceeded",
        dailyCount: dailyChatCount,
        monthlyCount: monthlyChatCount,
      };
    }

    if (needsUpdate && Object.keys(updateOps.$set).length > 0) {
      await Student.findByIdAndUpdate(userId, updateOps);
      logger.info(`[ChatUsageService] Usage limits initialized for ${userId}.`);
    }
    return {
      allow: true,
      errorType: null,
      dailyCount: dailyChatCount,
      monthlyCount: monthlyChatCount,
    };
  } catch (error) {
    logger.error(
      `[ChatUsageService] Error checking/updating usage limits for user ${userId}:`,
      error
    );
    return {
      allow: false,
      errorType: "usage_check_error",
      dailyCount: 0,
      monthlyCount: 0,
    };
  }
}

/**
 * 실제 메시지 사용 시 학생의 채팅 카운트를 원자적으로 증가시키고 제한을 확인합니다.
 * @param {string} userId 학생 ID
 * @returns {Promise<{success: boolean, errorType: string|null, dailyCount: number, monthlyCount: number}>}
 *          success: 카운트 증가 및 사용 가능 여부, errorType: 제한 초과 시 타입,
 *          dailyCount/monthlyCount: 업데이트된 카운트 (실패 시 0)
 */
async function incrementAndCheckUsageOnMessage(userId) {
  const todayUpdate = format(new Date(), "yyyy-MM-dd");
  const thisMonthUpdate = format(new Date(), "yyyy-MM");

  try {
    const updatedStudent = await Student.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { lastChatMonth: { $ne: thisMonthUpdate } },
          {
            lastChatDay: { $ne: todayUpdate },
            lastChatMonth: thisMonthUpdate,
            monthlyChatCount: { $lt: MONTHLY_LIMIT },
          },
          {
            lastChatDay: todayUpdate,
            dailyChatCount: { $lt: DAILY_LIMIT },
            lastChatMonth: thisMonthUpdate,
            monthlyChatCount: { $lt: MONTHLY_LIMIT },
          },
        ],
      },
      [
        {
          $set: {
            lastChatDay: {
              $cond: {
                if: { $ne: ["$lastChatDay", todayUpdate] },
                then: todayUpdate,
                else: "$lastChatDay",
              },
            },
            dailyChatCount: {
              $cond: {
                if: { $ne: ["$lastChatDay", todayUpdate] },
                then: 1,
                else: { $add: ["$dailyChatCount", 1] },
              },
            },
            lastChatMonth: {
              $cond: {
                if: { $ne: ["$lastChatMonth", thisMonthUpdate] },
                then: thisMonthUpdate,
                else: "$lastChatMonth",
              },
            },
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
      {
        new: true,
        select: "dailyChatCount monthlyChatCount lastChatDay lastChatMonth",
      }
    );

    if (!updatedStudent) {
      const currentStudentState = await Student.findById(
        userId,
        "dailyChatCount lastChatDay monthlyChatCount lastChatMonth"
      );
      if (!currentStudentState) {
        logger.error(
          `[ChatUsageService] Failed to fetch student state after failed atomic update for user ${userId}`
        );
        return {
          success: false,
          errorType: "user_not_found_after_update",
          dailyCount: 0,
          monthlyCount: 0,
        };
      }

      let errorType = "limit_exceeded_unknown";
      if (
        currentStudentState.lastChatDay === todayUpdate &&
        currentStudentState.dailyChatCount >= DAILY_LIMIT
      ) {
        errorType = "daily_limit_exceeded";
      } else if (
        currentStudentState.lastChatMonth === thisMonthUpdate &&
        currentStudentState.monthlyChatCount >= MONTHLY_LIMIT
      ) {
        if (
          errorType !== "daily_limit_exceeded" ||
          currentStudentState.lastChatDay !== todayUpdate
        ) {
          errorType = "monthly_limit_exceeded";
        }
      }
      logger.warn(
        `[ChatUsageService] User ${userId} failed atomic update, limit likely reached. Error: ${errorType}`
      );
      return {
        success: false,
        errorType,
        dailyCount: currentStudentState.dailyChatCount,
        monthlyCount: currentStudentState.monthlyChatCount,
      };
    }

    logger.info(
      `[ChatUsageService] Usage count updated atomically for user ${userId}. New counts: D=${updatedStudent.dailyChatCount}, M=${updatedStudent.monthlyChatCount}`
    );
    return {
      success: true,
      errorType: null,
      dailyCount: updatedStudent.dailyChatCount,
      monthlyCount: updatedStudent.monthlyChatCount,
    };
  } catch (updateError) {
    logger.error(
      `[ChatUsageService] Error during atomic usage count update for user ${userId}:`,
      updateError
    );
    return {
      success: false,
      errorType: "usage_update_error",
      dailyCount: 0,
      monthlyCount: 0,
    };
  }
}

module.exports = {
  checkAndUpdateUsageOnInit,
  incrementAndCheckUsageOnMessage,
};
