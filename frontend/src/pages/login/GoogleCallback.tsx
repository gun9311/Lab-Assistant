// GoogleCallback.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import apiNoAuth from '../../utils/apiNoAuth';
import { setToken, setRefreshToken, setRole, setUserId, setSchoolName } from '../../utils/auth';
import { requestPermissionAndGetToken } from '../../firebase';  // FCM 권한 요청 및 토큰 발급 함수 import

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [error, setError] = useState('');
  const [isTokenFound, setTokenFound] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        try {
          // FCM 토큰 가져오기
          let fcmToken = await requestPermissionAndGetToken(setTokenFound);

          if (!fcmToken) {
            fcmToken = null;
          }

          const response = await apiNoAuth.post('/auth/google', { code, fcmToken });
          const { accessToken, refreshToken, userId, role, school, message } = response.data;

          if (accessToken) {
            // 이미 가입된 사용자: 토큰 저장 후 홈으로 리디렉션
            setToken(accessToken);
            setRefreshToken(refreshToken);
            setRole(role);
            setUserId(userId);
            setSchoolName(school);
            window.location.href = `/${role}`;
          } else if (message === 'Google authentication successful, please complete registration.') {
            // 첫 가입: 추가 정보 입력 페이지 유지
            console.log('Please complete registration.');
          }
        } catch (error) {
          console.error('Failed to exchange token', error);
          setError('Failed to authenticate with Google.');
        }
      }
    };

    fetchToken();
  }, [navigate]);

  const handleSubmit = async () => {
    try {
      // FCM 토큰 가져오기
      let fcmToken = await requestPermissionAndGetToken(setTokenFound);

      if (!fcmToken) {
        fcmToken = null;
      }

      // response의 타입을 명시적으로 지정
      const response: { data: { accessToken: string; refreshToken: string; userId: string; role: string; school: string } } = 
        await apiNoAuth.post('/auth/google/complete-registration', { name, school, authCode, fcmToken });

      const { accessToken, refreshToken, userId, role, school: schoolName } = response.data;

      // 토큰 저장 후 홈으로 리디렉션
      setToken(accessToken);
      setRefreshToken(refreshToken);
      setRole(role);
      setUserId(userId);
      setSchoolName(schoolName);
      window.location.href = `/${role}`;
    } catch (error) {
      setError('Failed to save additional info');
      console.error('Failed to save additional info', error);
    }
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="닉네임" />
      <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="학교" />
      <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} placeholder="인증 코드" />
      <button onClick={handleSubmit}>제출</button>
      {error && <div>{error}</div>}
    </div>
  );
};

export default GoogleCallback;