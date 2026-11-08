import * as Location from 'expo-location';

export async function readArrivalLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!position) return null;
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}
