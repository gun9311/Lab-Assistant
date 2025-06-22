import React, { useState } from "react";
import {
  Modal,
  Box,
  Paper,
  Checkbox,
  FormControlLabel,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LockIcon from "@mui/icons-material/Lock";
import CalculateIcon from "@mui/icons-material/Calculate";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

interface AnnouncementModalProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  open,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCloseButtonClick = () => {
    onClose(dontShowAgain);
  };

  const handleBackdropClick = () => {
    // 모달 바깥 영역 클릭 시에는 '다시 보지 않기' 상태를 반영하지 않고 닫습니다.
    onClose(false);
  };

  return (
    <Modal open={open} onClose={handleBackdropClick}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Paper
          sx={{
            p: 4,
            maxWidth: "600px",
            width: "90vw",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ fontWeight: "bold" }}
          >
            NUDGE 공지사항
          </Typography>
          <Divider sx={{ my: 2 }} />
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                <LibraryBooksIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontWeight: "bold", mb: 0.5 }}
                primary="평어 라이브러리가 추가되었습니다."
                secondary={
                  <Typography
                    component="span"
                    display="block"
                    variant="body2"
                    color="text.secondary"
                  >
                    '평어 생성/일괄조회'에 '평어 라이브러리' 버튼을 통해 평어
                    전문을 참고할 수 있습니다.
                  </Typography>
                }
              />
            </ListItem>
            <Divider variant="inset" component="li" sx={{ my: 1 }} />
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                <HelpOutlineIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontWeight: "bold", mb: 0.5 }}
                primary="Q&A 게시판이 추가되었습니다."
                secondary={
                  <>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      <Box
                        component="span"
                        sx={{
                          backgroundColor: "rgba(255, 243, 79, 0.5)",
                          px: 0.5,
                          borderRadius: "4px",
                        }}
                      >
                        특히 특정 학년,학기,과목,단원에 대한 평어 내용이
                        아쉽거나 개선이 필요한 경우, 주저하지 마시고 문의
                        게시판에 글을 남겨주세요.
                      </Box>
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: "medium" }}
                    >
                      (우측 상단 알림 아이콘 옆 물음표 아이콘)
                    </Typography>
                  </>
                }
              />
            </ListItem>
            <Divider variant="inset" component="li" sx={{ my: 1 }} />
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                <CalculateIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontWeight: "bold", mb: 0.5 }}
                primary="평어 내용, 겹칠 걱정 없이 사용하세요."
                secondary={
                  <>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                    >
                      NUDGE는 단원 당 30개의 평어 문장을 제공합니다.
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                    >
                      - 2개 단원 조합 시: 30 × 30 = 900개
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                    >
                      - 3개 단원 조합 시: 30 × 30 × 30 = 27,000개
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      동학년 선생님들과 함께 사용하셔도 내용이 겹칠 우려가 거의
                      없습니다.
                    </Typography>
                  </>
                }
              />
            </ListItem>
            <Divider variant="inset" component="li" sx={{ my: 1 }} />
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                <LockIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontWeight: "bold", mb: 0.5 }}
                primary="학생 계정 관리가 더 편리해졌습니다."
                secondary={
                  <>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                    >
                      계정 관리 화면에서 학생 정보 일괄(반, 식별코드) 또는 개별
                      수정(번호, 이름) 및 비밀번호 초기화, 학생 계정 삭제가
                      가능합니다.
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, fontWeight: "medium" }}
                    >
                      특히 '식별코드'는 선생님이 생성한 학생 계정을 다른 사람이
                      임의로 조회하지 못하도록 막는 중요한 암호 역할을 합니다.
                      관리에 유의해주세요.
                    </Typography>
                  </>
                }
              />
            </ListItem>
          </List>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 3,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
              }
              label="다시 보지 않기"
            />
            <Button onClick={handleCloseButtonClick} variant="contained">
              닫기
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default AnnouncementModal;
