import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CheckInEvent,
  Contact,
  EconomyTick,
  HeartTick,
  MeetupResponse,
  MeetupSession,
  PresenceStatus,
  VoteSession,
  WatchSlot,
  WeatherTick,
} from '../types';
import { heartSensorAvailable, listenHeartRate } from '../sync/heart';
import { reactToEvent } from '../sync/events';
import { readArrivalLocation } from '../sync/location';
import { connectTether } from '../sync/socket';

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
  watchLayout: WatchSlot[];
  weather: WeatherTick;
  heart: HeartTick;
  heartLive: boolean;
  heartNote: string;
  phoneTab: PhoneTab;
  watchPage: WatchPage;
  deviceMode: DeviceMode;
  connected: boolean;
  sessions: number;
  locating: boolean;
  locationNote: string;
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
  setWatchLayout: (layout: WatchSlot[]) => void;
  connectHeart: () => void;
};

const ME_ID = 'me';

const idleMeetup: MeetupSession = {
  active: false,
  title: '',
  place: '',
  meetsAt: 0,
  myStatus: 'pending',
  dueNotified: false,
};

const emptyEconomy: EconomyTick = {
  usdMxn: 0,
  usdChangePct: 0,
  spx: 0,
  spxChangePct: 0,
  ipc: 0,
  ipcChangePct: 0,
  updatedAt: 0,
  source: 'pending',
};

const defaultLayout: WatchSlot[] = [
  { id: 'time', visible: true },
  { id: 'fx', visible: true },
  { id: 'temperature', visible: true },
  { id: 'heart', visible: true },
];

const emptyWeather: WeatherTick = {
  celsius: null,
  updatedAt: 0,
  source: 'pending',
  place: 'CDMX',
  lat: 19.4326,
  lon: -99.1332,
};

const emptyHeart: HeartTick = { bpm: null, updatedAt: 0 };

function initialDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'dual';
  const as = new URLSearchParams(window.location.search).get('as');
  if (as === 'phone' || as === 'watch' || as === 'dual') return as;
  return 'dual';
}

const TetherContext = createContext<TetherContextValue | null>(null);

