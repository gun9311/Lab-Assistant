import { initializeApp } from "firebase/app";
import { getMessaging, getToken as getFirebaseToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCQsyDLnbkkQ_uPm2IClL8wMXJQBfuSUdY",
  authDomain: "lab-assistant-6f161.firebaseapp.com",
  projectId: "lab-assistant-6f161",
  storageBucket: "lab-assistant-6f161.appspot.com",
  messagingSenderId: "304776836981",
  appId: "1:304776836981:web:c44f78457520a0c2b8453c",
  measurementId: "G-Y09D9JEY3V"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Messaging 초기화
const messaging = getMessaging(app);

// FCM 토큰을 로컬 스토리지에 저장
const saveToken = (token) => {
  localStorage.setItem('fcmToken', token);
};

// 로컬 스토리지에서 FCM 토큰 가져오기
const getLocalToken = () => {
  return localStorage.getItem('fcmToken');
};

// 푸시 알림 권한 요청 및 FCM 토큰 발급
export const requestPermissionAndGetToken = async (setTokenFound) => {
    try {
      // 로컬 스토리지에서 기존 토큰 가져오기
      const existingToken = getLocalToken();
      if (existingToken) {
        console.log('Using existing token from local storage:', existingToken);
        setTokenFound(true);
        return existingToken;
      }
  
      // 알림 권한 요청
      const status = await Notification.requestPermission();
      if (status === 'granted') {
        console.log('Notification permission granted.');
        const currentToken = await getFirebaseToken(messaging, { vapidKey: 'BKqCWKiEWurrCRMR6xwbD7yVWrOf5UZeX7rjX24AOY9EupIqKeByPCp7ZIsRM0ky7L4v74hyFDZLc6OrlQ75IC4' });
        if (currentToken) {
          console.log('Current token for client: ', currentToken);
          saveToken(currentToken);  // 로컬 스토리지에 토큰 저장
          setTokenFound(true);
          return currentToken;
        } else {
          console.log('No registration token available.');
          setTokenFound(false);
          return null;
        }
      } else {
        console.log('Notification permission denied.');
        setTokenFound(false);
        return null;
      }
    } catch (err) {
      console.log('An error occurred while retrieving token. ', err);
      setTokenFound(false);
      return null;
    }
  };

// 메시지 수신 리스너
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Foreground message received: ", payload); // 디버깅용 로그 추가
      resolve(payload);
    });
  });
