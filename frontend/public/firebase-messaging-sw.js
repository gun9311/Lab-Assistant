importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyCQsyDLnbkkQ_uPm2IClL8wMXJQBfuSUdY",
  authDomain: "lab-assistant-6f161.firebaseapp.com",
  projectId: "lab-assistant-6f161",
  storageBucket: "lab-assistant-6f161.appspot.com",
  messagingSenderId: "304776836981",
  appId: "1:304776836981:web:c44f78457520a0c2b8453c",
  measurementId: "G-Y09D9JEY3V"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
 // payload.notification이 없는 경우에만 수동으로 알림을 띄운다.
 if (!payload.notification) {
    const notificationTitle = payload.data.title || 'Default Title';
    const notificationOptions = {
      body: payload.data.body || 'Default body',
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
