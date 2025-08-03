import Papa from "papaparse";
import { Question } from "./types";

export interface CsvParseResult {
  questions: Question[];
  errors: string[];
}

const REQUIRED_HEADERS = [
  "Question #",
  "Question Text",
  "Answer 1",
  "Answer 2",
  "Answer 3",
  "Answer 4",
  "Time Limit (sec) (Max: 300 seconds)",
  "Correct Answer(s) (Only include Answer #)",
];

const MAX_TIME_LIMIT = 300;

/**
 * 지정 포맷 CSV 파일을 파싱해 Question 배열로 변환한다.
 * errors.length > 0 이면 UI에서 사용자에게 오류 목록을 보여주고 questions 적용을 막아야 한다.
 */
export const parseQuizCsv = (file: File): Promise<CsvParseResult> =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, meta } = results;
        const questions: Question[] = [];
        const errors: string[] = [];

        /* 1) 헤더 검증 */
        const missing = REQUIRED_HEADERS.filter(
          (h) => !meta.fields?.includes(h)
        );
        if (missing.length) {
          errors.push(`CSV 헤더 누락 → ${missing.join(", ")}`);
          return resolve({ questions: [], errors });
        }

        /* 2) 각 행(row) → Question 변환 */
        (data as any[]).forEach((row, idx) => {
          const rowNum = idx + 2; // 1행은 헤더
          const questionText = (row["Question Text"] || "").trim();
          const answers: string[] = [
            row["Answer 1"],
            row["Answer 2"],
            row["Answer 3"],
            row["Answer 4"],
          ].map((v: string) => (v ?? "").trim());

          const timeLimitRaw = row["Time Limit (sec) (Max: 300 seconds)"] ?? "";
          const correctAnswerRaw =
            row["Correct Answer(s) (Only include Answer #)"] ?? "";

          /* 기본 필드 검증 */
          if (!questionText)
            return errors.push(`${rowNum}행: Question Text가 비어 있습니다.`);

          if (answers.filter((a) => a).length < 2)
            return errors.push(
              `${rowNum}행: 최소 두 개 이상의 보기(Answer)가 필요합니다.`
            );

          const timeLimit = Number(timeLimitRaw);
          if (
            Number.isNaN(timeLimit) ||
            timeLimit < 1 ||
            timeLimit > MAX_TIME_LIMIT
          )
            return errors.push(
              `${rowNum}행: Time Limit은 1~${MAX_TIME_LIMIT}초 사이여야 합니다.`
            );

          const correctIdx = Number(correctAnswerRaw);
          if (
            Number.isNaN(correctIdx) ||
            correctIdx < 1 ||
            correctIdx > 4 ||
            !answers[correctIdx - 1]
          )
            return errors.push(
              `${rowNum}행: Correct Answer 번호가 올바르지 않습니다.`
            );

          /* Question 객체 생성 */
          const options = answers.map((text) => ({
            text,
            imageUrl: "",
            image: null,
          }));

          questions.push({
            questionText,
            questionType: "multiple-choice",
            options,
            correctAnswer: correctIdx - 1, // CSV는 1-based, 우리는 0-based
            image: null,
            imageUrl: "",
            timeLimit,
          });
        });

        resolve({ questions, errors });
      },
      error: (err) => reject(err),
    });
  });
