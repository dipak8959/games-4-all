/**
 * Words from sportspeople, for the end of a round.
 *
 * Every one is about practice, trying again, and getting better — never
 * about beating anyone, which would sit badly with games that have no score
 * and no winner. Each is short enough to read at a glance on a small phone.
 * These are the attributions the quotes are commonly cited under.
 */
export type Quote = {
  readonly text: string;
  readonly who: string;
  readonly sport: string;
};

export const QUOTES: readonly Quote[] = [
  { text: 'You miss 100% of the shots you don’t take.', who: 'Wayne Gretzky', sport: 'Ice hockey' },
  { text: 'I’ve failed over and over and over again in my life. And that is why I succeed.', who: 'Michael Jordan', sport: 'Basketball' },
  { text: 'Don’t let what you cannot do interfere with what you can do.', who: 'John Wooden', sport: 'Basketball coach' },
  { text: 'Make each day your masterpiece.', who: 'John Wooden', sport: 'Basketball coach' },
  { text: 'Start where you are. Use what you have. Do what you can.', who: 'Arthur Ashe', sport: 'Tennis' },
  { text: 'Champions keep playing until they get it right.', who: 'Billie Jean King', sport: 'Tennis' },
  {
    text: 'I really think a champion is defined not by their wins but by how they can recover when they fall.',
    who: 'Serena Williams',
    sport: 'Tennis',
  },
  { text: 'I’m not the next Usain Bolt or Michael Phelps. I’m the first Simone Biles.', who: 'Simone Biles', sport: 'Gymnastics' },
  { text: 'Age is no barrier. It’s a limitation you put on your mind.', who: 'Jackie Joyner-Kersee', sport: 'Athletics' },
  { text: 'The more I practise, the luckier I get.', who: 'Gary Player', sport: 'Golf' },
  { text: 'Hard work beats talent when talent doesn’t work hard.', who: 'Tim Notke', sport: 'Basketball coach' },
  { text: 'It’s not whether you get knocked down, it’s whether you get up.', who: 'Vince Lombardi', sport: 'American football coach' },
  { text: 'Excellence is the gradual result of always striving to do better.', who: 'Pat Riley', sport: 'Basketball coach' },
  {
    text: 'The difference between the impossible and the possible lies in a person’s determination.',
    who: 'Tommy Lasorda',
    sport: 'Baseball',
  },
  { text: 'There’s no way around hard work. Embrace it.', who: 'Roger Federer', sport: 'Tennis' },
  {
    text: 'Everything negative – pressure, challenges – is all an opportunity for me to rise.',
    who: 'Kobe Bryant',
    sport: 'Basketball',
  },
];

/** Where the next round's quote comes from: somewhere new each time the app
 *  opens, then on round by round, so the same one doesn't come twice running. */
let next = Math.floor(Math.random() * QUOTES.length);

export function nextQuote(): Quote {
  const quote = QUOTES[next % QUOTES.length];
  next += 1;
  return quote;
}
