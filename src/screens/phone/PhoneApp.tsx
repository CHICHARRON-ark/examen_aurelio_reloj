import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTether } from '../../context/TetherContext';
import { colors, space } from '../../theme';
import {
  formatCountdown,
  formatTime,
  pctText,
  statusLabel,
} from '../../utils/format';

const TABS = [
  { id: 'home', label: 'Inicio' },
  { id: 'circle', label: 'Círculo' },
  { id: 'vote', label: 'Voto' },
  { id: 'meetup', label: 'Quedar' },
  { id: 'economy', label: 'Mercado' },
] as const;

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function HomeScreen() {
  const { now, contacts, meId, vote, meetup, economy, setPhoneTab, setWatchPage, setMyStatus } =
    useTether();
  const me = contacts.find((c) => c.id === meId)!;
  const others = contacts.filter((c) => !c.isMe);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.brand}>TETHER</Text>
      <Text style={styles.headline}>Reloj + móvil, sincronizados</Text>

      <Card>
        <Text style={styles.clockBig}>{formatTime(now)}</Text>
        <Text style={styles.muted}>Tu estado: {statusLabel(me.status)}</Text>
        <View style={styles.rowWrap}>
          {(['libre', 'ocupado', 'en_camino'] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, me.status === s && styles.chipOn]}
              onPress={() => setMyStatus(s)}
            >
              <Text style={[styles.chipText, me.status === s && styles.chipTextOn]}>
                {statusLabel(s)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Tu gente ahora</Text>
        {others.map((c) => (
          <View key={c.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {c.name} · {c.zone}
              </Text>
              <Text style={styles.muted}>{statusLabel(c.status)}</Text>
            </View>
            <Text style={styles.rowMeta}>{formatTime(now, c.offsetHours)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Activo</Text>
        <Text style={styles.body}>
          {vote && !vote.closed
            ? `Votación: ${vote.question} · ${formatCountdown(vote.endsAt - now)}`
            : meetup.active
              ? `Encuentro: ${meetup.title} · ${formatCountdown(meetup.meetsAt - now)}`
              : `USD/MXN ${economy.usdMxn.toFixed(2)} (${pctText(economy.usdChangePct)})`}
        </Text>
        <View style={styles.rowWrap}>
          <Pressable
            style={styles.btn}
            onPress={() => {
              setPhoneTab('vote');
              setWatchPage('vote');
            }}
          >
            <Text style={styles.btnText}>Ir a votar</Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={() => {
              setPhoneTab('economy');
              setWatchPage('economy');
            }}
          >
            <Text style={styles.btnGhostText}>Mercado</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

function CircleScreen() {
  const { contacts, checkIns, sendCheckIn, now } = useTether();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>Círculo</Text>
      <Text style={styles.muted}>Presencia y check-ins del día</Text>

      <Card>
        {contacts.map((c) => (
          <View key={c.id} style={styles.listRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.muted}>
                {c.zone} · {formatTime(now, c.offsetHours)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusLabel(c.status)}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Check-in rápido</Text>
        <View style={styles.rowWrap}>
          <Pressable style={styles.btn} onPress={() => sendCheckIn('llegue')}>
            <Text style={styles.btnText}>Llegué</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={() => sendCheckIn('sali')}>
            <Text style={styles.btnGhostText}>Salí</Text>
          </Pressable>
        </View>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          También puedes hacerlo desde el reloj; aparece aquí al instante.
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Últimos avisos</Text>
        {checkIns.length === 0 ? (
          <Text style={styles.muted}>Aún no hay check-ins</Text>
        ) : (
          checkIns.map((e) => (
            <Text key={e.id} style={styles.body}>
              {e.type === 'llegue' ? 'Llegué' : 'Salí'} · {formatTime(e.at)}
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const QUESTION_MAX = 28;
const OPTION_MAX = 12;

function clampText(text: string, max: number) {
  return text.slice(0, max);
}

function VoteScreen() {
  const { vote, createVote, castVote, closeVote, now, meId, contacts } = useTether();
  const [question, setQuestion] = useState('¿Salimos?');
  const [optA, setOptA] = useState('Ahora');
  const [optB, setOptB] = useState('En 20');
  const [optC, setOptC] = useState('Mañana');
  const [useThird, setUseThird] = useState(true);
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    if (!vote) return [];
    return [...vote.options].sort((a, b) => b.votes.length - a.votes.length);
  }, [vote]);

  const canPublish =
    question.trim().length > 0 &&
    optA.trim().length > 0 &&
    optB.trim().length > 0 &&
    (!useThird || optC.trim().length > 0);

  const publish = () => {
    if (!canPublish) {
      setError('Escribe pregunta y al menos 2 opciones.');
      return;
    }
    setError('');
    const options = useThird ? [optA, optB, optC] : [optA, optB];
    createVote(question, options, 120);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Votación rápida</Text>
      <Text style={styles.muted}>Tú escribes la pregunta y opciones · se responde en el reloj</Text>

      <Card>
        <Text style={styles.cardTitle}>Nueva votación</Text>
        <Text style={styles.muted}>Textos cortos para que quepan en el reloj</Text>

        <Text style={styles.fieldLabel}>Pregunta</Text>
        <TextInput
          value={question}
          onChangeText={(t) => setQuestion(clampText(t, QUESTION_MAX))}
          style={styles.input}
          placeholder="Ej. ¿Salimos?"
          placeholderTextColor={colors.muted}
          maxLength={QUESTION_MAX}
        />
        <Text style={styles.counter}>
          {question.length}/{QUESTION_MAX}
        </Text>

        <Text style={styles.fieldLabel}>Opción 1</Text>
        <TextInput
          value={optA}
          onChangeText={(t) => setOptA(clampText(t, OPTION_MAX))}
          style={styles.input}
          placeholder="Ej. Ahora"
          placeholderTextColor={colors.muted}
          maxLength={OPTION_MAX}
        />
        <Text style={styles.counter}>
          {optA.length}/{OPTION_MAX}
        </Text>

        <Text style={styles.fieldLabel}>Opción 2</Text>
        <TextInput
          value={optB}
          onChangeText={(t) => setOptB(clampText(t, OPTION_MAX))}
          style={styles.input}
          placeholder="Ej. En 20"
          placeholderTextColor={colors.muted}
          maxLength={OPTION_MAX}
        />
        <Text style={styles.counter}>
          {optB.length}/{OPTION_MAX}
        </Text>

        <Pressable
          style={[styles.chip, useThird && styles.chipOn, { alignSelf: 'flex-start' }]}
          onPress={() => setUseThird((v) => !v)}
        >
          <Text style={[styles.chipText, useThird && styles.chipTextOn]}>
            {useThird ? '3 opciones' : 'Solo 2 opciones'}
          </Text>
        </Pressable>

        {useThird ? (
          <>
            <Text style={styles.fieldLabel}>Opción 3</Text>
            <TextInput
              value={optC}
              onChangeText={(t) => setOptC(clampText(t, OPTION_MAX))}
              style={styles.input}
              placeholder="Ej. Mañana"
              placeholderTextColor={colors.muted}
              maxLength={OPTION_MAX}
            />
            <Text style={styles.counter}>
              {optC.length}/{OPTION_MAX}
            </Text>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, !canPublish && styles.btnDisabled]}
          onPress={publish}
          disabled={!canPublish}
        >
          <Text style={styles.btnText}>Publicar (2 min) → reloj</Text>
        </Pressable>
      </Card>

      {vote ? (
        <Card>
          <Text style={styles.cardTitle}>{vote.question}</Text>
          <Text style={styles.muted}>
            {vote.closed ? 'Cerrada' : `Cierra en ${formatCountdown(vote.endsAt - now)}`}
          </Text>
          {vote.options.map((opt) => {
            const names = opt.votes
              .map((id) => contacts.find((c) => c.id === id)?.name ?? id)
              .join(', ');
            const mine = opt.votes.includes(meId);
            return (
              <Pressable
                key={opt.id}
                style={[styles.voteRow, mine && styles.voteRowOn]}
                onPress={() => !vote.closed && castVote(opt.id)}
              >
                <Text style={styles.rowTitle}>
                  {opt.label} · {opt.votes.length}
                </Text>
                <Text style={styles.muted}>{names || 'Sin votos'}</Text>
              </Pressable>
            );
          })}
          {!vote.closed ? (
            <Pressable style={styles.btnGhost} onPress={closeVote}>
              <Text style={styles.btnGhostText}>Cerrar ahora</Text>
            </Pressable>
          ) : (
            <Text style={[styles.body, { marginTop: 8 }]}>
              Ganó: {totals[0]?.label ?? '—'}
            </Text>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const MEETUP_TITLE_MAX = 20;
const MEETUP_PLACE_MAX = 16;

function MeetupScreen() {
  const { meetup, now, createMeetup, setMeetupResponse, cancelMeetup } = useTether();
  const [title, setTitle] = useState('Café');
  const [place, setPlace] = useState('Plaza');
  const [minutes, setMinutes] = useState(15);

  const remaining = meetup.meetsAt - now;
  const isDue = meetup.active && remaining <= 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Encuentro</Text>
      <Text style={styles.muted}>Creas el plan aquí · countdown y respuestas en el reloj</Text>

      {!meetup.active ? (
        <Card>
          <Text style={styles.cardTitle}>Nuevo encuentro</Text>

          <Text style={styles.fieldLabel}>Qué</Text>
          <TextInput
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, MEETUP_TITLE_MAX))}
            style={styles.input}
            placeholder="Café / Cena / Estudiar"
            placeholderTextColor={colors.muted}
            maxLength={MEETUP_TITLE_MAX}
          />
          <Text style={styles.counter}>
            {title.length}/{MEETUP_TITLE_MAX}
          </Text>

          <Text style={styles.fieldLabel}>Dónde</Text>
          <TextInput
            value={place}
            onChangeText={(t) => setPlace(t.slice(0, MEETUP_PLACE_MAX))}
            style={styles.input}
            placeholder="Plaza / Metro"
            placeholderTextColor={colors.muted}
            maxLength={MEETUP_PLACE_MAX}
          />
          <Text style={styles.counter}>
            {place.length}/{MEETUP_PLACE_MAX}
          </Text>

          <Text style={styles.fieldLabel}>En cuánto</Text>
          <View style={styles.rowWrap}>
            {[1, 5, 15, 30].map((m) => (
              <Pressable
                key={m}
                style={[styles.chip, minutes === m && styles.chipOn]}
                onPress={() => setMinutes(m)}
              >
                <Text style={[styles.chipText, minutes === m && styles.chipTextOn]}>
                  {m === 1 ? '1 min demo' : `${m} min`}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.btn}
            onPress={() => createMeetup(title, place, minutes)}
          >
            <Text style={styles.btnText}>Crear → reloj</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>{meetup.title}</Text>
          <Text style={styles.muted}>{meetup.place}</Text>
          <Text style={styles.clockBig}>
            {isDue ? '¡Ahora!' : formatCountdown(remaining)}
          </Text>
          <Text style={styles.body}>
            Tu respuesta:{' '}
            {meetup.myStatus === 'pending'
              ? 'Sin responder'
              : meetup.myStatus === 'voy'
                ? 'Voy'
                : meetup.myStatus === 'llegue'
                  ? 'Llegué'
                  : 'Tardo'}
          </Text>

          <View style={styles.rowWrap}>
            <Pressable style={styles.btn} onPress={() => setMeetupResponse('voy')}>
              <Text style={styles.btnText}>Voy</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => setMeetupResponse('llegue')}>
              <Text style={styles.btnGhostText}>Llegué</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => setMeetupResponse('tardo')}>
              <Text style={styles.btnGhostText}>Tardo</Text>
            </Pressable>
          </View>

          <Pressable style={styles.btnGhost} onPress={cancelMeetup}>
            <Text style={styles.btnGhostText}>Cancelar encuentro</Text>
          </Pressable>
        </Card>
      )}
    </ScrollView>
  );
}

function EconomyScreen() {
  const { economy, setWatchPage } = useTether();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>Mercado</Text>
      <Text style={styles.muted}>Capa económica secundaria · glance en el reloj</Text>

      <Card>
        <Text style={styles.cardTitle}>USD / MXN</Text>
        <Text style={styles.clockBig}>{economy.usdMxn.toFixed(2)}</Text>
        <Text
          style={{
            color: economy.usdChangePct >= 0 ? colors.ok : colors.danger,
            fontWeight: '700',
          }}
        >
          {pctText(economy.usdChangePct)}
        </Text>
      </Card>

      <Card>
        <View style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>S&P 500</Text>
            <Text style={styles.muted}>{economy.spx.toFixed(1)}</Text>
          </View>
          <Text
            style={{
              color: economy.spxChangePct >= 0 ? colors.ok : colors.danger,
              fontWeight: '700',
            }}
          >
            {pctText(economy.spxChangePct)}
          </Text>
        </View>
        <View style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>IPC México</Text>
            <Text style={styles.muted}>{economy.ipc.toLocaleString('es-MX')}</Text>
          </View>
          <Text
            style={{
              color: economy.ipcChangePct >= 0 ? colors.ok : colors.danger,
              fontWeight: '700',
            }}
          >
            {pctText(economy.ipcChangePct)}
          </Text>
        </View>
      </Card>

      <Pressable style={styles.btn} onPress={() => setWatchPage('economy')}>
        <Text style={styles.btnText}>Mostrar glance en reloj</Text>
      </Pressable>
    </ScrollView>
  );
}

export function PhoneApp() {
  const insets = useSafeAreaInsets();
  const { phoneTab, setPhoneTab } = useTether();

  let body = <HomeScreen />;
  if (phoneTab === 'circle') body = <CircleScreen />;
  if (phoneTab === 'vote') body = <VoteScreen />;
  if (phoneTab === 'meetup') body = <MeetupScreen />;
  if (phoneTab === 'economy') body = <EconomyScreen />;

  return (
    <View style={styles.phoneRoot}>
      <View style={styles.phoneBody}>{body}</View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((tab) => {
          const on = phoneTab === tab.id;
          return (
            <Pressable key={tab.id} style={styles.tabItem} onPress={() => setPhoneTab(tab.id)}>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  phoneBody: {
    flex: 1,
  },
  scroll: {
    padding: space.lg,
    paddingBottom: 28,
    gap: space.md,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.accent,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  clockBig: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.ink,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  body: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  chipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
  },
  chipTextOn: {
    color: colors.accent,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 8,
  },
  rowTitle: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 14,
  },
  rowMeta: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  counter: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: -4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  btnGhostText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  voteRow: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    backgroundColor: colors.bg,
  },
  voteRowOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  tabLabelOn: {
    color: colors.accent,
    fontWeight: '800',
  },
});
