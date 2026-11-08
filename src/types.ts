export type PresenceStatus = 'libre' | 'ocupado' | 'en_camino';

export type Contact = {
  id: string;
  name: string;
  zone: string;
  offsetHours: number;
  status: PresenceStatus;
  isMe?: boolean;
};

export type VoteOption = {
  id: string;
  label: string;
  votes: string[]; // contact ids
};

export type VoteSession = {
  id: string;
  question: string;
  options: VoteOption[];
  createdBy: string;
  endsAt: number;
  closed: boolean;
};

export type MeetupResponse = 'pending' | 'voy' | 'llegue' | 'tardo';

export type MeetupSession = {
  active: boolean;
  title: string;
  place: string;
  meetsAt: number;
  myStatus: MeetupResponse;
  dueNotified?: boolean;
};

export type EconomySource = 'pending' | 'live' | 'partial' | 'cached';

export type EconomyTick = {
  usdMxn: number;
  usdChangePct: number;
  spx: number;
  spxChangePct: number;
  ipc: number;
  ipcChangePct: number;
  updatedAt: number;
  source: EconomySource;
};

export type WatchWidgetId = 'time' | 'fx' | 'temperature' | 'heart';

export type WatchSlot = {
  id: WatchWidgetId;
  visible: boolean;
};

export type WeatherTick = {
  celsius: number | null;
  updatedAt: number;
  source: 'pending' | 'live' | 'cached';
  place: string;
  lat: number;
  lon: number;
};

export type HeartTick = {
  bpm: number | null;
  updatedAt: number;
};

export type CheckInEvent = {
  id: string;
  type: 'llegue' | 'sali';
  by: string;
  at: number;
  lat?: number;
  lon?: number;
  place?: string;
};

export type TetherEventKind =
  | 'vote_created'
  | 'vote_closed'
  | 'meetup_created'
  | 'meetup_due'
  | 'meetup_response'
  | 'check_in';

export type TetherEvent = {
  id: string;
  kind: TetherEventKind;
};
