import React, { useState } from "react";
import { addUnitRating } from "../../utils/api";
import { SubjectData } from "../../utils/types";

const AddRatings = ({ subjects }: { subjects: SubjectData[] }) => {
  const [subjectId, setSubjectId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [ratingLevels, setRatingLevels] = useState<{ level: string, comments: string[] }[]>([
    { level: "상", comments: [""] },
    { level: "중", comments: [""] },
    { level: "하", comments: [""] }
  ]);

  const handleAddRating = async () => {
    if (!subjectId || !unitName) {
      alert("Please select a subject and unit.");
      return;
    }

    try {
      for (const rating of ratingLevels) {
        for (const comment of rating.comments) {
          if (comment.trim() !== "") {
            const ratingData = {
              subjectId,
              unitName,
              ratingLevel: rating.level,
              comment
            };
            await addUnitRating(ratingData);
          }
        }
      }
      alert("Ratings added successfully");
      setRatingLevels([
        { level: "상", comments: [""] },
        { level: "중", comments: [""] },
        { level: "하", comments: [""] }
      ]);
    } catch (error) {
      console.error("Failed to add ratings:", error);
    }
  };

  const handleRatingCommentChange = (levelIndex: number, commentIndex: number, value: string) => {
    const newRatings = [...ratingLevels];
    newRatings[levelIndex].comments[commentIndex] = value;
    setRatingLevels(newRatings);
  };

  const addRatingField = (levelIndex: number) => {
    const newRatings = [...ratingLevels];
    newRatings[levelIndex].comments.push("");
    setRatingLevels(newRatings);
  };

  const selectedSubject = subjects.find(subject => subject._id === subjectId);

  return (
    <div>
      <h2>Add Ratings</h2>
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
      {ratingLevels.map((rating, levelIndex) => (
        <div key={levelIndex}>
          <h3>{rating.level}</h3>
          {rating.comments.map((comment, commentIndex) => (
            <input
              key={commentIndex}
              type="text"
              placeholder="Rating Comment"
              value={comment}
              onChange={(e) => handleRatingCommentChange(levelIndex, commentIndex, e.target.value)}
            />
          ))}
          <button onClick={() => addRatingField(levelIndex)}>Add Another {rating.level} Comment</button>
        </div>
      ))}
      <button onClick={handleAddRating}>Add Ratings</button>
    </div>
  );
};

export default AddRatings;
