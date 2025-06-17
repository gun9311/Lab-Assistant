import React from "react";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { Button, Box } from "@mui/material";

const ServerErrorPage: React.FC = () => {
  const title = "500 - 서버에 문제가 발생했습니다";
  const message = (
    <>
      현재 서버에 일시적인 문제가 발생하여
      <br />
      페이지를 표시할 수 없습니다.
      <br />
      잠시 후 다시 시도해 주세요.
      <br />
      <Box mt={3}>
        <Button
          onClick={() => window.location.reload()}
          variant="contained"
          sx={{ mr: 1 }}
        >
          새로고침
        </Button>
        <Button href="/" variant="outlined">
          홈으로 가기
        </Button>
      </Box>
    </>
  );

  return <ErrorDisplay title={title} message={message} />;
};

export default ServerErrorPage;
