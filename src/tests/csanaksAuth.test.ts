import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {sendCsanaksAuthRequest} from '@/pages/csanaksAuth';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  public listeners: Record<string, ((event?: any) => void) | undefined> = {};
  public readyState = 0;
  public sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: any) => void) {
    this.listeners[type] = listener;
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = 3;
  }

  emit(type: string, event?: any) {
    this.listeners[type]?.(event);
  }
}

describe('csanaks auth websocket helper', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends auth payload to the custom backend and resolves successful responses', async() => {
    const request = {
      type: 'AUTH_LOGIN',
      login: 'demo',
      password: 'secret'
    };

    const promise = sendCsanaksAuthRequest(request);
    const socket = MockWebSocket.instances[0];

    expect(socket?.url).toBe('ws://195.19.144.46:3000');

    socket.readyState = 1;
    socket.emit('open');
    expect(socket.sentMessages).toEqual([JSON.stringify(request)]);

    socket.emit('message', {data: JSON.stringify({type: 'AUTH_SUCCESS'})});

    await expect(promise).resolves.toEqual({type: 'AUTH_SUCCESS'});
  });
});
