import React, { useState } from "react";
import { addQuiz } from "../../utils/api";
import { SubjectData, QuizData, TaskData } from "../../utils/types";

const AddQuiz = ({ subjects, onQuizAdded }: { subjects: SubjectData[], onQuizAdded: () => void }) => {
  const [subjectId, setSubjectId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [tasks, setTasks] = useState<TaskData[]>([{ taskText: "", correctAnswers: [""] }]); // TaskData 배열로 초기화

  const handleAddQuiz = async () => {
    const selectedSubject = subjects.find(subject => subject._id === subjectId);
    if (!selectedSubject || !unitName) {
      alert("Please select a subject and unit.");
      return;
    }

    const quizData: QuizData = {
      subjectId,
      unitName,
      tasks
    };

    try {
      await addQuiz(quizData);
      alert("Quiz added successfully");
      setSubjectId("");
      setUnitName("");
      setTasks([{ taskText: "", correctAnswers: [""] }]);
      onQuizAdded(); // 새 퀴즈 추가 후 부모 컴포넌트에 알림
    } catch (error) {
      console.error("Failed to add quiz:", error);
    }
  };

  // 필드가 'taskText'인지 'correctAnswers'인지에 따라 처리를 구분
  const handleTaskChange = (index: number, field: keyof TaskData, value: string) => {
    const newTasks = [...tasks];

    if (field === "taskText") {
      // taskText는 문자열이므로 바로 할당
      newTasks[index][field] = value;
    } else if (field === "correctAnswers") {
      // correctAnswers는 배열이므로 배열의 특정 인덱스를 업데이트해야 함
      if (Array.isArray(newTasks[index].correctAnswers)) {
        newTasks[index].correctAnswers = [...newTasks[index].correctAnswers, value];
      } else {
        newTasks[index].correctAnswers = [value]; // 처음 추가되는 경우 배열로 생성
      }
    }

    setTasks(newTasks);
  };

  // correctAnswers 배열의 특정 인덱스를 변경하도록 수정
  const handleCorrectAnswerChange = (taskIndex: number, answerIndex: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].correctAnswers[answerIndex] = value; // 배열의 특정 인덱스 값 변경
    setTasks(newTasks);
  };

  const addTaskField = () => {
    setTasks([...tasks, { taskText: "", correctAnswers: [""] }]); // 새로운 문제 추가 시 correctAnswers 배열 초기화
  };

  // correctAnswers 배열에 새로운 정답 필드를 추가
  const addAnswerField = (taskIndex: number) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].correctAnswers.push(""); // 배열에 새로운 값 추가
    setTasks(newTasks);
  };

  const selectedSubject = subjects.find(subject => subject._id === subjectId);

  return (
    <div>
      <h2>Add Quiz</h2>
      <select
        value={subjectId}
        onChange={(e) => {
          setSubjectId(e.target.value);
          setUnitName("");
        }}
      >
        <option value="" disabled>Select Subject</option>
        {subjects.map((subject) => (
          <option key={subject._id} value={subject._id}>
            {subject.name} (Grade: {subject.grade}, Semester: {subject.semester})
          </option>
        ))}
      </select>
      <select
        value={unitName}
        onChange={(e) => setUnitName(e.target.value)}
        disabled={!subjectId}
      >
        <option value="" disabled>Select Unit</option>
        {selectedSubject?.units.map((unit, index) => (
          <option key={index} value={unit.name}>{unit.name}</option>
        ))}
      </select>
      {tasks.map((task, taskIndex) => (
        <div key={taskIndex}>
          <input
            type="text"
            placeholder="Task Text"
            value={task.taskText}
            onChange={(e) => handleTaskChange(taskIndex, "taskText", e.target.value)} // taskText 변경 처리
          />
          {task.correctAnswers.map((answer, answerIndex) => (
            <div key={answerIndex}>
              <input
                type="text"
                placeholder={`Correct Answer ${answerIndex + 1}`}
                value={answer}
                onChange={(e) => handleCorrectAnswerChange(taskIndex, answerIndex, e.target.value)} // correctAnswers 배열 값 처리
              />
            </div>
          ))}
          <button onClick={() => addAnswerField(taskIndex)}>Add Another Correct Answer</button>
        </div>
      ))}
      <button onClick={addTaskField}>Add Another Task</button>
      <button onClick={handleAddQuiz}>Add Quiz</button>
    </div>
  );
};

export default AddQuiz;
