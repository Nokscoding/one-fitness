export const coachAssets = {
  ready: 'sprite:coach:ready',
  welcome: 'sprite:coach:welcome',
  motivate: 'sprite:coach:motivate',
  reminder: 'sprite:coach:reminder',
  complete: 'sprite:coach:complete',
  highKnees: 'sprite:coach:high-knees',
  jumpRope: 'sprite:coach:jump-rope',
  hydration: 'sprite:coach:hydration',
  nutrition: 'sprite:coach:nutrition',
  recovery: 'sprite:coach:recovery',
}

export const exerciseGuideAssets = {
  'pushup': 'sprite:exercise:pushups',
  'wall-pushup': 'sprite:exercise:wall-pushups',
  'hand-gripper-reps': 'sprite:exercise:hand-gripper',
  'hand-gripper-hold': 'sprite:exercise:hand-gripper',
  'reverse-crunch': 'sprite:exercise:reverse-crunch',
  'plank': 'sprite:exercise:plank',
  'jump-rope-intervals': 'sprite:exercise:jump-rope',
  'neck-front-isometric': 'sprite:exercise:neck-isometric',
  'neck-back-isometric': 'sprite:exercise:neck-isometric',
  'neck-side-isometric': 'sprite:exercise:neck-isometric',
  'marching-high-knees': 'sprite:coach:high-knees',
}

export const getExerciseGuide = (slug) => exerciseGuideAssets[slug] || null
