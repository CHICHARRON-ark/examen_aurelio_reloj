import type { TetherEvent } from '../types';
import { buzz } from './alerts';

type DeviceMode = 'phone' | 'watch' | 'dual';
type PhoneTab = 'home' | 'circle' | 'vote' | 'meetup' | 'economy';
type WatchPage = 'home' | 'vote' | 'meetup' | 'checkin' | 'economy';

export function reactToEvent(
  event: TetherEvent,
  deviceMode: DeviceMode,
  setPhoneTab: (tab: PhoneTab) => void,
  setWatchPage: (page: WatchPage) => void,
) {
  switch (event.kind) {
    case 'vote_created':
    case 'vote_closed':
      setPhoneTab('vote');
      setWatchPage('vote');
      break;
    case 'meetup_created':
    case 'meetup_due':
    case 'meetup_response':
      setPhoneTab('meetup');
      setWatchPage('meetup');
      break;
    case 'check_in':
      setPhoneTab('circle');
      setWatchPage('checkin');
      break;
  }

  if (deviceMode === 'phone') return;

  const kind =
    event.kind === 'meetup_due' || event.kind === 'vote_closed'
      ? 'due'
      : event.kind === 'check_in'
        ? 'checkin'
        : 'vote';
  void buzz(kind);
}
