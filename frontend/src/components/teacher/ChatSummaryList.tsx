import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Box, Typography, List, ListItem, ListItemText, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent, Switch, FormControlLabel } from '@mui/material';

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
};

const ChatSummaryList: React.FC<ChatSummaryListProps> = ({ studentId }) => {
  const [chatSummaries, setChatSummaries] = useState<SubjectSummary[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [onlyStudentQuestions, setOnlyStudentQuestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchChatSummaries = async () => {
      try {
        const res = await api.get(`/chat/summary/${studentId}`);
        console.log('API Response:', res.data);

        if (Array.isArray(res.data) && res.data.length > 0 && Array.isArray(res.data[0].subjects)) {
          const subjects: SubjectSummary[] = res.data[0].subjects;

          // Summaries를 최신순으로 정렬
          subjects.forEach((subject: SubjectSummary) => {
            subject.summaries.sort((a: Summary, b: Summary) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });

          setChatSummaries(subjects);
        }
      } catch (error) {
        console.error('Error fetching chat summaries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatSummaries();
  }, [studentId]);

  const handleSubjectChange = (event: SelectChangeEvent<string>) => {
    setSelectedSubject(event.target.value);
  };

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

  if (!Array.isArray(chatSummaries) || chatSummaries.length === 0) {
    return <Typography>No chat summaries available</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        채팅 내역
      </Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>과목 선택</InputLabel>
        <Select
          value={selectedSubject}
          onChange={handleSubjectChange}
        >
          <MenuItem value="All">전체</MenuItem>
          {chatSummaries.map((summary, index) => (
            <MenuItem key={index} value={summary.subject}>
              {summary.subject}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
    </Box>
  );
};

export default ChatSummaryList;
