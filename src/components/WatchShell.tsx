import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

type Props = {
  children: React.ReactNode;
  /** For dual mode, keep watch smaller */
  compact?: boolean;
};

/**
 * Contenedor tipo reloj. Todo el contenido vive DENTRO del círculo
 * con padding interno para que nada se corte en bordes redondos.
 */
export function WatchShell({ children, compact = false }: Props) {
  const { width, height } = useWindowDimensions();
  const maxByWidth = Math.min(width - 24, compact ? 220 : 280);
  const maxByHeight = compact ? Math.min(height * 0.42, 220) : Math.min(height - 140, 320);
  const size = Math.max(180, Math.min(maxByWidth, maxByHeight));
  const inset = Math.round(size * 0.14);

  return (
    <View style={styles.wrap}>
      <View style={[styles.bezel, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            styles.face,
            {
              width: size - 10,
              height: size - 10,
              borderRadius: (size - 10) / 2,
              paddingHorizontal: inset,
              paddingVertical: inset,
            },
          ]}
        >
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bezel: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  face: {
    backgroundColor: colors.watchBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
