import React, { useState, useEffect } from "react";
import axios from "axios";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";

type ChatSummary = {
  _id: number;
  summary: string;
  subject: string;
};

type ChatSummaryListProps = {
  studentId: number;
};

const ChatSummaryList: React.FC<ChatSummaryListProps> = ({ studentId }) => {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchChatSummaries();
    }
  }, [studentId]);

  const fetchChatSummaries = async () => {
    try {
      const res = await axios.get(`/api/users/teacher/students/${studentId}/chatSummary`);
      setChatSummaries(res.data);
    } catch (error) {
      console.error("Error fetching chat summaries:", error);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        채팅 요약
      </Typography>
      <List>
        {chatSummaries.map((summary) => (
          <ListItem key={summary._id}>
            <ListItemText primary={summary.summary} secondary={`과목: ${summary.subject}`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ChatSummaryList;
