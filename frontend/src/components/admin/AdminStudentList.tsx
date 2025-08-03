import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { AdminStudentData } from "../../utils/types";

const AdminStudentList = () => {
  const [students, setStudents] = useState<AdminStudentData[]>([]);
  const [page, setPage]           = useState(1);        // 🔹 현재 페이지
  const [totalPages, setTotalPages] = useState(1);      // 🔹 전체 페이지

  useEffect(() => {
    const fetchStudents = async (pageParam: number) => {
      try {
        const res = await api.get("/admin/students", {
          params: { page: pageParam, limit: 50 },
        });
        // 새 페이지 데이터를 뒤에 붙임
        setStudents((prev) => [...prev, ...res.data.students]);
        setTotalPages(res.data.totalPages);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    fetchStudents(page);
  }, [page]);

  const handleLoadMore = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

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
      {page < totalPages && (
        <button onClick={handleLoadMore}>Load More</button>
      )}
    </div>
  );
};

export default AdminStudentList;
