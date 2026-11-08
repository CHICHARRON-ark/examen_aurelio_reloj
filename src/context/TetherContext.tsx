import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  CheckInEvent,
  Contact,
  EconomyTick,
  MeetupResponse,
  MeetupSession,
  PresenceStatus,
  VoteSession,
} from '../types';

type PhoneTab = 'home' | 'circle' | 'vote' | 'meetup' | 'economy';
type WatchPage = 'home' | 'vote' | 'meetup' | 'checkin' | 'economy';
type DeviceMode = 'phone' | 'watch' | 'dual';

type TetherContextValue = {
  now: number;
  contacts: Contact[];
  meId: string;
  vote: VoteSession | null;
  meetup: MeetupSession;
  economy: EconomyTick;
  checkIns: CheckInEvent[];
  phoneTab: PhoneTab;
  watchPage: WatchPage;
  deviceMode: DeviceMode;
  setPhoneTab: (tab: PhoneTab) => void;
  setWatchPage: (page: WatchPage) => void;
  setDeviceMode: (mode: DeviceMode) => void;
  setMyStatus: (status: PresenceStatus) => void;
  createVote: (question: string, labels: string[], seconds: number) => void;
  castVote: (optionId: string, voterId?: string) => void;
  closeVote: () => void;
  createMeetup: (title: string, place: string, minutesFromNow: number) => void;
  setMeetupResponse: (status: MeetupResponse) => void;
  cancelMeetup: () => void;
  sendCheckIn: (type: 'llegue' | 'sali') => void;
};

const ME_ID = 'me';

const initialContacts: Contact[] = [
  { id: ME_ID, name: 'Tú', zone: 'CDMX', offsetHours: 0, status: 'libre', isMe: true },
  { id: 'ana', name: 'Ana', zone: 'NY', offsetHours: 1, status: 'ocupado' },
  { id: 'luis', name: 'Luis', zone: 'Madrid', offsetHours: 7, status: 'libre' },
  { id: 'mama', name: 'Mamá', zone: 'GDL', offsetHours: 0, status: 'libre' },
];

const idleMeetup: MeetupSession = {
  active: false,
  title: '',
  place: '',
  meetsAt: 0,
  myStatus: 'pending',
};

