/**
 * taskBank.js
 * Pre-configured task, question, and mission banks for students, classrooms,
 * and Catechism / Sunday school faith formation.
 */

export const TASK_PACKS = [
  {
    id: 'catechism_faith',
    name: 'Catechism & Faith Formation',
    icon: 'BookOpen',
    description: 'Scripture readings, prayer leaders, Catechism Q&A, and faith reflections.',
    badge: 'Faith Champion 🕊️',
    color: '#8B5CF6',
    tasks: [
      {
        id: 'cat-1',
        title: 'Lead the Opening / Closing Prayer',
        category: 'Prayer',
        icon: 'Hands',
        instruction: 'Lead the group reverently in an Our Father, Hail Mary, or a prayer from the heart.',
        points: 10
      },
      {
        id: 'cat-2',
        title: 'Scripture Reader: Matthew 5:14-16',
        category: 'Scripture',
        icon: 'BookOpen',
        instruction: 'Read aloud: "You are the light of the world. A city built on a hill cannot be hidden."',
        points: 15
      },
      {
        id: 'cat-3',
        title: 'Scripture Reader: 1 Corinthians 13:4-7',
        category: 'Scripture',
        icon: 'BookOpen',
        instruction: 'Read aloud the verses on love: "Love is patient, love is kind. It does not envy, it does not boast..."',
        points: 15
      },
      {
        id: 'cat-4',
        title: 'Catechism Challenge: The Greatest Commandment',
        category: 'Catechism Q&A',
        icon: 'HelpCircle',
        instruction: 'What is the greatest commandment that Jesus gave us? (Love God with all your heart, and love your neighbor as yourself).',
        points: 20
      },
      {
        id: 'cat-5',
        title: 'Catechism Challenge: Sacraments of Initiation',
        category: 'Catechism Q&A',
        icon: 'HelpCircle',
        instruction: 'Name the 3 Sacraments of Initiation (Baptism, Confirmation, Holy Eucharist).',
        points: 20
      },
      {
        id: 'cat-6',
        title: 'Catechism Challenge: The Ten Commandments',
        category: 'Catechism Q&A',
        icon: 'HelpCircle',
        instruction: 'Can you name 3 of the Ten Commandments? (e.g., Honor your father and mother, Do not steal, Remember the Sabbath).',
        points: 20
      },
      {
        id: 'cat-7',
        title: 'Saint Spotlight: Saint Francis of Assisi',
        category: 'Saint Trivia',
        icon: 'Sparkles',
        instruction: 'Share what you know about St. Francis or his famous prayer: "Lord, make me an instrument of your peace."',
        points: 15
      },
      {
        id: 'cat-8',
        title: 'Gratitude Prayer Sharing',
        category: 'Reflection',
        icon: 'Heart',
        instruction: 'Name three specific blessings in your life that you thank God for today.',
        points: 10
      },
      {
        id: 'cat-9',
        title: 'Fruit of the Spirit: Kindness in Action',
        category: 'Reflection',
        icon: 'HeartHandshake',
        instruction: 'Share one way you can be a peacemaker or bring joy to someone at school or home this week.',
        points: 10
      },
      {
        id: 'cat-10',
        title: 'Spontaneous Petition Leader',
        category: 'Prayer',
        icon: 'Hands',
        instruction: 'Offer one special intention or prayer for someone who is sick, lonely, or needs God\'s help today.',
        points: 10
      }
    ]
  },
  {
    id: 'acts_of_kindness',
    name: 'Kindness & Feel-Good Missions',
    icon: 'Heart',
    description: 'Empowering students with uplifting compliments, gratitude, and good deeds.',
    badge: 'Kindness Hero 💖',
    color: '#EC4899',
    tasks: [
      {
        id: 'kind-1',
        title: 'The Peer Compliment',
        category: 'Kindness',
        icon: 'Sparkles',
        instruction: 'Give a genuine, heartwarming compliment to the person sitting on your right.',
        points: 10
      },
      {
        id: 'kind-2',
        title: 'The Gratitude Spotlight',
        category: 'Gratitude',
        icon: 'Smile',
        instruction: 'Tell the class one thing a friend or family member did recently that made you smile.',
        points: 10
      },
      {
        id: 'kind-3',
        title: 'Secret Agent of Kindness',
        category: 'Mission',
        icon: 'Award',
        instruction: 'Commit to doing one secret helpful deed for a teacher, catechist, or parent before the day ends.',
        points: 15
      },
      {
        id: 'kind-4',
        title: 'The Encouragement Note',
        category: 'Kindness',
        icon: 'Heart',
        instruction: 'Say one positive quality you admire about our whole group or class today.',
        points: 10
      },
      {
        id: 'kind-5',
        title: 'High-Five Goodwill Tour',
        category: 'Engagement',
        icon: 'Smile',
        instruction: 'Give three enthusiastic high-fives or warm fist bumps to three different classmates!',
        points: 10
      }
    ]
  },
  {
    id: 'classroom_helpers',
    name: 'Classroom Star Helpers & Duties',
    icon: 'Star',
    description: 'Rotational helper duties that build student ownership, pride, and helpfulness.',
    badge: 'Star Helper ⭐',
    color: '#F59E0B',
    tasks: [
      {
        id: 'help-1',
        title: 'Board & Cleanliness Captain',
        category: 'Duty',
        icon: 'Award',
        instruction: 'In charge of keeping the front board clean and tidying up the materials at the end of class.',
        points: 10
      },
      {
        id: 'help-2',
        title: 'Line & Greeter Leader',
        category: 'Duty',
        icon: 'Users',
        instruction: 'Lead the line respectfully and give everyone an encouraging greeting as we transition.',
        points: 10
      },
      {
        id: 'help-3',
        title: 'Materials & Book Distributor',
        category: 'Duty',
        icon: 'BookOpen',
        instruction: 'Hand out worksheets, Bibles, or stationery with a cheerful attitude.',
        points: 10
      },
      {
        id: 'help-4',
        title: 'Classroom Timekeeper Assistant',
        category: 'Duty',
        icon: 'Clock',
        instruction: 'Remind the class when there are 5 minutes and 2 minutes remaining in an activity.',
        points: 10
      },
      {
        id: 'help-5',
        title: 'Technology & Light Ambassador',
        category: 'Duty',
        icon: 'Sparkles',
        instruction: 'Help manage room lighting and screen displays for our presentation.',
        points: 10
      }
    ]
  },
  {
    id: 'quick_challenges',
    name: 'Fun Brain Breaks & Energizers',
    icon: 'Zap',
    description: 'Fast, playful challenges to re-energize students and bring laughter to the room.',
    badge: 'Energy Champion ⚡',
    color: '#159A72',
    tasks: [
      {
        id: 'energize-1',
        title: '15-Second Victory Stretch',
        category: 'Energy',
        icon: 'Zap',
        instruction: 'Lead the entire room in a refreshing 15-second standing stretch and deep breath.',
        points: 10
      },
      {
        id: 'energize-2',
        title: 'Clean Joke or Riddle',
        category: 'Humor',
        icon: 'Smile',
        instruction: 'Share your favorite clean joke or a riddle for the class to solve!',
        points: 15
      },
      {
        id: 'energize-3',
        title: 'Alphabet Reverse Sprint',
        category: 'Mind Game',
        icon: 'Sparkles',
        instruction: 'Recite letters backwards from H to A without stopping!',
        points: 10
      },
      {
        id: 'energize-4',
        title: 'Favorite Role Model',
        category: 'Sharing',
        icon: 'Award',
        instruction: 'Name one person in history, the Bible, or your life that inspires you to be your best self.',
        points: 10
      }
    ]
  }
];

