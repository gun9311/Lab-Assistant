// // src/context/StudentContext.tsx
// import React, { createContext, useContext, useState } from 'react';

// interface Selection {
//   grade: string;
//   semester: string;
//   subject: string;
//   unit: string;
//   topic: string;
// }

// interface StudentContextType {
//   selection: Selection;
//   setSelection: React.Dispatch<React.SetStateAction<Selection>>;
//   isChatbotActive: boolean;
//   setIsChatbotActive: React.Dispatch<React.SetStateAction<boolean>>;
// }

// const StudentContext = createContext<StudentContextType | undefined>(undefined);

// export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [selection, setSelection] = useState<Selection>({
//     grade: '',
//     semester: '',
//     subject: '',
//     unit: '',
//     topic: ''
//   });
//   const [isChatbotActive, setIsChatbotActive] = useState<boolean>(false);

//   return (
//     <StudentContext.Provider value={{ selection, setSelection, isChatbotActive, setIsChatbotActive }}>
//       {children}
//     </StudentContext.Provider>
//   );
// };

// export const useStudentContext = () => {
//   const context = useContext(StudentContext);
//   if (context === undefined) {
//     throw new Error('useStudentContext must be used within a StudentProvider');
//   }
//   return context;
// };