const TetherContext = createContext<TetherContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function TetherProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(Date.now());
  const [contacts, setContacts] = useState(initialContacts);
  const [vote, setVote] = useState<VoteSession | null>(null);
  const [meetup, setMeetup] = useState<MeetupSession>(idleMeetup);
  const [economy, setEconomy] = useState<EconomyTick>({
    usdMxn: 17.24,
    usdChangePct: -0.18,
    spx: 5721.4,
    spxChangePct: 0.42,
    ipc: 53210,
    ipcChangePct: -0.21,
    updatedAt: Date.now(),
  });
  const [checkIns, setCheckIns] = useState<CheckInEvent[]>([]);
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('home');
  const [watchPage, setWatchPage] = useState<WatchPage>('home');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('dual');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setEconomy((prev) => {
        const jitter = () => (Math.random() - 0.5) * 0.08;
        const nextUsd = +(prev.usdMxn + jitter()).toFixed(2);
        const nextSpx = +(prev.spx + jitter() * 12).toFixed(1);
        const nextIpc = Math.round(prev.ipc + jitter() * 40);
        return {
          usdMxn: nextUsd,
          usdChangePct: +(((nextUsd - 17.24) / 17.24) * 100).toFixed(2),
          spx: nextSpx,
          spxChangePct: +(((nextSpx - 5700) / 5700) * 100).toFixed(2),
          ipc: nextIpc,
          ipcChangePct: +(((nextIpc - 53200) / 53200) * 100).toFixed(2),
          updatedAt: Date.now(),
        };
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!vote || vote.closed) return;
    if (now >= vote.endsAt) {
      setVote((v) => (v ? { ...v, closed: true } : v));
      setWatchPage('vote');
    }
  }, [now, vote]);

  const setMyStatus = useCallback((status: PresenceStatus) => {
    setContacts((list) =>
      list.map((c) => (c.id === ME_ID ? { ...c, status } : c)),
    );
  }, []);

  const createVote = useCallback((question: string, labels: string[], seconds: number) => {
    const q = (question.trim() || '¿Qué hacemos?').slice(0, 28);
    const options = labels
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((label, i) => ({
        id: `opt_${i}`,
        label: label.slice(0, 12),
        votes: [] as string[],
      }));
    if (options.length < 2) return;

    setVote({
      id: makeId('vote'),
      question: q,
      options,
      createdBy: ME_ID,
      endsAt: Date.now() + seconds * 1000,
      closed: false,
    });
    setWatchPage('vote');
    setPhoneTab('vote');
  }, []);

  const castVote = useCallback((optionId: string, voterId = ME_ID) => {
    setVote((current) => {
      if (!current || current.closed) return current;
      return {
        ...current,
        options: current.options.map((opt) => {
          const without = opt.votes.filter((id) => id !== voterId);
          if (opt.id === optionId) {
            return { ...opt, votes: [...without, voterId] };
          }
          return { ...opt, votes: without };
        }),
      };
    });
  }, []);

  const closeVote = useCallback(() => {
    setVote((v) => (v ? { ...v, closed: true, endsAt: Date.now() } : v));
  }, []);

  const createMeetup = useCallback((title: string, place: string, minutesFromNow: number) => {
    const cleanTitle = (title.trim() || 'Encuentro').slice(0, 20);
    const cleanPlace = (place.trim() || 'Punto').slice(0, 16);
    const mins = Math.max(1, Math.min(180, minutesFromNow || 15));

    setMeetup({
      active: true,
      title: cleanTitle,
      place: cleanPlace,
      meetsAt: Date.now() + mins * 60 * 1000,
      myStatus: 'pending',
    });
    setWatchPage('meetup');
    setPhoneTab('meetup');
  }, []);

  const setMeetupResponse = useCallback(
    (status: MeetupResponse) => {
      setMeetup((m) => {
        if (!m.active) return m;
        return { ...m, myStatus: status };
      });

      if (status === 'voy') setMyStatus('en_camino');
      if (status === 'llegue') {
        setMyStatus('libre');
        setCheckIns((list) =>
          [
            {
              id: makeId('check'),
              type: 'llegue' as const,
              by: ME_ID,
              at: Date.now(),
            },
            ...list,
          ].slice(0, 12),
        );
      }
      if (status === 'tardo') setMyStatus('ocupado');
      setWatchPage('meetup');
      setPhoneTab('meetup');
    },
    [setMyStatus],
  );

  const cancelMeetup = useCallback(() => {
    setMeetup(idleMeetup);
    setMyStatus('libre');
  }, [setMyStatus]);

  const sendCheckIn = useCallback(
    (type: 'llegue' | 'sali') => {
      const event: CheckInEvent = {
        id: makeId('check'),
        type,
        by: ME_ID,
        at: Date.now(),
      };
      setCheckIns((list) => [event, ...list].slice(0, 12));
      setMyStatus(type === 'llegue' ? 'libre' : 'en_camino');
      setPhoneTab('circle');
      setWatchPage('checkin');
    },
    [setMyStatus],
  );

  const value = useMemo(
    () => ({
      now,
      contacts,
      meId: ME_ID,
      vote,
      meetup,
      economy,
      checkIns,
      phoneTab,
      watchPage,
      deviceMode,
      setPhoneTab,
      setWatchPage,
      setDeviceMode,
      setMyStatus,
      createVote,
      castVote,
      closeVote,
      createMeetup,
      setMeetupResponse,
      cancelMeetup,
      sendCheckIn,
    }),
    [
      now,
      contacts,
      vote,
      meetup,
      economy,
      checkIns,
      phoneTab,
      watchPage,
      deviceMode,
      setMyStatus,
      createVote,
      castVote,
      closeVote,
      createMeetup,
      setMeetupResponse,
      cancelMeetup,
      sendCheckIn,
    ],
  );

  return <TetherContext.Provider value={value}>{children}</TetherContext.Provider>;
}

export function useTether() {
  const ctx = useContext(TetherContext);
  if (!ctx) throw new Error('useTether must be used within TetherProvider');
  return ctx;
}