export const ENCOURAGING_AFFIRMATIONS = [
  "You're going to do amazing!",
  "Thank you for sharing your light with us! ✨",
  "Your positive energy makes our group better! 🌟",
  "We are all cheering for you! 👏",
  "You are capable of wonderful things!",
  "Thank you for bringing your kindness to class! ❤️",
  "Well done, good and faithful participant! 🕊️",
  "Every small good deed makes a big difference!"
];

export const GROUP_NAME_THEMES = {
  gospel: {
    label: 'Gospel Writers (Catechism)',
    names: ['Team Matthew', 'Team Mark', 'Team Luke', 'Team John', 'Team Acts', 'Team Paul']
  },
  virtues: {
    label: 'Fruits & Virtues (Catechism)',
    names: ['Team Faith', 'Team Hope', 'Team Joy', 'Team Peace', 'Team Kindness', 'Team Patience', 'Team Love', 'Team Grace']
  },
  apostles: {
    label: 'Apostles & Saints (Catechism)',
    names: ['Team Peter', 'Team John', 'Team James', 'Team Andrew', 'Team Philip', 'Team Francis', 'Team Clare', 'Team Therese']
  },
  stars: {
    label: 'Stars & Constellations',
    names: ['Team Polaris', 'Team Orion', 'Team Sirius', 'Team Vega', 'Team Phoenix', 'Team Pegasus']
  },
  standard: {
    label: 'Standard Alphabet (Team A, B, C...)',
    names: null // generated dynamically
  }
};