export function TetherProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(Date.now());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [vote, setVote] = useState<VoteSession | null>(null);
  const [meetup, setMeetup] = useState<MeetupSession>(idleMeetup);
  const [economy, setEconomy] = useState<EconomyTick>(emptyEconomy);
  const [checkIns, setCheckIns] = useState<CheckInEvent[]>([]);
  const [watchLayout, setWatchLayoutState] = useState<WatchSlot[]>(defaultLayout);
  const [weather, setWeather] = useState<WeatherTick>(emptyWeather);
  const [heart, setHeart] = useState<HeartTick>(emptyHeart);
  const [heartLive, setHeartLive] = useState(false);
  const [heartNote, setHeartNote] = useState('');
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('home');
  const [watchPage, setWatchPage] = useState<WatchPage>('home');
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(initialDeviceMode);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');

  const modeRef = useRef(deviceMode);
  modeRef.current = deviceMode;
  const linkRef = useRef<ReturnType<typeof connectTether> | null>(null);
  const locatingRef = useRef(false);
  const stopHeartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const link = connectTether(
      (message) => {
        setContacts(message.state.contacts);
        setVote(message.state.vote);
        setMeetup(message.state.meetup);
        setEconomy(message.state.economy);
        setCheckIns(message.state.checkIns);
        setWatchLayoutState(message.state.watchLayout);
        setWeather(message.state.weather);
        setHeart(message.state.heart);
        setSessions(message.sessions);
        for (const event of message.events) {
          reactToEvent(event, modeRef.current, setPhoneTab, setWatchPage);
        }
      },
      (status) => setConnected(status === 'open'),
      () => modeRef.current,
    );
    linkRef.current = link;
    return () => {
      link.stop();
      stopHeartRef.current?.();
    };
  }, []);

  const send = useCallback((command: object) => {
    linkRef.current?.send(command);
  }, []);

  const setDeviceMode = useCallback((mode: DeviceMode) => {
    modeRef.current = mode;
    setDeviceModeState(mode);
    send({ type: 'hello', role: mode });
  }, [send]);

  const setMyStatus = useCallback((status: PresenceStatus) => {
    send({ type: 'set_status', status });
  }, [send]);

  const createVote = useCallback((question: string, labels: string[], seconds: number) => {
    send({ type: 'create_vote', question, labels, seconds });
  }, [send]);

  const castVote = useCallback((optionId: string) => {
    send({ type: 'cast_vote', optionId });
  }, [send]);

  const closeVote = useCallback(() => {
    send({ type: 'close_vote' });
  }, [send]);

  const createMeetup = useCallback((title: string, place: string, minutesFromNow: number) => {
    send({ type: 'create_meetup', title, place, minutesFromNow });
  }, [send]);

  const attachLocation = useCallback(async () => {
    if (locatingRef.current) return null;
    locatingRef.current = true;
    setLocating(true);
    try {
      const location = await readArrivalLocation();
      setLocationNote(
        location ? '' : 'Sin permiso de ubicación: el aviso se envió igual.',
      );
      return location;
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }, []);

  const setMeetupResponse = useCallback((status: MeetupResponse) => {
    void (async () => {
      const location = status === 'llegue' ? await attachLocation() : null;
      send({
        type: 'set_meetup_response',
        status,
        lat: location?.lat,
        lon: location?.lon,
      });
    })();
  }, [attachLocation, send]);

  const cancelMeetup = useCallback(() => {
    send({ type: 'cancel_meetup' });
  }, [send]);

  const setWatchLayout = useCallback((layout: WatchSlot[]) => {
    send({ type: 'set_watch_layout', layout });
    setWatchPage('home');
  }, [send]);

  const connectHeart = useCallback(() => {
    void (async () => {
      if (!heartSensorAvailable()) {
        setHeartNote('Este navegador no deja leer un pulsómetro. En el reloj se verá sin sensor.');
        return;
      }
      try {
        stopHeartRef.current?.();
        setHeartLive(true);
        setHeartNote('Elige el pulsómetro en la ventana del sistema.');
        const stop = await listenHeartRate((bpm) => {
          send({ type: 'set_heart', bpm });
          setHeartNote(`${bpm} lpm en el reloj`);
        });
        stopHeartRef.current = () => {
          stop();
          setHeartLive(false);
        };
      } catch {
        setHeartLive(false);
        setHeartNote('No se conectó el pulsómetro. La cara muestra el espacio vacío.');
      }
    })();
  }, [send]);

  const sendCheckIn = useCallback((type: 'llegue' | 'sali') => {
    void (async () => {
      const location = type === 'llegue' ? await attachLocation() : null;
      send({
        type: 'check_in',
        checkInType: type,
        lat: location?.lat,
        lon: location?.lon,
      });
    })();
  }, [attachLocation, send]);

  const value = useMemo(
    () => ({
      now,
      contacts,
      meId: ME_ID,
      vote,
      meetup,
      economy,
      checkIns,
      watchLayout,
      weather,
      heart,
      heartLive,
      heartNote,
      phoneTab,
      watchPage,
      deviceMode,
      connected,
      sessions,
      locating,
      locationNote,
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
      setWatchLayout,
      connectHeart,
    }),
    [
      now,
      contacts,
      vote,
      meetup,
      economy,
      checkIns,
      watchLayout,
      weather,
      heart,
      heartLive,
      heartNote,
      phoneTab,
      watchPage,
      deviceMode,
      connected,
      sessions,
      locating,
      locationNote,
      setDeviceMode,
      setMyStatus,
      createVote,
      castVote,
      closeVote,
      createMeetup,
      setMeetupResponse,
      cancelMeetup,
      sendCheckIn,
      setWatchLayout,
      connectHeart,
    ],
  );

  return <TetherContext.Provider value={value}>{children}</TetherContext.Provider>;
}

export function useTether() {
  const ctx = useContext(TetherContext);
  if (!ctx) throw new Error('useTether must be used within TetherProvider');
  return ctx;
}
