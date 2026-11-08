import Constants from 'expo-constants';
import type {
  CheckInEvent,
  Contact,
  EconomyTick,
  HeartTick,
  MeetupSession,
  TetherEvent,
  VoteSession,
  WatchSlot,
  WeatherTick,
} from '../types';

export type ServerMessage = {
  type: 'state';
  state: {
    contacts: Contact[];
    vote: VoteSession | null;
    meetup: MeetupSession;
    economy: EconomyTick;
    checkIns: CheckInEvent[];
    watchLayout: WatchSlot[];
    weather: WeatherTick;
    heart: HeartTick;
  };
  events: TetherEvent[];
  sessions: number;
};

type LinkStatus = 'open' | 'closed';

function socketUrl() {
  let host = '127.0.0.1';
  if (typeof window !== 'undefined' && window.location?.hostname) {
    host = window.location.hostname || host;
  } else {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost;
    if (hostUri) host = hostUri.split(':')[0];
  }
  return `ws://${host}:8787`;
}

export function connectTether(
  onMessage: (message: ServerMessage) => void,
  onStatus: (status: LinkStatus) => void,
  role: () => 'phone' | 'watch' | 'dual',
) {
  let socket: WebSocket | null = null;
  let stopped = false;
  let delay = 500;
  const pending: string[] = [];

  const sendRaw = (raw: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(raw);
    else pending.push(raw);
  };

  const connect = () => {
    if (stopped) return;
    const next = new WebSocket(socketUrl());
    socket = next;
    next.onopen = () => {
      if (stopped || socket !== next) return;
      delay = 500;
      onStatus('open');
      next.send(JSON.stringify({ type: 'hello', role: role() }));
      while (pending.length) next.send(pending.shift() as string);
    };
    next.onmessage = (event) => {
      if (stopped || socket !== next) return;
      onMessage(JSON.parse(String(event.data)) as ServerMessage);
    };
    next.onclose = () => {
      if (socket !== next) return;
      onStatus('closed');
      if (!stopped) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 5000);
      }
    };
    next.onerror = () => next.close();
  };

  connect();

  return {
    send(command: object) {
      sendRaw(JSON.stringify(command));
    },
    stop() {
      stopped = true;
      socket?.close();
    },
  };
}
