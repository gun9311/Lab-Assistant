import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { AdminTeacherData } from "../../utils/types";

const AdminTeacherList = () => {
  const [teachers, setTeachers] = useState<AdminTeacherData[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await api.get("/admin/teachers");
        setTeachers(res.data);
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      }
    };
    fetchTeachers();
  }, []);

  return (
    <div>
      <h2>Teacher List</h2>
      <ul>
        {teachers.map((teacher) => (
          <li key={teacher._id}>
            {teacher.name} (School: {teacher.school})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminTeacherList;
