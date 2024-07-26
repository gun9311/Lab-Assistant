interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly length: number;
  }
  
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  
  interface SpeechRecognitionEvent {
    readonly results: SpeechRecognitionResultList;
    readonly resultIndex: number;
    readonly interpretation: any;
    readonly emma: Document;
    readonly charIndex: number;
  }
  
  interface SpeechRecognitionResultList {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResult;
  }
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudiostart: (this: SpeechRecognition, ev: Event) => any;
    onaudioend: (this: SpeechRecognition, ev: Event) => any;
    onend: (this: SpeechRecognition, ev: Event) => any;
    onerror: (this: SpeechRecognition, ev: Event) => any;
    onnomatch: (this: SpeechRecognition, ev: Event) => any;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
    onsoundstart: (this: SpeechRecognition, ev: Event) => any;
    onsoundend: (this: SpeechRecognition, ev: Event) => any;
    onspeechend: (this: SpeechRecognition, ev: Event) => any;
    onstart: (this: SpeechRecognition, ev: Event) => any;
    serviceURI: string;
    abort(): void;
    start(): void;
    stop(): void;
  }
  
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
  }  