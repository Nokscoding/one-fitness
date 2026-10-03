export const starterWeek = {
  0: { title: 'Récupération', subtitle: 'Repos complet ou marche douce', exercises: [] },
  1: {
    title: 'Pecs + avant-bras + abdos',
    subtitle: 'Force à la maison · 25–35 min',
    exercises: [
      { slug: 'pushup', sets: 3, reps: 8, rest: 60 },
      { slug: 'hand-gripper-reps', sets: 3, reps: 15, rest: 45, eachSide: true },
      { slug: 'plank', sets: 3, seconds: 30, rest: 45 },
      { slug: 'reverse-crunch', sets: 3, reps: 12, rest: 45 },
    ],
  },
  2: {
    title: 'Cardio corde',
    subtitle: 'Intervalles · 12–18 min',
    exercises: [{ slug: 'jump-rope-intervals', sets: 8, seconds: 60, rest: 30 }],
  },
  3: {
    title: 'Nuque + avant-bras + abdos',
    subtitle: 'Contrôle et progression · 20–30 min',
    exercises: [
      { slug: 'neck-front-isometric', sets: 2, seconds: 15, rest: 30 },
      { slug: 'neck-back-isometric', sets: 2, seconds: 15, rest: 30 },
      { slug: 'neck-side-isometric', sets: 2, seconds: 15, rest: 30, eachSide: true },
      { slug: 'hand-gripper-hold', sets: 3, seconds: 20, rest: 45, eachSide: true },
      { slug: 'finger-extensions', sets: 3, reps: 20, rest: 30 },
      { slug: 'plank', sets: 3, seconds: 30, rest: 45 },
    ],
  },
  4: {
    title: 'Récupération active',
    subtitle: 'Cardio léger · 10–15 min',
    exercises: [{ slug: 'marching-high-knees', sets: 3, seconds: 45, rest: 30 }],
  },
  5: {
    title: 'Pecs + nuque + avant-bras',
    subtitle: 'Force à la maison · 25–35 min',
    exercises: [
      { slug: 'pushup', sets: 3, reps: 8, rest: 60 },
      { slug: 'neck-front-isometric', sets: 2, seconds: 15, rest: 30 },
      { slug: 'neck-back-isometric', sets: 2, seconds: 15, rest: 30 },
      { slug: 'neck-side-isometric', sets: 2, seconds: 15, rest: 30, eachSide: true },
      { slug: 'hand-gripper-reps', sets: 3, reps: 15, rest: 45, eachSide: true },
    ],
  },
  6: {
    title: 'Cardio + abdos',
    subtitle: 'Corde et gainage · 20–30 min',
    exercises: [
      { slug: 'jump-rope-intervals', sets: 10, seconds: 60, rest: 30 },
      { slug: 'reverse-crunch', sets: 3, reps: 12, rest: 45 },
      { slug: 'plank', sets: 3, seconds: 35, rest: 45 },
    ],
  },
}

export const mealMoments = [
  { key: 'breakfast', label: 'Petit-déjeuner', time: '08:00' },
  { key: 'lunch', label: 'Déjeuner', time: '13:00' },
  { key: 'snack', label: 'Collation', time: '17:00' },
  { key: 'dinner', label: 'Dîner', time: '20:30' },
]
