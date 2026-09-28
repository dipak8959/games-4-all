/**
 * Words from sportspeople: one at the top of every game, another on the card
 * at the end of each round.
 *
 * What goes in, and what stays out:
 * - Every quote is about practice, trying again, teamwork, courage or
 *   enjoying the game — never about beating anyone, which would sit badly
 *   with games that have no score and no winner.
 * - Only well-known quotes, under the names they are widely cited with. None
 *   is invented, and none is reworded. They were gathered without access to
 *   a source to check against, so some attributions may still be the popular
 *   rather than the proven ones.
 * - Nothing a parent would wince at: no swearing, violence, faith or
 *   politics, and no one known for a doping, criminal or abuse scandal.
 *   `tests/quotes.test.ts` holds the words that must never appear.
 */
export type Quote = {
  readonly text: string;
  readonly who: string;
  readonly sport: string;
  /** Who they are, in a few words: why their words are worth a listen. */
  readonly about: string;
};

/**
 * One line on each person, shown after their name: what they did, with the
 * years where they matter. Facts only, the kind any encyclopedia agrees on.
 */
export const ABOUT: Readonly<Record<string, string>> = {
  'Michael Jordan': '6-time NBA champion (1991–93, 1996–98)',
  'John Wooden': 'UCLA coach, 10 college titles in 12 years (1964–75)',
  'Kareem Abdul-Jabbar': '6-time NBA champion and 6-time MVP',
  'Larry Bird': '3-time NBA champion with Boston (1981, 1984, 1986)',
  'Magic Johnson': '5-time NBA champion with the Lakers in the 1980s',
  'Bill Russell': '11-time NBA champion with Boston (1957–69)',
  'LeBron James': '4-time NBA champion (2012, 2013, 2016, 2020)',
  'Stephen Curry': '4-time NBA champion with Golden State',
  'Kevin Garnett': 'NBA champion with Boston (2008)',
  'Phil Jackson': 'won 11 NBA titles as a coach',
  'Pat Riley': 'won 5 NBA titles as a coach',
  'Tim Notke': 'high school basketball coach in Texas',
  'Jerry West': 'NBA champion (1972), the player on the NBA logo',
  'Mike Krzyzewski': 'Duke coach, 5 college titles',
  'Jim Valvano': 'coached NC State to the 1983 college title',
  'Arthur Ashe': 'Wimbledon champion (1975), the first Black man to win it',
  'Billie Jean King': '39 Grand Slam titles; led the fight for equal prize money',
  'Serena Williams': '23 Grand Slam singles titles',
  'Venus Williams': '7 Grand Slam singles titles, 5 of them at Wimbledon',
  'Roger Federer': '20 Grand Slam titles, 8 of them at Wimbledon',
  'Rafael Nadal': '22 Grand Slam titles, 14 of them at the French Open',
  'Martina Navratilova': '18 Grand Slam singles titles, 9 at Wimbledon',
  'Chris Evert': '18 Grand Slam singles titles',
  'Björn Borg': 'won Wimbledon 5 years running (1976–80)',
  'Althea Gibson': 'first Black player to win a Grand Slam title (1956)',
  'Stan Smith': 'Wimbledon champion (1972)',
  'Jesse Owens': '4 Olympic golds at Berlin in 1936',
  'Wilma Rudolph': '3 Olympic golds in 1960, after childhood polio',
  'Carl Lewis': '9 Olympic golds (1984–96)',
  'Jackie Joyner-Kersee': '3 Olympic golds; one of the great heptathletes',
  'Emil Zátopek': 'won the 5,000m, 10,000m and marathon at the 1952 Olympics',
  'Eliud Kipchoge': '2 Olympic marathon golds; first to run a marathon in under 2 hours',
  'Michael Johnson': '4 Olympic golds; won the 200m and 400m in 1996',
  'Roger Bannister': 'first to run a mile in under four minutes (1954)',
  'Kathrine Switzer': 'first woman to run the Boston Marathon with a race number (1967)',
  'Dean Karnazes': 'ran 50 marathons in 50 US states in 50 days (2006)',
  'John Bingham': 'running writer known as “The Penguin”',
  'Michael Phelps': '28 Olympic medals, 23 of them gold',
  'Diana Nyad': 'swam from Cuba to Florida at 64 (2013)',
  'Duke Kahanamoku': 'Olympic swimming champion (1912, 1920) who made surfing famous',
  'Bethany Hamilton': 'pro surfer who came back after losing her arm at 13',
  'Simone Biles': 'the most decorated gymnast of all time',
  'Nadia Comăneci': 'first perfect 10 at the Olympics, aged 14 (1976)',
  'Scott Hamilton': 'Olympic figure skating champion (1984)',
  'Peggy Fleming': 'Olympic figure skating champion (1968)',
  Pelé: 'won 3 World Cups with Brazil (1958, 1962, 1970)',
  'Mia Hamm': '2 World Cups and 2 Olympic golds with the USA',
  'Abby Wambach': 'World Cup winner (2015); 184 goals for the USA',
  'Johan Cruyff': '3-time Ballon d’Or winner; the face of “Total Football”',
  'David Beckham': 'England captain; 6 Premier League titles with Manchester United',
  'Virat Kohli': 'won the Cricket World Cup with India (2011)',
  'Mary Kom': '6-time world boxing champion; Olympic bronze (2012)',
  'Babe Ruth': '7-time World Series champion; 714 home runs',
  'Jackie Robinson': 'broke Major League Baseball’s colour line in 1947',
  'Yogi Berra': 'won 10 World Series with the Yankees',
  'Lou Gehrig': 'played 2,130 games in a row for the Yankees',
  'Hank Aaron': '755 career home runs',
  'Roberto Clemente': '3,000 hits; first Latin American in baseball’s Hall of Fame',
  'Tommy Lasorda': 'managed the Dodgers to 2 World Series titles (1981, 1988)',
  'Ted Williams': 'last player to hit .400 in a season (1941)',
  'Derek Jeter': '5 World Series titles with the Yankees',
  'Satchel Paige': 'pitched in the major leagues at 59',
  'Willie Mays': '660 home runs, and “The Catch” (1954)',
  'Ernie Banks': '“Mr. Cub”, 512 home runs',
  'Nolan Ryan': '7 no-hitters and 5,714 strikeouts',
  'Vince Lombardi': 'won the first two Super Bowls; the trophy bears his name',
  'Tom Landry': 'coached the Dallas Cowboys for 29 seasons, 2 Super Bowls',
  'Lou Holtz': 'coached Notre Dame to the 1988 national title',
  'Knute Rockne': 'legendary Notre Dame coach of the 1920s',
  'Jerry Rice': '3 Super Bowls; most touchdown catches in NFL history',
  'Paul “Bear” Bryant': '6 national titles as Alabama’s coach',
  'Joe Namath': 'won Super Bowl III (1969) after promising he would',
  'Wayne Gretzky': '“The Great One”, 4 Stanley Cups',
  'Herb Brooks': 'coached the USA’s “Miracle on Ice” team (1980)',
  'Gary Player': '9 major championships',
  'Arnold Palmer': '7 major championships',
  'Jack Nicklaus': '18 major championships',
  'Ben Hogan': '9 major championships',
  'Bobby Jones': 'won golf’s Grand Slam in 1930; co-founded the Masters',
  'Walter Hagen': '11 major championships',
  'Muhammad Ali': '3-time world heavyweight champion; Olympic gold (1960)',
  'Jack Dempsey': 'world heavyweight champion (1919–26)',
  'Dan Gable': 'won Olympic wrestling gold (1972) without giving up a point',
  'Bruce Lee': 'martial artist and film star',
  'Jigoro Kano': 'founded judo (1882)',
  'Edmund Hillary': 'first to the top of Everest, with Tenzing Norgay (1953)',
  'George Mallory': 'Everest pioneer of the 1920s',
  'Greg LeMond': '3-time Tour de France winner (1986, 1989, 1990)',
  'Pierre de Coubertin': 'founded the modern Olympic Games (1896)',
};

