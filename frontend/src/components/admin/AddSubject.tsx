import React, { useState } from "react";
import { addSubject } from "../../utils/api";
import { SubjectData } from "../../utils/types";

const AddSubject = ({ onSubjectAdded }: { onSubjectAdded: () => void }) => {
  const [subjectName, setSubjectName] = useState("");
  const [subjectGrade, setSubjectGrade] = useState("");
  const [subjectSemester, setSubjectSemester] = useState("");

  const handleAddSubject = async () => {
    const subjectData: SubjectData = {
      name: subjectName,
      grade: Number(subjectGrade),
      semester: subjectSemester,
      units: []
    };

    try {
      await addSubject(subjectData);
      alert("Subject added successfully");
      setSubjectName("");
      setSubjectGrade("");
      setSubjectSemester("");
      onSubjectAdded(); // 새 과목 추가 후 부모 컴포넌트에 알림
    } catch (error) {
      console.error("Failed to add subject:", error);
    }
  };

  return (
    <div>
      <h2>Add Subject</h2>
      <input
        type="text"
        placeholder="Subject Name"
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Grade"
        value={subjectGrade}
        onChange={(e) => setSubjectGrade(e.target.value)}
      />
      <select
        value={subjectSemester}
        onChange={(e) => setSubjectSemester(e.target.value)}
      >
        <option value="" disabled>Select Semester</option>
        <option value="1학기">1학기</option>
        <option value="2학기">2학기</option>
      </select>
      <button onClick={handleAddSubject}>Add Subject</button>
    </div>
  );
};

export default AddSubject;