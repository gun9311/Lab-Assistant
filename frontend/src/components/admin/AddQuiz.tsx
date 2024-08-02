import React, { useState } from "react";
import { addQuiz } from "../../utils/api";
import { SubjectData, QuizData, TaskData } from "../../utils/types";

const AddQuiz = ({ subjects, onQuizAdded }: { subjects: SubjectData[], onQuizAdded: () => void }) => {
  const [subjectId, setSubjectId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [tasks, setTasks] = useState([{ taskText: "", correctAnswer: "" }]);

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
      setTasks([{ taskText: "", correctAnswer: "" }]);
      onQuizAdded(); // 새 퀴즈 추가 후 부모 컴포넌트에 알림
    } catch (error) {
      console.error("Failed to add quiz:", error);
    }
  };

  const handleTaskChange = (index: number, field: keyof TaskData, value: string) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const addTaskField = () => {
    setTasks([...tasks, { taskText: "", correctAnswer: "" }]);
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
      {tasks.map((task, index) => (
        <div key={index}>
          <input
            type="text"
            placeholder="Task Text"
            value={task.taskText}
            onChange={(e) => handleTaskChange(index, "taskText", e.target.value)}
          />
          <input
            type="text"
            placeholder="Correct Answer"
            value={task.correctAnswer}
            onChange={(e) => handleTaskChange(index, "correctAnswer", e.target.value)}
          />
        </div>
      ))}
      <button onClick={addTaskField}>Add Another Task</button>
      <button onClick={handleAddQuiz}>Add Quiz</button>
    </div>
  );
};

export default AddQuiz;