require("dotenv").config();
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { fromEnv } = require("@aws-sdk/credential-providers");
const StudentReport = require("../models/StudentReport");
const logger = require("../utils/logger");

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(),
});

const queueUrl = process.env.REPORT_QUEUE_URL;

// 보고서 생성 요청 핸들러
const generateReport = async (req, res) => {
  const {
    grade,
    selectedSemesters,
    selectedSubjects,
    selectedStudents,
    reportLines,
    generationMethod,
    selectedUnits,
  } = req.body;

  const teacherId = req.user._id;

  const reportData = {
    grade,
    selectedSemesters,
    selectedSubjects,
    selectedStudents,
    reportLines,
    generationMethod,
    selectedUnits, // **수정된 부분**: 과목별 단원 정보를 포함
    teacherId,
  };

  // SQS 큐에 데이터 전송
  const params = {
    MessageBody: JSON.stringify(reportData),
    QueueUrl: queueUrl,
  };

  try {
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    res.status(200).send({
      message:
        "Report generation request submitted successfully. You will be notified upon completion.",
    });
  } catch (error) {
    logger.error("Failed to send message to SQS:", error);
    res.status(500).send({ message: "Failed to send message to SQS" });
  }
};

// 보고서 조회 요청 핸들러
const queryReport = async (req, res) => {
  const { selectedSemesters, selectedSubjects, selectedStudents } = req.body;

  try {
    const query = {
      semester: { $in: selectedSemesters },
      subject: { $in: selectedSubjects },
      studentId: { $in: selectedStudents },
    };

    const reports = await StudentReport.find(query)
      .populate("studentId", "studentId name")
      .sort({ "studentId.studentId": 1 });

    res.status(200).send(reports);
  } catch (error) {
    logger.error("Error querying reports:", error);
    res.status(500).send({ message: "Error querying reports" });
  }
};

// 특정 학생 보고서 조회 요청 핸들러
const getStudentReports = async (req, res) => {
  const { studentId, selectedSemesters, selectedSubjects } = req.body;

  try {
    const query = {
      studentId,
      semester:
        selectedSemesters.length > 0
          ? { $in: selectedSemesters }
          : { $exists: true },
      subject:
        selectedSubjects.length > 0
          ? { $in: selectedSubjects }
          : { $exists: true },
    };

    const reports = await StudentReport.find(query).sort({
      semester: 1,
      subject: 1,
    });

    res.status(200).send(reports);
  } catch (error) {
    logger.error("Error querying student reports:", error);
    res.status(500).send({ message: "Error querying student reports" });
  }
};

// 특정 평어 수정 요청 핸들러
const updateReportComment = async (req, res) => {
  const { reportId } = req.params;
  const { comment } = req.body; // 수정될 새로운 평어 내용

  if (!comment || typeof comment !== "string" || comment.trim() === "") {
    return res
      .status(400)
      .send({ message: "Comment content cannot be empty." });
  }

  try {
    const updatedReport = await StudentReport.findByIdAndUpdate(
      reportId,
      { $set: { comment: comment.trim() } },
      { new: true, runValidators: true } // new: true는 업데이트된 문서를 반환, runValidators는 스키마 유효성 검사 실행
    ).populate("studentId", "studentId name");

    if (!updatedReport) {
      return res.status(404).send({ message: "Report not found." });
    }

    // logger.info(`Report comment updated successfully for report ID: ${reportId}`);
    res.status(200).send(updatedReport);
  } catch (error) {
    logger.error(`Error updating report comment for ID ${reportId}:`, error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .send({ message: "Validation error.", details: error.errors });
    }
    res.status(500).send({ message: "Error updating report comment." });
  }
};

module.exports = {
  generateReport,
  queryReport,
  getStudentReports,
  updateReportComment,
};
