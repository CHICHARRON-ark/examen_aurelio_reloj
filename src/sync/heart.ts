type HeartDevice = {
  gatt?: {
    connect: () => Promise<HeartServer>;
    disconnect: () => void;
  };
};

type HeartServer = {
  getPrimaryService: (name: string) => Promise<{
    getCharacteristic: (name: string) => Promise<HeartCharacteristic>;
  }>;
};

type HeartCharacteristic = {
  startNotifications: () => Promise<void>;
  addEventListener: (name: string, listener: (event: Event) => void) => void;
  removeEventListener: (name: string, listener: (event: Event) => void) => void;
  value?: DataView | null;
};

type HeartNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { filters: Array<{ services: string[] }> }) => Promise<HeartDevice>;
  };
};

export function heartSensorAvailable() {
  return typeof navigator !== 'undefined' && Boolean((navigator as HeartNavigator).bluetooth);
}

function beatsPerMinute(view: DataView) {
  const flags = view.getUint8(0);
  return flags & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
}

export async function listenHeartRate(onBeat: (bpm: number) => void) {
  const bluetooth = (navigator as HeartNavigator).bluetooth;
  if (!bluetooth) throw new Error('Sin Bluetooth');

  const device = await bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
  if (!device.gatt) throw new Error('El pulsómetro no abrió el canal');

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');

  const onChange = (event: Event) => {
    const view = (event.target as HeartCharacteristic | null)?.value;
    if (!view) return;
    const bpm = beatsPerMinute(view);
    if (bpm >= 20 && bpm <= 240) onBeat(bpm);
  };

  await characteristic.startNotifications();
  characteristic.addEventListener('characteristicvaluechanged', onChange);

  return () => {
    characteristic.removeEventListener('characteristicvaluechanged', onChange);
    device.gatt?.disconnect();
  };
}
