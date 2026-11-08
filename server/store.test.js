const test = require('node:test');
const assert = require('node:assert/strict');
const { initialState, apply, tick } = require('./store');

test('crea una votación y un voto único', () => {
  const created = apply(initialState(), {
    type: 'create_vote',
    question: '¿Salimos?',
    labels: ['Ahora', 'Luego'],
    seconds: 30,
  }, 1_000);

  assert.equal(created.events[0].kind, 'vote_created');
  assert.equal(created.state.vote.question, '¿Salimos?');
  assert.equal(created.state.vote.endsAt, 31_000);

  const voted = apply(created.state, { type: 'cast_vote', optionId: 'opt_0' }, 2_000);
  assert.deepEqual(voted.state.vote.options[0].votes, ['me']);

  const changed = apply(voted.state, { type: 'cast_vote', optionId: 'opt_1' }, 3_000);
  assert.deepEqual(changed.state.vote.options[0].votes, []);
  assert.deepEqual(changed.state.vote.options[1].votes, ['me']);
});

test('el reloj cierra la votación y avisa el encuentro una sola vez', () => {
  const created = apply(initialState(), {
    type: 'create_vote',
    question: 'Q',
    labels: ['A', 'B'],
    seconds: 10,
  }, 1_000);
  const meetup = apply(created.state, {
    type: 'create_meetup',
    title: 'Café',
    place: 'Plaza',
    minutesFromNow: 1,
  }, 1_000);

  const due = tick(meetup.state, 1_000 + 60_000);
  assert.deepEqual(
    due.events.map((event) => event.kind),
    ['vote_closed', 'meetup_due'],
  );
  assert.equal(due.state.vote.closed, true);
  assert.equal(due.state.meetup.dueNotified, true);

  const again = tick(due.state, 1_000 + 61_000);
  assert.equal(again.events.length, 0);
  assert.equal(again.state, due.state);
});

test('la cara del reloj se reordena y se oculta', () => {
  const next = apply(initialState(), {
    type: 'set_watch_layout',
    layout: [
      { id: 'heart', visible: true },
      { id: 'temperature', visible: false },
      { id: 'time', visible: true },
      { id: 'fx', visible: true },
    ],
  });
  assert.deepEqual(
    next.state.watchLayout.map((slot) => `${slot.id}:${slot.visible}`),
    ['heart:true', 'temperature:false', 'time:true', 'fx:true'],
  );

  const pulse = apply(next.state, { type: 'set_heart', bpm: 76 }, 4_000);
  assert.equal(pulse.state.heart.bpm, 76);
  assert.equal(apply(pulse.state, { type: 'set_heart', bpm: 10 }).state.heart.bpm, 76);
});

test('llegué guarda lugar y salí cambia el estado', () => {
  const arrived = apply(initialState(), {
    type: 'check_in',
    checkInType: 'llegue',
    lat: 19.43,
    lon: -99.13,
    place: 'Centro',
  }, 5_000);

  assert.equal(arrived.events[0].kind, 'check_in');
  assert.equal(arrived.state.checkIns[0].place, 'Centro');
  assert.equal(arrived.state.contacts[0].status, 'libre');

  const left = apply(arrived.state, { type: 'check_in', checkInType: 'sali' }, 6_000);
  assert.equal(left.state.checkIns[0].type, 'sali');
  assert.equal(left.state.contacts[0].status, 'en_camino');
});
