const config = require("../config"); // 필요시 설정 파일 로드

// PII 마스킹 함수
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

// --- 금지 키워드 및 패턴 정의 시작 ---
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

// 금지 콘텐츠 확인 함수
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
// --- 금지 키워드 및 패턴 정의 끝 ---

module.exports = {
  maskPII,
  containsForbiddenContent,
};
