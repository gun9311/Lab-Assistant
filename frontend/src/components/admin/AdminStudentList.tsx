import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { AdminStudentData } from "../../utils/types";

const AdminStudentList = () => {
  const [students, setStudents] = useState<AdminStudentData[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/admin/students");
        setStudents(res.data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    fetchStudents();
  }, []);

  return (
    <div>
      <h2>Student List</h2>
      <ul>
        {students.map((student) => (
          <li key={student._id}>
            {student.name} (School: {student.school})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminStudentList;
