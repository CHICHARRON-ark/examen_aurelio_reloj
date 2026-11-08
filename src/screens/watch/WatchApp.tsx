import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { WatchShell } from '../../components/WatchShell';
import { useTether } from '../../context/TetherContext';
import { colors } from '../../theme';
import { formatCountdown, formatTime, pctText } from '../../utils/format';

type Props = { compact?: boolean };

function WatchNav({
  page,
  onChange,
}: {
  page: string;
  onChange: (p: 'home' | 'vote' | 'meetup' | 'checkin' | 'economy') => void;
}) {
  const items: Array<'home' | 'vote' | 'meetup' | 'checkin' | 'economy'> = [
    'home',
    'vote',
    'meetup',
    'checkin',
    'economy',
  ];
  const labels: Record<string, string> = {
    home: '•',
    vote: 'V',
    meetup: 'Q',
    checkin: 'C',
    economy: '$',
  };

  return (
    <View style={styles.nav}>
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[styles.navDot, page === item && styles.navDotActive]}
          hitSlop={6}
        >
          <Text style={styles.navText}>{labels[item]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HomePage() {
  const { now, contacts, meId, vote, meetup, economy, weather, heart, watchLayout, connected, sessions } =
    useTether();
  const me = contacts.find((c) => c.id === meId);
  const visible = watchLayout.filter((slot) => slot.visible);
  const alert =
    vote && !vote.closed
      ? `Voto ${formatCountdown(vote.endsAt - now)}`
      : meetup.active
        ? `Quedar ${formatCountdown(meetup.meetsAt - now)}`
        : '';

  if (!me) {
    return (
      <View style={styles.page}>
        <Text style={styles.title} numberOfLines={1}>
          Enlace…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.kicker} numberOfLines={1}>
        {!connected ? 'SIN ENLACE' : sessions > 1 ? 'TETHER · ENLACE' : 'TETHER'}
      </Text>
      {visible.length === 0 ? (
        <Text style={styles.sub} numberOfLines={3}>
          Elige elementos en el móvil
        </Text>
      ) : (
        visible.map((slot) => {
          const large = slot.id === 'time' && visible.length <= 2;
          if (slot.id === 'time') {
            return (
              <WatchFact key={slot.id} label="Hora" value={formatTime(now)} large={large} />
            );
          }
          if (slot.id === 'fx') {
            return (
              <WatchFact
                key={slot.id}
                label="USD/MXN"
                value={economy.source === 'pending' || economy.usdMxn <= 0 ? '—' : economy.usdMxn.toFixed(2)}
                large={large}
              />
            );
          }
          if (slot.id === 'temperature') {
            return (
              <WatchFact
                key={slot.id}
                label={weather.place || 'Temp'}
                value={weather.celsius == null ? '—' : `${Math.round(weather.celsius)}°`}
                large={large}
              />
            );
          }
          return (
            <WatchFact
              key={slot.id}
              label={heart.bpm == null ? 'Sin sensor' : 'lpm'}
              value={heart.bpm == null ? '—' : String(heart.bpm)}
              large={large}
            />
          );
        })
      )}
      {alert ? (
        <Text style={styles.alert} numberOfLines={1}>
          {alert}
        </Text>
      ) : null}
    </View>
  );
}

function WatchFact({ label, value, large }: { label: string; value: string; large: boolean }) {
  return (
    <View style={styles.fact}>
      <Text
        style={large ? styles.clock : styles.factValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.kicker} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function VotePage() {
  const { now, vote, castVote, meId } = useTether();

  if (!vote) {
    return (
      <View style={styles.page}>
        <Text style={styles.title} numberOfLines={2}>
          Sin votación
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          Créala en el móvil
        </Text>
      </View>
    );
  }

  const remaining = vote.endsAt - now;
  const winner = [...vote.options].sort((a, b) => b.votes.length - a.votes.length)[0];
  const myVote = vote.options.find((o) => o.votes.includes(meId))?.id;

  if (vote.closed || remaining <= 0) {
    return (
      <View style={styles.page}>
        <Text style={styles.kicker} numberOfLines={1}>
          Resultado
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {winner?.label ?? '—'}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {winner?.votes.length ?? 0} votos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.kicker} numberOfLines={1}>
        {formatCountdown(remaining)}
      </Text>
      <Text style={styles.question} numberOfLines={2}>
        {vote.question}
      </Text>
      <View style={styles.optCol}>
        {vote.options.slice(0, 3).map((opt) => (
          <Pressable
            key={opt.id}
            style={[styles.optBtn, myVote === opt.id && styles.optBtnActive]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              castVote(opt.id);
            }}
          >
            <Text style={styles.optText} numberOfLines={1}>
              {opt.label} ({opt.votes.length})
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MeetupPage() {
  const { now, meetup, setMeetupResponse, createMeetup } = useTether();

  if (!meetup.active) {
    return (
      <View style={styles.page}>
        <Text style={styles.title} numberOfLines={1}>
          Quedar
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          Créalo en el móvil
        </Text>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => createMeetup('Café', 'Plaza', 1)}
        >
          <Text style={styles.secondaryText}>Demo 1 min</Text>
        </Pressable>
      </View>
    );
  }

  const remaining = meetup.meetsAt - now;
  const due = remaining <= 0;

  return (
    <View style={styles.page}>
      <Text style={styles.kicker} numberOfLines={1}>
        {due ? 'AHORA' : formatCountdown(remaining)}
      </Text>
      <Text style={styles.question} numberOfLines={1}>
        {meetup.title}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {meetup.place}
      </Text>
      <View style={styles.optCol}>
        <Pressable
          style={[styles.optBtn, meetup.myStatus === 'voy' && styles.optBtnActive]}
          onPress={() => setMeetupResponse('voy')}
        >
          <Text style={styles.optText} numberOfLines={1}>
            Voy
          </Text>
        </Pressable>
        <Pressable
          style={[styles.optBtn, meetup.myStatus === 'llegue' && styles.optBtnActive]}
          onPress={() => setMeetupResponse('llegue')}
        >
          <Text style={styles.optText} numberOfLines={1}>
            Llegué
          </Text>
        </Pressable>
        <Pressable
          style={[styles.optBtn, meetup.myStatus === 'tardo' && styles.optBtnActive]}
          onPress={() => setMeetupResponse('tardo')}
        >
          <Text style={styles.optText} numberOfLines={1}>
            Tardo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CheckInPage() {
  const { sendCheckIn, checkIns, now } = useTether();
  const last = checkIns[0];

  return (
    <View style={styles.page}>
      <Text style={styles.title} numberOfLines={1}>
        Check-in
      </Text>
      <Pressable style={styles.primaryBtn} onPress={() => sendCheckIn('llegue')}>
        <Text style={styles.primaryText}>Llegué</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => sendCheckIn('sali')}>
        <Text style={styles.secondaryText}>Salí</Text>
      </Pressable>
      {last ? (
        <Text style={styles.sub} numberOfLines={1}>
          {last.type === 'llegue' ? 'Llegué' : 'Salí'}
          {last.place ? ` · ${last.place}` : ''} · {formatTime(last.at)}
        </Text>
      ) : (
        <Text style={styles.sub} numberOfLines={1}>
          {formatTime(now)}
        </Text>
      )}
    </View>
  );
}

function EconomyPage() {
  const { economy, setPhoneTab, setDeviceMode, deviceMode } = useTether();

  return (
    <View style={styles.page}>
      <Text style={styles.kicker} numberOfLines={1}>
        USD/MXN
      </Text>
      <Text style={styles.clock} numberOfLines={1} adjustsFontSizeToFit>
        {economy.source === 'pending' ? '—' : economy.usdMxn.toFixed(2)}
      </Text>
      {economy.source === 'pending' ? null : (
        <Text
          style={[
            styles.sub,
            { color: economy.usdChangePct >= 0 ? colors.watchAccent : '#FCA5A5' },
          ]}
          numberOfLines={1}
        >
          {pctText(economy.usdChangePct)}
        </Text>
      )}
      <Pressable
        style={styles.secondaryBtn}
        onPress={() => {
          setPhoneTab('economy');
          if (deviceMode === 'watch') setDeviceMode('phone');
        }}
      >
        <Text style={styles.secondaryText}>Ver móvil</Text>
      </Pressable>
    </View>
  );
}

export function WatchApp({ compact = false }: Props) {
  const { watchPage, setWatchPage } = useTether();

  let body: React.ReactNode = <HomePage />;
  if (watchPage === 'vote') body = <VotePage />;
  if (watchPage === 'meetup') body = <MeetupPage />;
  if (watchPage === 'checkin') body = <CheckInPage />;
  if (watchPage === 'economy') body = <EconomyPage />;

  return (
    <View style={styles.root}>
      <WatchShell compact={compact}>
        {body}
      </WatchShell>
      <WatchNav page={watchPage} onChange={setWatchPage} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  kicker: {
    color: colors.watchMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    maxWidth: '100%',
  },
  clock: {
    color: colors.watchInk,
    fontSize: 28,
    fontWeight: '700',
    maxWidth: '100%',
  },
  title: {
    color: colors.watchInk,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '100%',
  },
  question: {
    color: colors.watchInk,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '100%',
    marginBottom: 2,
  },
  sub: {
    color: colors.watchMuted,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: '100%',
  },
  alert: {
    marginTop: 2,
    color: colors.watchAccent,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '100%',
  },
  fact: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  factValue: {
    color: colors.watchInk,
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '100%',
  },
  optCol: {
    width: '100%',
    gap: 4,
    marginTop: 2,
  },
  optBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    width: '100%',
  },
  optBtnActive: {
    backgroundColor: '#134E4A',
    borderWidth: 1,
    borderColor: colors.watchAccent,
  },
  optText: {
    color: colors.watchInk,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.watchAccent,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: '70%',
  },
  primaryText: {
    color: '#042F2E',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    minWidth: '70%',
  },
  secondaryText: {
    color: colors.watchInk,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  nav: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'nowrap',
  },
  navDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDotActive: {
    backgroundColor: colors.accent,
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
});