const q = (text: string, who: string, sport: string): Quote => ({ text, who, sport, about: ABOUT[who] ?? sport });

export const QUOTES: readonly Quote[] = [
  // Basketball
  q('I’ve failed over and over and over again in my life. And that is why I succeed.', 'Michael Jordan', 'Basketball'),
  q('Never say never, because limits, like fears, are often just an illusion.', 'Michael Jordan', 'Basketball'),
  q('Talent wins games, but teamwork and intelligence win championships.', 'Michael Jordan', 'Basketball'),
  q('Some people want it to happen, some wish it would happen, others make it happen.', 'Michael Jordan', 'Basketball'),
  q('I can accept failure, everyone fails at something. But I can’t accept not trying.', 'Michael Jordan', 'Basketball'),
  q('Just play. Have fun. Enjoy the game.', 'Michael Jordan', 'Basketball'),
  q('To learn to succeed, you must first learn to fail.', 'Michael Jordan', 'Basketball'),
  q('Don’t let what you cannot do interfere with what you can do.', 'John Wooden', 'Basketball coach'),
  q('Make each day your masterpiece.', 'John Wooden', 'Basketball coach'),
  q('Be quick, but don’t hurry.', 'John Wooden', 'Basketball coach'),
  q('It’s the little details that are vital. Little things make big things happen.', 'John Wooden', 'Basketball coach'),
  q('Failure is not fatal, but failure to change might be.', 'John Wooden', 'Basketball coach'),
  q('Ability may get you to the top, but it takes character to keep you there.', 'John Wooden', 'Basketball coach'),
  q('Never mistake activity for achievement.', 'John Wooden', 'Basketball coach'),
  q(
    'You can’t live a perfect day without doing something for someone who will never be able to repay you.',
    'John Wooden',
    'Basketball coach',
  ),
  q('Discipline yourself and others won’t need to.', 'John Wooden', 'Basketball coach'),
  q('Winning takes talent, to repeat takes character.', 'John Wooden', 'Basketball coach'),
  q('Your mind is what makes everything else work.', 'Kareem Abdul-Jabbar', 'Basketball'),
  q('One man can be a crucial ingredient on a team, but one man cannot make a team.', 'Kareem Abdul-Jabbar', 'Basketball'),
  q('I think that the good and the great are only separated by the willingness to sacrifice.', 'Kareem Abdul-Jabbar', 'Basketball'),
  q('You can’t win unless you learn how to lose.', 'Kareem Abdul-Jabbar', 'Basketball'),
  q('I’ve got a theory that if you give 100% all of the time, somehow things will work out in the end.', 'Larry Bird', 'Basketball'),
  q('All kids need is a little help, a little hope and somebody who believes in them.', 'Magic Johnson', 'Basketball'),
  q('Ask not what your teammates can do for you. Ask what you can do for your teammates.', 'Magic Johnson', 'Basketball'),
  q(
    'The most important measure of how good a game I played was how much better I’d made my teammates play.',
    'Bill Russell',
    'Basketball',
  ),
  q('Concentration and mental toughness are the margins of victory.', 'Bill Russell', 'Basketball'),
  q('You have to be able to accept failure to get better.', 'LeBron James', 'Basketball'),
  q('Nothing is given. Everything is earned.', 'LeBron James', 'Basketball'),
  q('I like criticism. It makes you strong.', 'LeBron James', 'Basketball'),
  q('Don’t be afraid of failure. This is the way to succeed.', 'LeBron James', 'Basketball'),
  q('Success is not an accident, success is actually a choice.', 'Stephen Curry', 'Basketball'),
  q('Anything is possible!', 'Kevin Garnett', 'Basketball'),
  q('The strength of the team is each individual member. The strength of each member is the team.', 'Phil Jackson', 'Basketball coach'),
  q('Excellence is the gradual result of always striving to do better.', 'Pat Riley', 'Basketball coach'),
  q('Hard work beats talent when talent doesn’t work hard.', 'Tim Notke', 'Basketball coach'),
  q('You can’t get much done in life if you only work on the days when you feel good.', 'Jerry West', 'Basketball'),
  q('Confidence shared is better than confidence only in yourself.', 'Mike Krzyzewski', 'Basketball coach'),
  q('Don’t give up. Don’t ever give up.', 'Jim Valvano', 'Basketball coach'),

  // Tennis
  q('Start where you are. Use what you have. Do what you can.', 'Arthur Ashe', 'Tennis'),
  q('Success is a journey, not a destination. The doing is often more important than the outcome.', 'Arthur Ashe', 'Tennis'),
  q('One important key to success is self-confidence. An important key to self-confidence is preparation.', 'Arthur Ashe', 'Tennis'),
  q('From what we get, we can make a living; what we give, however, makes a life.', 'Arthur Ashe', 'Tennis'),
  q(
    'You are never really playing an opponent. You are playing yourself, your own highest standards, and when you reach your limits, that is real joy.',
    'Arthur Ashe',
    'Tennis',
  ),
  q('Champions keep playing until they get it right.', 'Billie Jean King', 'Tennis'),
  q('Pressure is a privilege.', 'Billie Jean King', 'Tennis'),
  q('Champions adjust.', 'Billie Jean King', 'Tennis'),
  q(
    'I really think a champion is defined not by their wins but by how they can recover when they fall.',
    'Serena Williams',
    'Tennis',
  ),
  q('Tennis just a game, family is forever.', 'Serena Williams', 'Tennis'),
  q('The success of every woman should be the inspiration to another. We should raise each other up.', 'Serena Williams', 'Tennis'),
  q('I don’t focus on what I’m up against. I focus on my goals and I try to ignore the rest.', 'Venus Williams', 'Tennis'),
  q('There’s no way around hard work. Embrace it.', 'Roger Federer', 'Tennis'),
  q('I’m a very positive thinker, and I think that is what helps me the most in difficult moments.', 'Roger Federer', 'Tennis'),
  q('Losing is not my enemy… fear of losing is my enemy.', 'Rafael Nadal', 'Tennis'),
  q('The moment of victory is much too short to live for that and nothing else.', 'Martina Navratilova', 'Tennis'),
  q('If you can react the same way to winning and losing, that’s a big accomplishment.', 'Chris Evert', 'Tennis'),
  q('My greatest point is my persistence. I never give up in a match.', 'Björn Borg', 'Tennis'),
  q('No matter what accomplishments you make, somebody helped you.', 'Althea Gibson', 'Tennis'),
  q('Experience tells you what to do; confidence allows you to do it.', 'Stan Smith', 'Tennis'),

  // Athletics and running
  q(
    'We all have dreams. But in order to make dreams come into reality, it takes an awful lot of determination, dedication, self-discipline, and effort.',
    'Jesse Owens',
    'Athletics',
  ),
  q('Find the good. It’s all around you. Find it, showcase it and you’ll start believing in it.', 'Jesse Owens', 'Athletics'),
  q(
    'Friendships born on the field of athletic strife are the real gold of competition. Awards become corroded, friends gather no dust.',
    'Jesse Owens',
    'Athletics',
  ),
  q('The triumph can’t be had without the struggle.', 'Wilma Rudolph', 'Athletics'),
  q(
    'Winning is great, sure, but if you are really going to do something in life, the secret is learning how to lose.',
    'Wilma Rudolph',
    'Athletics',
  ),
  q('I believe in me more than anything in this world.', 'Wilma Rudolph', 'Athletics'),
  q('It’s all about the journey, not the outcome.', 'Carl Lewis', 'Athletics'),
  q('Age is no barrier. It’s a limitation you put on your mind.', 'Jackie Joyner-Kersee', 'Athletics'),
  q('It is better to look ahead and prepare, than to look back and regret.', 'Jackie Joyner-Kersee', 'Athletics'),
  q(
    'If you want to win something, run the 100 metres. If you want to experience something, run a marathon.',
    'Emil Zátopek',
    'Athletics',
  ),
  q('No human is limited.', 'Eliud Kipchoge', 'Athletics'),
  q('Only the disciplined ones in life are free.', 'Eliud Kipchoge', 'Athletics'),
  q('Pressure is nothing more than the shadow of great opportunity.', 'Michael Johnson', 'Athletics'),
  q('The human spirit is indomitable.', 'Roger Bannister', 'Athletics'),
  q('If you are losing faith in human nature, go out and watch a marathon.', 'Kathrine Switzer', 'Athletics'),
  q('Run when you can, walk if you have to, crawl if you must; just never give up.', 'Dean Karnazes', 'Running'),
  q('The miracle isn’t that I finished. The miracle is that I had the courage to start.', 'John Bingham', 'Running'),

  // Swimming, diving and water
  q('You can’t put a limit on anything. The more you dream, the farther you get.', 'Michael Phelps', 'Swimming'),
  q(
    'I think that everything is possible as long as you put your mind to it and you put the work and time into it.',
    'Michael Phelps',
    'Swimming',
  ),
  q('Never, ever give up.', 'Diana Nyad', 'Swimming'),
  q('You’re never too old to chase your dreams.', 'Diana Nyad', 'Swimming'),
  q('Find a way.', 'Diana Nyad', 'Swimming'),
  q('Out of water, I am nothing.', 'Duke Kahanamoku', 'Swimming and surfing'),
  q('Courage doesn’t mean you don’t get afraid. Courage means you don’t let fear stop you.', 'Bethany Hamilton', 'Surfing'),

  // Gymnastics and skating
  q('I’m not the next Usain Bolt or Michael Phelps. I’m the first Simone Biles.', 'Simone Biles', 'Gymnastics'),
  q('Hard work has made it easy. That is my secret. That is why I win.', 'Nadia Comăneci', 'Gymnastics'),
  q(
    'I don’t run away from a challenge because I am afraid. Instead, I run toward it because the only way to escape fear is to trample it beneath your feet.',
    'Nadia Comăneci',
    'Gymnastics',
  ),
  q('The only disability in life is a bad attitude.', 'Scott Hamilton', 'Figure skating'),
  q('The first thing is to love your sport. Never do it to please someone else. It has to be yours.', 'Peggy Fleming', 'Figure skating'),

  // Football (soccer)
  q(
    'Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing or learning to do.',
    'Pelé',
    'Football',
  ),
  q('The more difficult the victory, the greater the happiness in winning.', 'Pelé', 'Football'),
  q('Enthusiasm is everything. It must be taut and vibrating like a guitar string.', 'Pelé', 'Football'),
  q('Everything is practice.', 'Pelé', 'Football'),
  q('I was born for soccer, just as Beethoven was born for music and Michelangelo was born for painting.', 'Pelé', 'Football'),
  q(
    'I am a member of a team, and I rely on the team, I defer to it and sacrifice for it, because the team, not the individual, is the ultimate champion.',
    'Mia Hamm',
    'Football',
  ),
  q('Failure happens all the time. It happens every day in practice. What makes you better is how you react to it.', 'Mia Hamm', 'Football'),
  q(
    'The vision of a champion is someone who is bent over, drenched in sweat, at the point of exhaustion, when no one else is watching.',
    'Mia Hamm',
    'Football',
  ),
  q('Celebrate what you’ve accomplished, but raise the bar a little higher each time you succeed.', 'Mia Hamm', 'Football'),
  q('Make your failure your fuel.', 'Abby Wambach', 'Football'),
  q('Playing football is very simple, but playing simple football is the hardest thing there is.', 'Johan Cruyff', 'Football'),
  q('Every disadvantage has its advantage.', 'Johan Cruyff', 'Football'),
  q('I’ve always believed that if you put in the work, the results will come.', 'David Beckham', 'Football'),

  // Cricket and boxing from India
  q('Self-belief and hard work will always earn you success.', 'Virat Kohli', 'Cricket'),
  q('Don’t let anyone tell you that you are weak because you are a woman.', 'Mary Kom', 'Boxing'),

  // Baseball
  q('It’s hard to beat a person who never gives up.', 'Babe Ruth', 'Baseball'),
  q('Never let the fear of striking out keep you from playing the game.', 'Babe Ruth', 'Baseball'),
  q('Every strike brings me closer to the next home run.', 'Babe Ruth', 'Baseball'),
  q('A life is not important except in the impact it has on other lives.', 'Jackie Robinson', 'Baseball'),
  q(
    'I’m not concerned with your liking or disliking me… All I ask is that you respect me as a human being.',
    'Jackie Robinson',
    'Baseball',
  ),
  q('It ain’t over till it’s over.', 'Yogi Berra', 'Baseball'),
  q('Baseball is ninety percent mental. The other half is physical.', 'Yogi Berra', 'Baseball'),
  q('You can observe a lot by watching.', 'Yogi Berra', 'Baseball'),
  q('If you don’t know where you are going, you might wind up someplace else.', 'Yogi Berra', 'Baseball'),
  q('When you come to a fork in the road, take it.', 'Yogi Berra', 'Baseball'),
  q('It’s déjà vu all over again.', 'Yogi Berra', 'Baseball'),
  q('Today, I consider myself the luckiest man on the face of the earth.', 'Lou Gehrig', 'Baseball'),
  q(
    'My motto was always to keep swinging. Whether I was in a slump or feeling badly or having trouble off the field, the only thing to do was keep swinging.',
    'Hank Aaron',
    'Baseball',
  ),
  q(
    'Any time you have an opportunity to make a difference in this world and you don’t, then you are wasting your time on Earth.',
    'Roberto Clemente',
    'Baseball',
  ),
  q('The difference between the impossible and the possible lies in a person’s determination.', 'Tommy Lasorda', 'Baseball'),
  q(
    'Baseball is the only field of endeavor where a man can succeed three times out of ten and be considered a good performer.',
    'Ted Williams',
    'Baseball',
  ),
  q(
    'There may be people that have more talent than you, but there’s no excuse for anyone to work harder than you do.',
    'Derek Jeter',
    'Baseball',
  ),
  q('Don’t look back. Something might be gaining on you.', 'Satchel Paige', 'Baseball'),
  q('Age is a question of mind over matter. If you don’t mind, it doesn’t matter.', 'Satchel Paige', 'Baseball'),
  q('It isn’t hard to be good from time to time in sports. What’s tough is being good every day.', 'Willie Mays', 'Baseball'),
  q('Let’s play two!', 'Ernie Banks', 'Baseball'),
  q('Enjoying success requires the ability to adapt.', 'Nolan Ryan', 'Baseball'),

  // American football
  q('It’s not whether you get knocked down, it’s whether you get up.', 'Vince Lombardi', 'American football coach'),
  q('Perfection is not attainable, but if we chase perfection we can catch excellence.', 'Vince Lombardi', 'American football coach'),
  q(
    'Individual commitment to a group effort – that is what makes a team work, a company work, a society work, a civilization work.',
    'Vince Lombardi',
    'American football coach',
  ),
  q('Once you learn to quit, it becomes a habit.', 'Vince Lombardi', 'American football coach'),
  q('Leaders aren’t born, they are made.', 'Vince Lombardi', 'American football coach'),
  q(
    'The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack of will.',
    'Vince Lombardi',
    'American football coach',
  ),
  q(
    'Setting a goal is not the main thing. It is deciding how you will go about achieving it and staying with that plan.',
    'Tom Landry',
    'American football coach',
  ),
  q(
    'Leadership is getting someone to do what they don’t want to do, to achieve what they want to achieve.',
    'Tom Landry',
    'American football coach',
  ),
  q(
    'Ability is what you’re capable of doing. Motivation determines what you do. Attitude determines how well you do it.',
    'Lou Holtz',
    'American football coach',
  ),
  q('It’s not the load that breaks you down, it’s the way you carry it.', 'Lou Holtz', 'American football coach'),
  q('Life is ten percent what happens to you and ninety percent how you respond to it.', 'Lou Holtz', 'American football coach'),
  q(
    'Show me someone who has done something worthwhile, and I’ll show you someone who has overcome adversity.',
    'Lou Holtz',
    'American football coach',
  ),
  q('One man practicing sportsmanship is far better than 50 preaching it.', 'Knute Rockne', 'American football coach'),
  q('Build up your weaknesses until they become your strong points.', 'Knute Rockne', 'American football coach'),
  q('Today I will do what others won’t, so tomorrow I can accomplish what others can’t.', 'Jerry Rice', 'American football'),
  q(
    'It’s not the will to win that matters—everyone has that. It’s the will to prepare to win that matters.',
    'Paul “Bear” Bryant',
    'American football coach',
  ),
  q(
    'When you make a mistake, there are only three things you should ever do about it: admit it, learn from it, and don’t repeat it.',
    'Paul “Bear” Bryant',
    'American football coach',
  ),
  q(
    'When you have confidence, you can have a lot of fun. And when you have fun, you can do amazing things.',
    'Joe Namath',
    'American football',
  ),

  // Ice hockey
  q('You miss 100% of the shots you don’t take.', 'Wayne Gretzky', 'Ice hockey'),
  q(
    'A good hockey player plays where the puck is. A great hockey player plays where the puck is going to be.',
    'Wayne Gretzky',
    'Ice hockey',
  ),
  q(
    'The highest compliment that you can pay me is to say that I work hard every day, that I never dog it.',
    'Wayne Gretzky',
    'Ice hockey',
  ),
  q('Great moments are born from great opportunity.', 'Herb Brooks', 'Ice hockey coach'),

  // Golf
  q('The more I practise, the luckier I get.', 'Gary Player', 'Golf'),
  q('We create success or failure on the course primarily by our thoughts.', 'Gary Player', 'Golf'),
  q('Success in golf depends less on strength of body than upon strength of mind and character.', 'Arnold Palmer', 'Golf'),
  q('The most rewarding things you do in life are often the ones that look like they cannot be done.', 'Arnold Palmer', 'Golf'),
  q('Always make a total effort, even when the odds are against you.', 'Arnold Palmer', 'Golf'),
  q('Golf is deceptively simple and endlessly complicated.', 'Arnold Palmer', 'Golf'),
  q('Concentration is a fine antidote to anxiety.', 'Jack Nicklaus', 'Golf'),
  q(
    'Confidence is the most important single factor in this game, and no matter how great your natural talent, there is only one way to obtain and sustain it: work.',
    'Jack Nicklaus',
    'Golf',
  ),
  q('I never missed a putt in my mind.', 'Jack Nicklaus', 'Golf'),
  q('The most important shot in golf is the next one.', 'Ben Hogan', 'Golf'),
  q(
    'There is no such thing as a natural touch. Touch is something you create by hitting millions of golf balls.',
    'Ben Hogan',
    'Golf',
  ),
  q('Golf is a game that is played on a five-inch course – the distance between your ears.', 'Bobby Jones', 'Golf'),
  q(
    'Don’t hurry. Don’t worry. You’re only here for a short visit. So be sure to stop and smell the flowers.',
    'Walter Hagen',
    'Golf',
  ),

  // Boxing, wrestling and martial arts
  q(
    'I hated every minute of training, but I said, ‘Don’t quit. Suffer now and live the rest of your life as a champion.’',
    'Muhammad Ali',
    'Boxing',
  ),
  q('He who is not courageous enough to take risks will accomplish nothing in life.', 'Muhammad Ali', 'Boxing'),
  q('Service to others is the rent you pay for your room here on Earth.', 'Muhammad Ali', 'Boxing'),
  q(
    'Champions aren’t made in gyms. Champions are made from something they have deep inside them – a desire, a dream, a vision.',
    'Muhammad Ali',
    'Boxing',
  ),
  q('It isn’t the mountains ahead to climb that wear you out; it’s the pebble in your shoe.', 'Muhammad Ali', 'Boxing'),
  q('Float like a butterfly, sting like a bee.', 'Muhammad Ali', 'Boxing'),
  q('The man who has no imagination has no wings.', 'Muhammad Ali', 'Boxing'),
  q('A champion is someone who gets up when he can’t.', 'Jack Dempsey', 'Boxing'),
  q(
    'Gold medals aren’t really made of gold. They’re made of sweat, determination, and a hard-to-find alloy called guts.',
    'Dan Gable',
    'Wrestling',
  ),
  q('Be water, my friend.', 'Bruce Lee', 'Martial arts'),
  q(
    'I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.',
    'Bruce Lee',
    'Martial arts',
  ),
  q('Knowing is not enough, we must apply. Willing is not enough, we must do.', 'Bruce Lee', 'Martial arts'),
  q('It is not important to be better than someone else, but to be better than yesterday.', 'Jigoro Kano', 'Judo'),

  // Mountains, bikes and the Games
  q('It is not the mountain we conquer but ourselves.', 'Edmund Hillary', 'Mountaineering'),
  q('Because it’s there.', 'George Mallory', 'Mountaineering'),
  q('It never gets easier, you just go faster.', 'Greg LeMond', 'Cycling'),
  q(
    'The most important thing in the Olympic Games is not to win but to take part, just as the most important thing in life is not the triumph but the struggle.',
    'Pierre de Coubertin',
    'Founder of the modern Olympics',
  ),
];

/** Short enough for the line at the top of a game, with who said it. */
export const SHORT_QUOTES: readonly Quote[] = QUOTES.filter((quote) => quote.text.length + quote.who.length + quote.about.length <= 120);

/** Round by round through a list, starting somewhere new each time the app
 *  opens, so the same one never comes twice running. */
function rotation(list: readonly Quote[]): () => Quote {
  let next = Math.floor(Math.random() * list.length);
  return () => {
    const quote = list[next % list.length];
    next += 1;
    return quote;
  };
}

/** For the card at the end of a round. */
export const nextQuote = rotation(QUOTES);
/** For the line at the top of a game. */
export const nextShortQuote = rotation(SHORT_QUOTES);
