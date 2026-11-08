import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TetherProvider, useTether } from './src/context/TetherContext';
import { PhoneApp } from './src/screens/phone/PhoneApp';
import { WatchApp } from './src/screens/watch/WatchApp';
import { colors, space } from './src/theme';

function openWatchWindow() {
  if (typeof window === 'undefined') return;
  const url = `${window.location.origin}${window.location.pathname}?as=watch`;
  window.open(url, 'tether-watch', 'popup,width=460,height=780');
}

function ModeSwitch() {
  const insets = useSafeAreaInsets();
  const { deviceMode, setDeviceMode, connected, sessions } = useTether();
  const modes = [
    { id: 'dual' as const, label: 'Dual' },
    { id: 'phone' as const, label: 'Móvil' },
    { id: 'watch' as const, label: 'Reloj' },
  ];
  const separateWatch =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('as') !== 'watch';

  return (
    <View style={[styles.modeBar, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.modeTitle}>TETHER</Text>
      <Text style={styles.linkText}>
        {connected
          ? sessions > 1
            ? `Enlace activo · ${sessions} sesiones`
            : 'Enlace activo · falta la otra sesión'
          : 'Reconectando con el enlace…'}
      </Text>
      <View style={styles.modeRow}>
        {modes.map((m) => {
          const on = deviceMode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setDeviceMode(m.id)}
              style={[styles.modeChip, on && styles.modeChipOn]}
            >
              <Text style={[styles.modeChipText, on && styles.modeChipTextOn]}>{m.label}</Text>
            </Pressable>
          );
        })}
        {separateWatch ? (
          <Pressable onPress={openWatchWindow} style={styles.modeChip}>
            <Text style={styles.modeChipText}>Abrir reloj</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Root() {
  const { deviceMode } = useTether();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ModeSwitch />

      {deviceMode === 'phone' && (
        <View style={styles.flex}>
          <PhoneApp />
        </View>
      )}

      {deviceMode === 'watch' && (
        <View style={styles.watchOnly}>
          <Text style={styles.hint}>Reloj enlazado · contenido dentro del círculo</Text>
          <WatchApp />
        </View>
      )}

      {deviceMode === 'dual' && (
        <View style={styles.dual}>
          <View style={styles.dualPhone}>
            <PhoneApp />
          </View>
          <View style={styles.dualWatch}>
            <Text style={styles.hint}>Reloj (mismo enlace)</Text>
            <WatchApp compact />
          </View>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TetherProvider>
        <Root />
      </TetherProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  modeBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
    gap: 8,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.accent,
  },
  linkText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  modeChipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeChipText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  modeChipTextOn: {
    color: '#fff',
  },
  watchOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: 12,
  },
  dual: {
    flex: 1,
  },
  dualPhone: {
    flex: 1,
    minHeight: 0,
  },
  dualWatch: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#E8EEF2',
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
