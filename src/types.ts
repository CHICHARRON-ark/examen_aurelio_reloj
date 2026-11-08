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
};

export type EconomyTick = {
  usdMxn: number;
  usdChangePct: number;
  spx: number;
  spxChangePct: number;
  ipc: number;
  ipcChangePct: number;
  updatedAt: number;
};

export type CheckInEvent = {
  id: string;
  type: 'llegue' | 'sali';
  by: string;
  at: number;
};
