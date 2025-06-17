import React from "react";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { Link } from "react-router-dom";
import { Button } from "@mui/material";

const NotFoundPage: React.FC = () => {
  const title = "404 - 페이지를 찾을 수 없습니다";
  const message = (
    <>
      요청하신 페이지가 존재하지 않거나,
      <br />
      잘못된 경로로 접근하셨습니다.
      <br />
      <br />
      <Button component={Link} to="/" variant="contained">
        홈으로 돌아가기
      </Button>
    </>
  );

  return <ErrorDisplay title={title} message={message} />;
};

export default NotFoundPage;
