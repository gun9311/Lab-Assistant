import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { AdminTeacherData } from "../../utils/types";

const AdminTeacherList = () => {
  const [teachers, setTeachers] = useState<AdminTeacherData[]>([]);
  const [page, setPage] = useState(1); // 🔹 현재 페이지
  const [totalPages, setTotalPages] = useState(1); // 🔹 전체 페이지

  useEffect(() => {
    const fetchTeachers = async (pageParam: number) => {
      try {
        const res = await api.get("/admin/teachers", {
          params: { page: pageParam, limit: 50 },
        });
        // 새 페이지 데이터를 뒤에 붙임
        setTeachers((prev) => [...prev, ...res.data.teachers]);
        setTotalPages(res.data.totalPages);
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      }
    };
    fetchTeachers(page);
  }, [page]);

  const handleLoadMore = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

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
      {page < totalPages && <button onClick={handleLoadMore}>Load More</button>}
    </div>
  );
};

export default AdminTeacherList;
