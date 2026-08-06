const CSANAKS_WS_URL = 'ws://195.19.144.46:3000';

export type CsanaksAuthPayload = {
  type: 'AUTH_LOGIN' | 'AUTH_REGISTER',
  login: string,
  password: string
};

export type CsanaksAuthResponse = {
  type: string,
  message?: string,
  error?: string,
  [key: string]: any
};

export async function sendCsanaksAuthRequest(payload: CsanaksAuthPayload): Promise<CsanaksAuthResponse> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(CSANAKS_WS_URL);
    let settled = false;

    const cleanup = () => {
      if(socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };

    const finish = (callback: () => void) => {
      if(settled) return;
      settled = true;
      cleanup();
      callback();
    };

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(payload));
    });

    socket.addEventListener('message', (event) => {
      try {
        const response = JSON.parse(event.data);
        finish(() => resolve(response));
      } catch(err) {
        finish(() => reject(new Error('Invalid server response')));
      }
    });

    socket.addEventListener('error', () => {
      finish(() => reject(new Error('WebSocket connection failed')));
    });

    socket.addEventListener('close', () => {
      if(!settled) {
        finish(() => reject(new Error('WebSocket closed before response')));
      }
    });
  });
}
