import React from "react";
import ErrorDisplay from "./common/ErrorDisplay";

const ServiceUnavailable: React.FC = () => {
  // --- 하드코딩된 시간 설정 ---
  const startHour = 9; // 오전 9시
  const endHour = 3; // 오후 6시를 의미
  // --- 하드코딩 끝 ---

  const title = "서비스 이용 불가 시간";
  const message = (
    <>
      현재는 서비스를 이용할 수 없는 시간입니다.
      <br />
      이용 가능 시간:{" "}
      <strong>
        오전 {startHour}시 ~ 오후 {endHour}시
      </strong>
    </>
  );

  return <ErrorDisplay title={title} message={message} />;
};

export default ServiceUnavailable;
