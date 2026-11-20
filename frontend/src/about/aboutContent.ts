// Editorial content only. Replace the clearly marked biography when Eden supplies it.
export const aboutContent = {
  eyebrow: 'A small corner of EdenOS',
  title: 'About Eden',
  subtitle: 'My Little Universe',
  introduction: 'A home for curiosity, things I make, and the everyday moments I want to keep.',
  heroAlt: 'Eden with curly hair, black glasses, a black EdenOS wing shirt, light cargo pants, backpack and cat charm.',
  heroCaption: 'A familiar face in a growing little universe.',
  jumpLabel: 'Meet Interactive Eden',
  sectionNavLabel: 'Explore About Eden',
  who: {
    id: 'who-am-i', title: 'Who Am I', eyebrow: '01 / The person',
    greeting: 'Hi, I’m Eden.',
    text: 'This is a little space for the interests, ideas and everyday life behind EdenOS.',
    placeholderLabel: 'Personal introduction · to be added',
    placeholder: 'Eden’s personal background and introduction will go here.',
  },
  story: {
    id: 'edenos-story', title: 'My EdenOS Story', eyebrow: '02 / The idea',
    paragraphs: [
      'EdenOS is a personal operating system: one calm home for money, movement, media and reflection.',
      'The idea is to make everyday information easier to return to, with room for a little personality along the way.',
    ],
    closing: 'A small universe, one thoughtful piece at a time.',
  },
  interests: {
    id: 'my-interests', title: 'My Interests', eyebrow: '03 / The constellations',
    description: 'A few things that belong in this little universe.',
    items: [
      { id: 'development', title: 'Development', text: 'Small tools. Useful experiments. The joy of making.' },
      { id: 'ai', title: 'AI', text: 'Questions, possibilities, and new ways to explore ideas.' },
      { id: 'design', title: 'Product design', text: 'Thoughtful details that make everyday things feel easier.' },
      { id: 'swimming', title: 'Swimming', text: 'A little movement, a little quiet, a change of pace.' },
      { id: 'games', title: 'Games', text: 'Worlds to discover and moments of play.' },
      { id: 'life', title: 'Life', text: 'The ordinary moments that make a universe personal.' },
    ],
  },
  interactive: {
    id: 'interactive-eden', title: 'Interactive Eden', eyebrow: '04 / A little hello',
    description: 'Pick a gesture. Eden will return to a quiet moment when it ends.',
    imageAlt: 'Interactive illustrated Eden avatar.',
    controlsLabel: 'Eden’s gestures',
    idle: 'A quiet moment. Choose Smile, Think or Wave.',
    paused: 'Gestures are paused while privacy lock or another dialog is open.',
    actions: {
      smile: { label: 'Smile', announcement: 'Eden gives you a warm smile.' },
      think: { label: 'Think', announcement: 'Eden takes a moment to think.' },
      wave: { label: 'Wave', announcement: 'Eden waves hello.' },
    },
  },
  footer: 'Made of small ideas, everyday life, and a little stardust.',
} as const
