import React, { useState } from "react";
import { addUnits } from "../../utils/api";
import { SubjectData, UnitData } from "../../utils/types";

const AddUnits = ({ subjects, onUnitAdded }: { subjects: SubjectData[], onUnitAdded: () => void }) => {
  const [subjectId, setSubjectId] = useState("");
  const [unitNames, setUnitNames] = useState<string[]>([""]);

  const handleAddUnits = async () => {
    const unitData: UnitData = {
      subject: subjectId,
      units: unitNames
    };

    try {
      await addUnits(unitData);
      alert("Units added successfully");
      setUnitNames([""]);
      onUnitAdded(); // 새 단원 추가 후 부모 컴포넌트에 알림
    } catch (error) {
      console.error("Failed to add units:", error);
    }
  };

  const handleUnitChange = (index: number, value: string) => {
    const newUnits = [...unitNames];
    newUnits[index] = value;
    setUnitNames(newUnits);
  };

  const addUnitField = () => {
    setUnitNames([...unitNames, ""]);
  };

  return (
    <div>
      <h2>Add Units</h2>
      {unitNames.map((unitName, index) => (
        <input
          key={index}
          type="text"
          placeholder="Unit Name"
          value={unitName}
          onChange={(e) => handleUnitChange(index, e.target.value)}
        />
      ))}
      <button onClick={addUnitField}>Add Another Unit</button>
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
      >
        <option value="" disabled>Select Subject</option>
        {subjects.map((subject) => (
          <option key={subject._id} value={subject._id}>
            {subject.name} (Grade: {subject.grade}, Semester: {subject.semester})
          </option>
        ))}
      </select>
      <button onClick={handleAddUnits}>Add Units</button>
    </div>
  );
};

export default AddUnits;
