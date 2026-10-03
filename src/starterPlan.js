const DAY_LABELS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']

const phaseConfig = [
  { weeks:[1,2], label:'Base', push:[3,8], plank:30, gripper:15, neck:12, ropeSets:8, ropeWork:45, ropeRest:30 },
  { weeks:[3,4], label:'Construction', push:[4,10], plank:45, gripper:20, neck:15, ropeSets:10, ropeWork:60, ropeRest:30 },
  { weeks:[5,6], label:'Progression', push:[4,12], plank:60, gripper:25, neck:18, ropeSets:12, ropeWork:75, ropeRest:30 },
]

const phaseForWeek = (week=1) => phaseConfig.find(p=>p.weeks.includes(Math.min(6,Math.max(1,week)))) || phaseConfig[0]

export function getProgramWeek(startedAt){
  if(!startedAt) return 1
  const start=new Date(`${startedAt}T00:00:00`)
  const now=new Date()
  const days=Math.max(0,Math.floor((now-start)/(1000*60*60*24)))
  return Math.min(6,Math.floor(days/7)+1)
}

export function getWeekPlan(week=1){
  const p=phaseForWeek(week)
  const [pushSets,pushReps]=p.push
  return {
    0:{title:'Récupération',subtitle:'Mobilité douce · marche · sommeil',focus:'Récupération',duration:'10–25 min',exercises:[]},
    1:{
      title:'Pecs + avant-bras + abdos',
      subtitle:`${p.label} · force maison`,
      focus:'Pecs · grip · core',
      duration:'25–35 min',
      exercises:[
        {slug:'pushup',sets:pushSets,reps:pushReps,rest:60},
        {slug:'hand-gripper-reps',sets:3,reps:p.gripper,rest:45,eachSide:true},
        {slug:'reverse-crunch',sets:3,reps:12+Math.max(0,week-1),rest:40},
        {slug:'plank',sets:3,seconds:p.plank,rest:45},
      ],
    },
    2:{
      title:'Cardio corde + core',
      subtitle:`${p.label} · intervalles progressifs`,
      focus:'Cardio · endurance',
      duration:'18–28 min',
      exercises:[
        {slug:'jump-rope-intervals',sets:p.ropeSets,seconds:p.ropeWork,rest:p.ropeRest,autoTimer:true},
        {slug:'plank',sets:2,seconds:Math.max(25,p.plank-5),rest:40},
      ],
    },
    3:{
      title:'Nuque + avant-bras',
      subtitle:`${p.label} · contrôle et épaisseur`,
      focus:'Cou · grip · posture',
      duration:'20–30 min',
      exercises:[
        {slug:'neck-front-isometric',sets:2,seconds:p.neck,rest:30,autoTimer:true},
        {slug:'neck-back-isometric',sets:2,seconds:p.neck,rest:30,autoTimer:true},
        {slug:'neck-side-isometric',sets:2,seconds:p.neck,rest:30,eachSide:true,autoTimer:true},
        {slug:'hand-gripper-hold',sets:3,seconds:20+Math.max(0,(week-1)*2),rest:45,eachSide:true,autoTimer:true},
        {slug:'finger-extensions',sets:3,reps:20,rest:30},
      ],
    },
    4:{
      title:'Récupération active',
      subtitle:'Cardio léger · mobilité · respiration',
      focus:'Récupération',
      duration:'12–20 min',
      exercises:[
        {slug:'marching-high-knees',sets:4,seconds:45,rest:25,autoTimer:true},
      ],
    },
    5:{
      title:'Pecs + cou + grip',
      subtitle:`${p.label} · séance complète`,
      focus:'Pecs · cou · avant-bras',
      duration:'28–38 min',
      exercises:[
        {slug:'pushup',sets:pushSets,reps:Math.max(6,pushReps-1),rest:60},
        {slug:'neck-front-isometric',sets:2,seconds:p.neck,rest:30,autoTimer:true},
        {slug:'neck-back-isometric',sets:2,seconds:p.neck,rest:30,autoTimer:true},
        {slug:'neck-side-isometric',sets:2,seconds:p.neck,rest:30,eachSide:true,autoTimer:true},
        {slug:'hand-gripper-reps',sets:3,reps:p.gripper,rest:45,eachSide:true},
      ],
    },
    6:{
      title:'Cardio + abdos',
      subtitle:`${p.label} · corde et gainage`,
      focus:'Cardio · abdos',
      duration:'22–32 min',
      exercises:[
        {slug:'jump-rope-intervals',sets:p.ropeSets+2,seconds:p.ropeWork,rest:p.ropeRest,autoTimer:true},
        {slug:'reverse-crunch',sets:3,reps:14+Math.max(0,week-1),rest:40},
        {slug:'plank',sets:3,seconds:p.plank,rest:45,autoTimer:true},
      ],
    },
  }
}

export function getTodayWorkout(programStartedAt){
  const week=getProgramWeek(programStartedAt)
  const plan=getWeekPlan(week)
  return {week,day:new Date().getDay(),workout:plan[new Date().getDay()],plan}
}

export function getProgramMeta(week=1){
  const p=phaseForWeek(week)
  return {
    week:Math.min(6,Math.max(1,week)),
    totalWeeks:6,
    phase:p.label,
    progress:Math.round((Math.min(6,Math.max(1,week))/6)*100),
  }
}

export const starterWeek=getWeekPlan(1)
export const dayLabels=DAY_LABELS

export const mealMoments=[
  {key:'breakfast',label:'Petit-déjeuner',time:'08:00'},
  {key:'lunch',label:'Déjeuner',time:'13:00'},
  {key:'snack',label:'Collation',time:'17:00'},
  {key:'dinner',label:'Dîner',time:'20:30'},
]
