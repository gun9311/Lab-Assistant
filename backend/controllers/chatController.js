const ChatSummary = require("../models/ChatSummary");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

const getChatSummaries = async (req, res) => {
  const { studentId } = req.params;
  const { page = 1, limit = 2, subject, searchTerm } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  logger.info(
    `[getChatSummaries] Request received for student: ${studentId}, page: ${pageNum}, limit: ${limitNum}, subject: ${subject}, searchTerm: ${searchTerm}`
  );

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    logger.error(`[getChatSummaries] Invalid studentId format: ${studentId}`);
    return res.status(400).json({ message: "Invalid student ID format" });
  }
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  try {
    let queryPipeline = [];
    let countPipeline = [];
    const baseMatch = { student: studentObjectId };

    if (searchTerm) {
      logger.info(
        `[getChatSummaries] Performing search with searchTerm: "${searchTerm}"`
      );
      const searchRegex = new RegExp(
        searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
        "i"
      );
      const youLineRegexSource = `^You:.*?${searchRegex.source}.*?(\n|$)`;
      logger.debug(
        `[getChatSummaries] Search Regex Source for 'You:' line: ${youLineRegexSource}`
      );

      queryPipeline = [
        { $match: baseMatch },
        { $unwind: "$subjects" },
        { $unwind: "$subjects.summaries" },
        {
          $match: {
            "subjects.summaries.summary": {
              $regex: youLineRegexSource,
              $options: "im",
            },
          },
        },
        { $sort: { "subjects.summaries.createdAt": -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            _id: 0,
            subject: "$subjects.subject",
            summary: "$subjects.summaries.summary",
            createdAt: "$subjects.summaries.createdAt",
          },
        },
      ];

      countPipeline = [
        { $match: baseMatch },
        { $unwind: "$subjects" },
        { $unwind: "$subjects.summaries" },
        {
          $match: {
            "subjects.summaries.summary": {
              $regex: youLineRegexSource,
              $options: "im",
            },
          },
        },
        { $count: "totalItems" },
      ];

      logger.debug(
        "[getChatSummaries] Search Query Pipeline:",
        JSON.stringify(queryPipeline, null, 2)
      );
      logger.debug(
        "[getChatSummaries] Search Count Pipeline:",
        JSON.stringify(countPipeline, null, 2)
      );
    } else if (subject && subject !== "All") {
      logger.info(`[getChatSummaries] Filtering by subject: ${subject}`);
      queryPipeline = [
        { $match: baseMatch },
        { $unwind: "$subjects" },
        { $match: { "subjects.subject": subject } },
        {
          $project: {
            _id: 0,
            subject: "$subjects.subject",
            summaries: {
              $sortArray: {
                input: "$subjects.summaries",
                sortBy: { createdAt: -1 },
              },
            },
          },
        },
        {
          $project: {
            subject: 1,
            summaries: { $slice: ["$summaries", skip, limitNum] },
          },
        },
      ];

      countPipeline = [
        { $match: baseMatch },
        { $unwind: "$subjects" },
        { $match: { "subjects.subject": subject } },
        {
          $project: {
            _id: 0,
            summariesCount: { $size: "$subjects.summaries" },
          },
        },
        { $group: { _id: null, totalItems: { $sum: "$summariesCount" } } },
      ];
      logger.debug(
        "[getChatSummaries] Subject Query Pipeline:",
        JSON.stringify(queryPipeline, null, 2)
      );
      logger.debug(
        "[getChatSummaries] Subject Count Pipeline:",
        JSON.stringify(countPipeline, null, 2)
      );
    } else {
      logger.info(
        `[getChatSummaries] No subject or search term. Returning empty.`
      );
      return res.json({
        summaries: [],
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        subject: "All",
        queryType: "none",
      });
    }

    logger.debug("[getChatSummaries] Executing aggregation pipelines...");
    const [results, countResult] = await Promise.all([
      ChatSummary.aggregate(queryPipeline).exec(),
      ChatSummary.aggregate(countPipeline).exec(),
    ]);
    logger.debug(
      "[getChatSummaries] Aggregation results:",
      JSON.stringify(results, null, 2)
    );
    logger.debug(
      "[getChatSummaries] Aggregation count result:",
      JSON.stringify(countResult, null, 2)
    );

    const totalItems =
      countResult && countResult.length > 0 ? countResult[0].totalItems : 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    let responseSummaries = [];
    let responseSubject = "";
    let queryType = "none";

    if (searchTerm) {
      responseSummaries = results || [];
      responseSubject = `검색어 "${searchTerm}" 결과`;
      queryType = "search";
      logger.debug(
        `[getChatSummaries] Search results count: ${responseSummaries.length}, Total items: ${totalItems}`
      );
    } else if (subject && subject !== "All") {
      if (results && results.length > 0 && results[0].summaries) {
        responseSummaries = results[0].summaries;
        responseSubject = results[0].subject;
      } else {
        responseSummaries = [];
        responseSubject = subject;
      }
      queryType = "subject";
      logger.debug(
        `[getChatSummaries] Subject filter results count: ${responseSummaries.length}, Total items: ${totalItems}`
      );
    }

    res.json({
      summaries: responseSummaries,
      currentPage: pageNum,
      totalPages: totalPages,
      totalItems: totalItems,
      subject: responseSubject,
      queryType: queryType,
    });
  } catch (error) {
    logger.error(
      `[getChatSummaries] Error fetching chat summaries for student ${studentId}:`,
      {
        message: error.message,
        stack: error.stack,
        studentId: studentId,
        params: req.query,
      }
    );
    res
      .status(500)
      .json({ message: "Error fetching chat summaries", error: error.message });
  }
};

module.exports = {
  getChatSummaries,
};
