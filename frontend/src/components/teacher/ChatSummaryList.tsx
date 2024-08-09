import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Box, Typography, List, ListItem, ListItemText, Switch, FormControlLabel } from '@mui/material';

type Summary = {
  summary: string;
  createdAt: string;
};

type SubjectSummary = {
  subject: string;
  summaries: Summary[];
};

type ChatSummaryListProps = {
  studentId: number;
  selectedSemester: string;
  selectedSubject: string;
};

const ChatSummaryList: React.FC<ChatSummaryListProps> = ({ studentId, selectedSemester, selectedSubject }) => {
  const [chatSummaries, setChatSummaries] = useState<SubjectSummary[]>([]);
  const [onlyStudentQuestions, setOnlyStudentQuestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [noData, setNoData] = useState<boolean>(false);

  useEffect(() => {
    const fetchChatSummaries = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/chat/summary/${studentId}`, {
          params: { semester: selectedSemester, subject: selectedSubject }
        });

        if (Array.isArray(res.data) && res.data.length > 0 && Array.isArray(res.data[0].subjects)) {
          const subjects: SubjectSummary[] = res.data[0].subjects;

          subjects.forEach((subject: SubjectSummary) => {
            subject.summaries.sort((a: Summary, b: Summary) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });

          setChatSummaries(subjects);
          setNoData(subjects.length === 0);
        } else {
          setChatSummaries([]);
          setNoData(true);
        }
      } catch (error) {
        console.error('Error fetching chat summaries:', error);
        setChatSummaries([]);
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchChatSummaries();
  }, [studentId]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOnlyStudentQuestions(event.target.checked);
  };

  const filteredSummaries = selectedSubject === 'All'
    ? chatSummaries
    : chatSummaries.filter(summary => summary.subject === selectedSubject);

  const studentFilteredSummaries = filteredSummaries.map(summary => ({
    ...summary,
    summaries: summary.summaries.filter(item => !onlyStudentQuestions || item.summary.includes('You:'))
  }));

  const extractStudentQuestions = (text: string) => {
    return text.split('\n').filter(line => line.startsWith('You:')).join('\n');
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        채팅 내역 (최근 일주일)
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={onlyStudentQuestions}
            onChange={handleFilterChange}
          />
        }
        label="학생 질문만 보기"
        sx={{ mb: 2 }}
      />
      {noData ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>채팅 내역이 없습니다.</Typography>
        </Box>
      ) : studentFilteredSummaries.length === 0 ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>선택한 과목에 대한 채팅 내역이 없습니다.</Typography>
        </Box>
      ) : (
        <List>
          {studentFilteredSummaries.map((summary, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
                {summary.subject}
              </Typography>
              {summary.summaries.map((item, idx) => (
                <ListItem key={idx} sx={{ backgroundColor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                  <ListItemText
                    primary={onlyStudentQuestions ? extractStudentQuestions(item.summary) : item.summary}
                    secondary={new Date(item.createdAt).toLocaleString()}
                    primaryTypographyProps={{ style: { whiteSpace: 'pre-line' } }}
                  />
                </ListItem>
              ))}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ChatSummaryList;
