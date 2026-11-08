const ME_ID = 'me';

const STATUSES = new Set(['libre', 'ocupado', 'en_camino']);
const MEETUP_STATUSES = new Set(['voy', 'llegue', 'tardo']);
const WIDGETS = ['time', 'fx', 'temperature', 'heart'];

function defaultWatchLayout() {
  return WIDGETS.map((id) => ({ id, visible: true }));
}

function defaultWeather() {
  return {
    celsius: null,
    updatedAt: 0,
    source: 'pending',
    place: 'CDMX',
    lat: 19.4326,
    lon: -99.1332,
  };
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function initialState() {
  return {
    contacts: [
      { id: ME_ID, name: 'Tú', zone: 'CDMX', offsetHours: 0, status: 'libre', isMe: true },
      { id: 'ana', name: 'Ana', zone: 'NY', offsetHours: 1, status: 'ocupado' },
      { id: 'luis', name: 'Luis', zone: 'Madrid', offsetHours: 7, status: 'libre' },
      { id: 'mama', name: 'Mamá', zone: 'GDL', offsetHours: 0, status: 'libre' },
    ],
    vote: null,
    meetup: {
      active: false,
      title: '',
      place: '',
      meetsAt: 0,
      myStatus: 'pending',
      dueNotified: false,
    },
    economy: {
      usdMxn: 0,
      usdChangePct: 0,
      spx: 0,
      spxChangePct: 0,
      ipc: 0,
      ipcChangePct: 0,
      updatedAt: 0,
      source: 'pending',
    },
    checkIns: [],
    watchLayout: defaultWatchLayout(),
    weather: defaultWeather(),
    heart: { bpm: null, updatedAt: 0 },
  };
}

function setMyStatus(contacts, status) {
  return contacts.map((contact) =>
    contact.id === ME_ID ? { ...contact, status } : contact,
  );
}

function normalize(raw) {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    contacts: Array.isArray(raw.contacts) && raw.contacts.length ? raw.contacts : base.contacts,
    vote: raw.vote && typeof raw.vote === 'object' ? raw.vote : null,
    meetup: { ...base.meetup, ...(raw.meetup && typeof raw.meetup === 'object' ? raw.meetup : {}) },
    economy: { ...base.economy, ...(raw.economy && typeof raw.economy === 'object' ? raw.economy : {}) },
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns.slice(0, 12) : [],
    watchLayout: normalizeLayout(raw.watchLayout),
    weather: { ...defaultWeather(), ...(raw.weather && typeof raw.weather === 'object' ? raw.weather : {}) },
    heart: {
      bpm: finite(raw.heart?.bpm) ?? null,
      updatedAt: finite(raw.heart?.updatedAt) ?? 0,
    },
  };
}

function normalizeLayout(raw) {
  const fallback = defaultWatchLayout();
  if (!Array.isArray(raw)) return fallback;
  const seen = new Set();
  const layout = [];
  for (const item of raw) {
    const id = item && item.id;
    if (!WIDGETS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    layout.push({ id, visible: item.visible !== false });
  }
  for (const slot of fallback) {
    if (!seen.has(slot.id)) layout.push(slot);
  }
  return layout;
}

function weatherAt(weather, lat, lon, place) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return weather;
  return {
    ...weather,
    lat,
    lon,
    place: place || weather.place,
  };
}

function unchanged(state) {
  return { state, events: [] };
}

