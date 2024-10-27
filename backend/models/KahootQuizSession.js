const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KahootQuizSessionSchema = new Schema({
    quizContent: { type: mongoose.Schema.Types.ObjectId, ref: 'KahootQuizContent', required: true }, // 참조하는 퀴즈 콘텐츠
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }, // 세션을 시작한 교사
    isTeamMode: { type: Boolean, default: false }, // 팀 모드 여부
    teams: [{
      teamName: { type: String, required: true }, // 팀 이름
      members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }], // 팀에 속한 학생들
      teamScore: { type: Number, default: 0 } // 팀의 총 점수
    }],
    participants: [{
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // 참가한 학생
      score: { type: Number, default: 0 }, // 학생의 점수 (개인 점수)
      responses: [{
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'KahootQuizContent.questions' }, // 학생이 응답한 질문
        answer: { type: String }, // 학생이 제출한 답변
        isCorrect: { type: Boolean }, // 응답의 정답 여부
        responseTime: { type: Number } // 응답 시간(초 단위)
      }]
    }],
    status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' }, // 퀴즈 상태 (진행 중, 완료)
    startedAt: { type: Date, default: Date.now }, // 퀴즈 시작 시간
    endedAt: { type: Date }, // 퀴즈 종료 시간
    pin: { type: String, required: true } // 세션에 사용되는 PIN 추가
});

module.exports = mongoose.model('KahootQuizSession', KahootQuizSessionSchema);
