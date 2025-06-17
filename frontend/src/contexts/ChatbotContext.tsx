import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface ChatbotContextProps {
  isChatbotActive: boolean;
  setIsChatbotActive: (active: boolean) => void;
  setAlertOpen: (open: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextProps | undefined>(undefined);

interface ChatbotProviderProps {
  children: ReactNode;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  const [isChatbotActive, setIsChatbotActive] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <ChatbotContext.Provider value={{ isChatbotActive, setIsChatbotActive, setAlertOpen }}>
      {children}
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={2000} 
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlertOpen(false)} severity="warning" sx={{ width: '100%' }}>
          대화를 종료해주세요!
        </Alert>
      </Snackbar>
    </ChatbotContext.Provider>
  );
};

export const useChatbotContext = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider');
  }
  return context;
};
