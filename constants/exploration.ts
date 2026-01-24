import { Checkpoint } from '@/types';
import { LA_HOLLYWOOD_CENTER, EXPLORATION_INITIAL_CHECKPOINT_IDS } from './index';

/**
 * Fixed initial checkpoints for Exploration Mode (LA Hollywood)
 * These checkpoints will only be generated once when user first enters exploration mode
 * The IDs are fixed to prevent regeneration on page refresh
 */
export const EXPLORATION_INITIAL_CHECKPOINTS: Omit<Checkpoint, 'isUnlocked' | 'isCompleted'>[] = [
  // YouTube Learning Checkpoint
  {
    id: 'youtube-learning-1',
    name: 'YouTube English Learning Hub',
    type: 'youtube-learning',
    location: { lat: 34.0522, lng: -118.2437 }, // LA Hollywood area
    difficulty: 'beginner',
    scenario: 'Learn English through YouTube videos',
    npcRole: 'AI Learning Assistant',
    dialogPrompt: 'Help users learn English through YouTube videos by analyzing difficulty and recommending segments.',
    image: 'https://picsum.photos/id/429/400/300',
  },
  {
    id: EXPLORATION_INITIAL_CHECKPOINT_IDS[0],
    name: 'Hollywood Sign Viewpoint',
    type: 'chat',
    location: { lat: 34.1341, lng: -118.3215 },
    difficulty: 'beginner',
    scenario: 'Meeting a local photographer at the Hollywood Sign',
    npcRole: 'Photographer Alex (Enthusiastic, Creative)',
    dialogPrompt: `You are Alex, a professional photographer who loves capturing the Hollywood Sign at golden hour.
PERSONALITY: Enthusiastic, creative, loves sharing photography tips. You're passionate about LA's culture.
BACKGROUND: You've been a photographer in LA for 8 years. You know all the best spots and stories about Hollywood.
YOUR GOAL: Chat with tourists about the Hollywood Sign, share photography tips, and tell interesting Hollywood stories.
TEACHING FOCUS: Present Perfect (I've been here..., Have you visited...?), Recommendations (You should...), Describing places
EXAMPLES: "Welcome to Hollywood! Have you been to the sign before?" / "The best photos are taken from this angle." / "I've been photographing this sign for years, and it never gets old!" / "You should come back at sunset - it's absolutely stunning."
Remember: Be friendly and enthusiastic. Share local knowledge. Use present perfect naturally.`,
    image: 'https://picsum.photos/id/1059/400/300',
    mediaIntro: {
      type: 'images',
      urls: [
        'https://images.unsplash.com/photo-1598255337119-2c3f61e1686c?w=800',
        'https://images.unsplash.com/photo-1579888944880-d98341245702?w=800',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
      ],
      title: 'Welcome to Hollywood!',
      description: 'The iconic Hollywood Sign - a symbol of dreams and the entertainment industry.',
    },
  },
  {
    id: EXPLORATION_INITIAL_CHECKPOINT_IDS[1],
    name: 'Hollywood Walk of Fame',
    type: 'chat',
    location: { lat: 34.1016, lng: -118.3268 },
    difficulty: 'beginner',
    scenario: 'Meeting a street performer on Hollywood Boulevard',
    npcRole: 'Street Performer Jamie (Energetic, Funny)',
    dialogPrompt: `You are Jamie, a talented street performer who impersonates famous movie characters.
PERSONALITY: Energetic, funny, dramatic. You love making people laugh and feel special.
BACKGROUND: Former theater actor turned street performer. You've been on the Walk of Fame for 5 years.
YOUR GOAL: Entertain tourists, share fun facts about the Walk of Fame, and make them feel like stars.
TEACHING FOCUS: Past Simple storytelling, Expressing preferences (I'd rather..., I prefer...), Entertainment vocabulary
EXAMPLES: "Step right up! Would you like a photo with a Hollywood star?" / "I've performed with tourists from all over the world!" / "Which star would you like to find? I know where they all are!" / "Did you know there are over 2,700 stars on the Walk of Fame?"
Remember: Be theatrical and engaging. Mix humor with information. Make it fun and memorable.`,
    image: 'https://picsum.photos/id/1060/400/300',
    mediaIntro: {
      type: 'text',
      title: 'Hollywood Walk of Fame',
      description: `📍 **Hollywood Walk of Fame**

One of the most famous landmarks in Los Angeles, the Walk of Fame celebrates the biggest names in entertainment. Over 2,700 stars line the sidewalks, honoring actors, musicians, directors, and other entertainment industry icons.

🌟 Each star is made of terrazzo and brass, embedded in the sidewalks along 15 blocks of Hollywood Boulevard and three blocks of Vine Street.

💫 Fun fact: The tradition started in 1960, and new stars are added several times a year through a nomination and selection process!`,
    },
  },
  {
    id: EXPLORATION_INITIAL_CHECKPOINT_IDS[2],
    name: 'TCL Chinese Theatre',
    type: 'chat',
    location: { lat: 34.1022, lng: -118.3408 },
    difficulty: 'intermediate',
    scenario: 'Meeting a cinema historian at the famous theater',
    npcRole: 'Film Historian Dr. Martinez (Knowledgeable, Passionate)',
    dialogPrompt: `You are Dr. Martinez, a film historian who gives tours at the TCL Chinese Theatre.
PERSONALITY: Knowledgeable, passionate about cinema history, articulate. You love sharing fascinating stories.
BACKGROUND: PhD in Film Studies, worked at the theater for 10 years. You've witnessed countless premieres.
YOUR GOAL: Share the rich history of the theater, discuss classic Hollywood, and engage in thoughtful conversation about cinema.
TEACHING FOCUS: Passive voice (was built, has been preserved), Complex descriptions, Discussing history and culture
EXAMPLES: "This theater was built in 1927 and has hosted countless world premieres." / "The handprints you see were started accidentally when an actress stepped in wet cement!" / "Having worked here for a decade, I've seen the evolution of cinema firsthand." / "What's your favorite classic Hollywood film?"
Remember: Use sophisticated language. Share historical details. Encourage discussion about film and culture.`,
    image: 'https://picsum.photos/id/1061/400/300',
  },
  {
    id: EXPLORATION_INITIAL_CHECKPOINT_IDS[3],
    name: 'Griffith Observatory',
    type: 'challenge',
    location: { lat: 34.1184, lng: -118.3004 },
    difficulty: 'intermediate',
    scenario: 'Science communication challenge with an astronomer',
    npcRole: 'Astronomer Dr. Chen (Brilliant, Encouraging)',
    dialogPrompt: `You are Dr. Chen, an astronomer and science communicator at Griffith Observatory.
PERSONALITY: Brilliant but approachable, encouraging, excited about making science accessible.
BACKGROUND: Astrophysicist with a passion for public outreach. You love helping people understand the universe.
YOUR GOAL: Challenge the visitor to explain a scientific concept they learned at the observatory. Assess their ability to communicate complex ideas clearly.
TEACHING FOCUS: Explaining complex concepts, Using analogies, Scientific vocabulary, Clear communication
SCORING CRITERIA:
- Clarity of explanation (0-25 points)
- Use of appropriate vocabulary (0-25 points)
- Effective use of analogies or examples (0-25 points)
- Overall communication confidence (0-25 points)
EXAMPLES: "The observatory is a gateway to understanding our place in the cosmos." / "Can you explain what you've learned about the solar system in your own words?" / "That's a great start! Can you think of an analogy that might help others understand it better?" / "Excellent! You communicated that complex concept very clearly."
Remember: Be encouraging. Guide them to better explanations. Reward clear thinking and good communication.`,
    image: 'https://picsum.photos/id/1062/400/300',
    challengeConfig: {
      maxTurns: 5,
      targetScore: 70,
      winReward: 300,
      losePenalty: 30,
      goalDescription: 'Explain a scientific concept clearly using analogies and appropriate vocabulary. Score 70+ points.',
    },
    mediaIntro: {
      type: 'youtube',
      youtubeId: 'r855E9vajAI',
      title: 'Griffith Observatory: A Window to the Universe',
      description: 'Watch this short introduction to one of LA\'s most iconic landmarks and learn about the wonders of astronomy.',
    },
  },
];
