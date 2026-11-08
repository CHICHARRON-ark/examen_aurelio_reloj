export function formatTime(ts: number, offsetHours = 0) {
  const d = new Date(ts + offsetHours * 60 * 60 * 1000);
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function statusLabel(status: string) {
  switch (status) {
    case 'libre':
      return 'Libre';
    case 'ocupado':
      return 'Ocupado';
    case 'en_camino':
      return 'En camino';
    default:
      return status;
  }
}

export function pctText(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
