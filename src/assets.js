export const coachAssets = {
  highKnees: '/assets/coach-high-knees.webp',
  jumpRope: '/assets/coach-jump-rope.webp',
  hydration: '/assets/coach-hydration.webp',
  nutrition: '/assets/coach-nutrition.webp',
  recovery: '/assets/coach-recovery.webp',
  ready: '/assets/coach-ready.webp',
  welcome: '/assets/coach-welcome.webp',
  motivate: '/assets/coach-motivate.webp',
  reminder: '/assets/coach-reminder.webp',
  complete: '/assets/coach-complete.webp',
}

export const exerciseGuideAssets = {
  'pushup': '/assets/exercise-pushups.webp',
  'wall-pushup': '/assets/exercise-pushups.webp',
  'hand-gripper-reps': '/assets/exercise-hand-gripper.webp',
  'hand-gripper-hold': '/assets/exercise-hand-gripper.webp',
  'reverse-crunch': '/assets/exercise-reverse-crunch.webp',
  'jump-rope-intervals': '/assets/exercise-jump-rope.webp',
  'neck-front-isometric': '/assets/exercise-neck-isometric.webp',
  'neck-back-isometric': '/assets/exercise-neck-isometric.webp',
  'neck-side-isometric': '/assets/exercise-neck-isometric.webp',
  'marching-high-knees': '/assets/coach-high-knees.webp',
}

export const getExerciseGuide = (slug) => exerciseGuideAssets[slug] || null
