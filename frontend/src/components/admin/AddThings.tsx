import React, { useEffect, useState } from "react";
import { getAllSubjects } from "../../utils/api";
import { SubjectData } from "../../utils/types";
import AddSubject from "./AddSubject";
import AddUnits from "./AddUnits";
import AddRatings from "./AddRatings";
import AddQuiz from "./AddQuiz";

const AddThings = () => {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getAllSubjects();
        setSubjects(res.data);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setLoading(false); // 로딩 완료
      }
    };
    fetchSubjects();
  }, []);

  const refreshSubjects = async () => {
    try {
      const res = await getAllSubjects();
      setSubjects(res.data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>; // 로딩 중일 때 표시
  }

  return (
    <div>
      <AddSubject onSubjectAdded={refreshSubjects} />
      <AddUnits subjects={subjects} onUnitAdded={refreshSubjects} />
      <AddRatings subjects={subjects} />
      <AddQuiz subjects={subjects} onQuizAdded={refreshSubjects} />
    </div>
  );
};

export default AddThings;