function apply(state, msg, now = Date.now()) {
  if (!msg || typeof msg !== 'object') return unchanged(state);

  switch (msg.type) {
    case 'set_status': {
      if (!STATUSES.has(msg.status)) return unchanged(state);
      return {
        state: { ...state, contacts: setMyStatus(state.contacts, msg.status) },
        events: [],
      };
    }
    case 'create_vote': {
      const question = String(msg.question || '').trim().slice(0, 28) || '¿Qué hacemos?';
      const labels = (Array.isArray(msg.labels) ? msg.labels : [])
        .map((label) => String(label || '').trim())
        .filter(Boolean)
        .slice(0, 3);
      if (labels.length < 2) return unchanged(state);
      const seconds = Math.max(10, Math.min(600, Number(msg.seconds) || 120));
      return {
        state: {
          ...state,
          vote: {
            id: makeId('vote'),
            question,
            options: labels.map((label, index) => ({
              id: `opt_${index}`,
              label: label.slice(0, 12),
              votes: [],
            })),
            createdBy: ME_ID,
            endsAt: now + seconds * 1000,
            closed: false,
          },
        },
        events: [{ id: makeId('ev'), kind: 'vote_created' }],
      };
    }
    case 'cast_vote': {
      if (!state.vote || state.vote.closed) return unchanged(state);
      const optionId = String(msg.optionId || '');
      if (!state.vote.options.some((option) => option.id === optionId)) return unchanged(state);
      return {
        state: {
          ...state,
          vote: {
            ...state.vote,
            options: state.vote.options.map((option) => {
              const without = option.votes.filter((id) => id !== ME_ID);
              return option.id === optionId
                ? { ...option, votes: [...without, ME_ID] }
                : { ...option, votes: without };
            }),
          },
        },
        events: [],
      };
    }
    case 'close_vote': {
      if (!state.vote || state.vote.closed) return unchanged(state);
      return {
        state: {
          ...state,
          vote: { ...state.vote, closed: true, endsAt: now },
        },
        events: [{ id: makeId('ev'), kind: 'vote_closed' }],
      };
    }
    case 'create_meetup': {
      const title = String(msg.title || '').trim().slice(0, 20) || 'Encuentro';
      const place = String(msg.place || '').trim().slice(0, 16) || 'Punto';
      const minutes = Math.max(1, Math.min(180, Number(msg.minutesFromNow) || 15));
      return {
        state: {
          ...state,
          meetup: {
            active: true,
            title,
            place,
            meetsAt: now + minutes * 60 * 1000,
            myStatus: 'pending',
            dueNotified: false,
          },
        },
        events: [{ id: makeId('ev'), kind: 'meetup_created' }],
      };
    }
    case 'set_meetup_response': {
      if (!state.meetup.active || !MEETUP_STATUSES.has(msg.status)) return unchanged(state);
      const status = msg.status;
      let contacts = state.contacts;
      let checkIns = state.checkIns;
      if (status === 'voy') contacts = setMyStatus(contacts, 'en_camino');
      if (status === 'tardo') contacts = setMyStatus(contacts, 'ocupado');
      if (status === 'llegue') {
        contacts = setMyStatus(contacts, 'libre');
        checkIns = prependCheckIn(checkIns, {
          type: 'llegue',
          at: now,
          lat: finite(msg.lat),
          lon: finite(msg.lon),
          place: cleanPlace(msg.place),
        });
      }
      return {
        state: {
          ...state,
          contacts,
          checkIns,
          weather:
            status === 'llegue'
              ? weatherAt(state.weather, finite(msg.lat), finite(msg.lon), cleanPlace(msg.place))
              : state.weather,
          meetup: { ...state.meetup, myStatus: status },
        },
        events: [{ id: makeId('ev'), kind: 'meetup_response' }],
      };
    }
    case 'cancel_meetup': {
      if (!state.meetup.active) return unchanged(state);
      return {
        state: {
          ...state,
          contacts: setMyStatus(state.contacts, 'libre'),
          meetup: initialState().meetup,
        },
        events: [],
      };
    }
    case 'check_in': {
      const type = msg.checkInType === 'sali' ? 'sali' : 'llegue';
      const lat = finite(msg.lat);
      const lon = finite(msg.lon);
      const place = cleanPlace(msg.place);
      return {
        state: {
          ...state,
          contacts: setMyStatus(state.contacts, type === 'llegue' ? 'libre' : 'en_camino'),
          checkIns: prependCheckIn(state.checkIns, { type, at: now, lat, lon, place }),
          weather: type === 'llegue' ? weatherAt(state.weather, lat, lon, place) : state.weather,
        },
        events: [{ id: makeId('ev'), kind: 'check_in' }],
      };
    }
    case 'set_watch_layout': {
      const watchLayout = normalizeLayout(msg.layout);
      return { state: { ...state, watchLayout }, events: [] };
    }
    case 'set_heart': {
      const bpm = Number(msg.bpm);
      if (!Number.isFinite(bpm) || bpm < 20 || bpm > 240) return unchanged(state);
      return {
        state: { ...state, heart: { bpm: Math.round(bpm), updatedAt: now } },
        events: [],
      };
    }
    default:
      return unchanged(state);
  }
}

function prependCheckIn(list, fields) {
  const item = {
    id: makeId('check'),
    type: fields.type,
    by: ME_ID,
    at: fields.at,
  };
  if (typeof fields.lat === 'number' && typeof fields.lon === 'number') {
    item.lat = fields.lat;
    item.lon = fields.lon;
  }
  if (fields.place) item.place = fields.place;
  return [item, ...list].slice(0, 12);
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cleanPlace(value) {
  const place = String(value || '').trim();
  return place ? place.slice(0, 32) : '';
}

function tick(state, now = Date.now()) {
  const events = [];
  let next = state;

  if (state.vote && !state.vote.closed && now >= state.vote.endsAt) {
    next = { ...next, vote: { ...next.vote, closed: true } };
    events.push({ id: makeId('ev'), kind: 'vote_closed' });
  }

  if (
    next.meetup.active &&
    !next.meetup.dueNotified &&
    next.meetup.meetsAt > 0 &&
    now >= next.meetup.meetsAt
  ) {
    next = { ...next, meetup: { ...next.meetup, dueNotified: true } };
    events.push({ id: makeId('ev'), kind: 'meetup_due' });
  }

  return { state: events.length ? next : state, events };
}

function settle(state, now = Date.now()) {
  let next = tick(state, now).state;
  if (next.economy.updatedAt && next.economy.source !== 'pending') {
    next = { ...next, economy: { ...next.economy, source: 'cached' } };
  }
  if (next.weather?.updatedAt && next.weather.source !== 'pending') {
    next = { ...next, weather: { ...next.weather, source: 'cached' } };
  }
  return next;
}

module.exports = {
  ME_ID,
  initialState,
  normalize,
  apply,
  tick,
  settle,
};
