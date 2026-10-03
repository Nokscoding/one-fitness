import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Apple, Bell, CalendarDays, Check, ChevronRight, Clock3, Droplets, Dumbbell,
  Flame, Home, LogOut, Moon, Pause, Play, Plus, Settings, ShieldCheck, Smartphone,
  Sparkles, Target, TimerReset, Trophy, UserRound, Utensils, Weight, X, Zap,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { enableOneFitnessPush, getOneFitnessPushState } from './lib/push'
import { dayLabels, getProgramMeta, getProgramWeek, getTodayWorkout, getWeekPlan, mealMoments } from './starterPlan'

const TABLE = {
  profile: 'one_fitness_profiles',
  exercises: 'one_fitness_exercises',
  sessions: 'one_fitness_workout_sessions',
  sets: 'one_fitness_workout_sets',
  water: 'one_fitness_water_logs',
  meals: 'one_fitness_meal_logs',
  measurements: 'one_fitness_measurements',
  reminders: 'one_fitness_reminders',
  sleep: 'one_fitness_sleep_logs',
}

const tabs = [
  ['home', Home, 'Accueil'],
  ['workout', Dumbbell, 'Séances'],
  ['nutrition', Utensils, 'Nutrition'],
  ['progress', Activity, 'Progrès'],
  ['profile', UserRound, 'Moi'],
]

const tabKeys = new Set(tabs.map(([key]) => key))
const initialTab = () => {
  const requested = new URLSearchParams(window.location.search).get('tab')
  return tabKeys.has(requested) ? requested : 'home'
}
const formatDate = (date = new Date()) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(date)
const startOfTodayISO = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString() }
const todayDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lubumbashi' }).format(new Date())
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const pad = n => String(n).padStart(2, '0')
const formatSeconds = seconds => `${pad(Math.floor((seconds || 0) / 60))}:${pad((seconds || 0) % 60)}`
const WORKOUT_DRAFT_KEY='one_fitness_active_workout_v3'\n
let oneFitnessAudioContext = null
function primeAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!oneFitnessAudioContext) oneFitnessAudioContext = new AudioCtx()
    if (oneFitnessAudioContext.state === 'suspended') oneFitnessAudioContext.resume()
  } catch {}
}
function playTimerTone(kind='done') {
  try {
    primeAudio()
    if (!oneFitnessAudioContext) return
    const ctx=oneFitnessAudioContext
    const now=ctx.currentTime
    const notes=kind==='start'?[660,880]:kind==='rest'?[520,660]:[880,1040,1240]
    notes.forEach((freq,index)=>{
      const osc=ctx.createOscillator()
      const gain=ctx.createGain()
      osc.type='sine'
      osc.frequency.setValueAtTime(freq,now+index*.11)
      gain.gain.setValueAtTime(.0001,now+index*.11)
      gain.gain.exponentialRampToValueAtTime(.22,now+index*.11+.015)
      gain.gain.exponentialRampToValueAtTime(.0001,now+index*.11+.095)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now+index*.11)
      osc.stop(now+index*.11+.11)
    })
  } catch {}
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><img src="/icon.svg" alt=""/><span><b>One</b> Fitness</span></div>
}

function Spinner() { return <div className="spinner" aria-label="Chargement"/> }

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      if (mode === 'register') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hdsjpsrvoiwqfjuehdkt.supabase.co'
        const response = await fetch(`${supabaseUrl}/functions/v1/one-fitness-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Impossible de créer le compte.')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      const raw = String(error?.message || error || '')
      setStatus(raw.toLowerCase().includes('invalid login credentials') ? 'E-mail ou mot de passe incorrect.' : raw)
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-screen">
    <div className="auth-card">
      <Brand />
      <div className="auth-visual">
        <img src="/coach.svg" alt="Coach One Fitness"/>
        <div><span>COACH PERSONNEL</span><b>À la maison. À ton rythme. Tous les jours.</b></div>
      </div>
      <h1>{mode === 'login' ? 'Bon retour 👋' : 'Crée ton espace'}</h1>
      <p className="muted">{mode === 'login' ? 'Entre ton e-mail et ton mot de passe.' : 'Ton compte est utilisable immédiatement.'}</p>
      <form onSubmit={submit} className="auth-form">
        <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" required />
        <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" required />
        <button className="primary-button" disabled={loading}>{loading ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
      </form>
      {status && <p className="status-note error-note">{status}</p>}
      <button className="auth-switch" type="button" onClick={()=>{setMode(mode === 'login' ? 'register' : 'login');setStatus('')}}>
        {mode === 'login' ? 'Première fois ? Créer mon compte' : 'J’ai déjà un compte · Me connecter'}
      </button>
    </div>
  </main>
}

function Onboarding({ user, onDone }) {
  const [form, setForm] = useState({
    display_name: '', height_cm: '', weight_kg: '', preferred_workout_time: '18:30',
    water_target_ml: 2000, preferred_session_minutes: 30,
  })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      user_id: user.id,
      display_name: form.display_name || 'Noks',
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      preferred_workout_time: form.preferred_workout_time || null,
      preferred_session_minutes: Number(form.preferred_session_minutes) || 30,
      water_target_ml: Number(form.water_target_ml) || 2000,
      program_started_at: todayDateKey(),
      equipment: ['hand_gripper','jump_rope'],
      onboarding_complete: true,
    }
    const { data, error } = await supabase.from(TABLE.profile).upsert(payload).select().single()
    setSaving(false)
    if (!error) onDone(data)
  }

  return <main className="onboarding">
    <section className="onboarding-card">
      <Brand />
      <div className="coach-bubble"><img src="/coach.svg" alt="Coach"/><div><b>Je prépare ton programme de départ.</b><span>6 semaines progressives, à la maison.</span></div></div>
      <h1>Ton point de départ</h1>
      <form onSubmit={save} className="grid-form">
        <label>Nom affiché<input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="Noks"/></label>
        <div className="split"><label>Taille (cm)<input inputMode="decimal" value={form.height_cm} onChange={e=>setForm({...form,height_cm:e.target.value})}/></label><label>Poids (kg)<input inputMode="decimal" value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})}/></label></div>
        <div className="split"><label>Heure séance<input type="time" value={form.preferred_workout_time} onChange={e=>setForm({...form,preferred_workout_time:e.target.value})}/></label><label>Durée souhaitée<select value={form.preferred_session_minutes} onChange={e=>setForm({...form,preferred_session_minutes:e.target.value})}><option value="20">20 min</option><option value="30">30 min</option><option value="40">40 min</option></select></label></div>
        <label>Objectif eau (ml)<input inputMode="numeric" value={form.water_target_ml} onChange={e=>setForm({...form,water_target_ml:e.target.value})}/></label>
        <div className="goal-box"><Target size={18}/><div><b>Objectif</b><span>Meilleure silhouette · cou et avant-bras plus épais · pecs · abdos · cardio</span></div></div>
        <div className="goal-box"><Dumbbell size={18}/><div><b>Départ maison</b><span>Hand gripper · corde à sauter · poids du corps</span></div></div>
        <button className="primary-button" disabled={saving}>{saving ? 'Préparation…' : 'Démarrer mon programme'}</button>
      </form>
    </section>
  </main>
}

function StatPill({ icon: Icon, label, value }) {
  return <div className="stat-pill"><Icon size={17}/><div><b>{value}</b><span>{label}</span></div></div>
}

function PushCard({ state, onEnable }) {
  if (state === 'active') return null
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  return <section className="push-card">
    <div className="push-icon"><Bell size={20}/></div>
    <div><b>Active ton coach en arrière-plan</b><p>{isiOS && !standalone ? 'Ajoute d’abord One Fitness à l’écran d’accueil, puis active les notifications.' : 'Reçois les rappels eau, repas, séance et récupération même quand l’app est fermée.'}</p></div>
    <button onClick={onEnable}>{isiOS && !standalone ? 'Comment ?' : 'Activer'}</button>
  </section>
}

function HomeScreen({ profile, waterMl, meals, sessions, sleepLog, pushState, onEnablePush, onWater, onStart, onTab }) {
  const { week, workout } = getTodayWorkout(profile?.program_started_at)
  const meta = getProgramMeta(week)
  const target = profile?.water_target_ml || 2000
  const waterPercent = clamp(Math.round((waterMl / target) * 100), 0, 100)
  const name = profile?.display_name || 'Noks'
  const streak = useMemo(() => {
    const unique=[...new Set(sessions.map(s=>new Date(s.started_at).toLocaleDateString('en-CA')))]
    let count=0
    const d=new Date()
    for(let i=0;i<30;i++){
      const key=d.toLocaleDateString('en-CA')
      if(unique.includes(key)) count++
      else if(i>0) break
      d.setDate(d.getDate()-1)
    }
    return count
  },[sessions])

  return <>
    <header className="topbar">
      <div><p className="tiny">{formatDate()}</p><h1>Salut, {name} 👋</h1><p className="muted">Semaine {week}/6 · phase {meta.phase}</p></div>
      <div className="profile-stack"><img src="/coach.svg" alt="Coach"/><button className="icon-button" onClick={()=>onTab('profile')}><Bell size={20}/>{pushState!=='active'&&<i/>}</button></div>
    </header>

    <section className="program-strip">
      <div><span>PROGRAMME 6 SEMAINES</span><b>Semaine {week} · {meta.phase}</b></div>
      <strong>{meta.progress}%</strong>
      <div className="progress-track"><i style={{width:`${meta.progress}%`}}/></div>
    </section>

    <section className="hero-card">
      <div className="hero-content">
        <span className="pill-label">SÉANCE DU JOUR</span>
        <h2>{workout.title}</h2>
        <p>{workout.focus}</p>
        <div className="hero-tags"><span><Clock3 size={15}/> {workout.duration}</span><span><Home size={15}/> Maison</span></div>
        {workout.exercises.length
          ? <button className="white-button" onClick={onStart}><Play size={17}/> Commencer</button>
          : <button className="white-button" onClick={()=>onTab('progress')}>Récupération <ChevronRight size={18}/></button>}
      </div>
      <div className="coach-cutout"><img src="/coach.svg" alt="Coach One Fitness"/></div>
    </section>

    <PushCard state={pushState} onEnable={onEnablePush}/>

    <section className="daily-row">
      <button className="daily-card" onClick={()=>onWater(250)}><span className="icon-orb blue"><Droplets size={18}/></span><div><b>{(waterMl/1000).toFixed(1)} L</b><small>Eau · +250 ml</small></div><strong>{waterPercent}%</strong></button>
      <button className="daily-card" onClick={()=>onTab('nutrition')}><span className="icon-orb dark"><Utensils size={18}/></span><div><b>{meals.length}/4</b><small>Repas notés</small></div><ChevronRight size={18}/></button>
      <button className="daily-card" onClick={()=>onTab('progress')}><span className="icon-orb blue"><Flame size={18}/></span><div><b>{streak} j</b><small>Régularité</small></div><ChevronRight size={18}/></button>
    </section>

    <section className="section-block"><div className="section-title"><div><p className="eyebrow">COACH</p><h2>Conseil du jour</h2></div><Sparkles size={22}/></div><div className="coach-message"><img src="/coach.svg" alt="Coach"/><p>{sleepLog?.fatigue >= 4 ? 'Tu as signalé beaucoup de fatigue : garde la séance légère aujourd’hui et arrête si la technique se dégrade.' : workout.exercises.some(x=>x.slug.includes('neck')) ? 'Pour la nuque : résistance légère, mouvement contrôlé, jamais de charge lourde sur la tête.' : 'Cherche une progression régulière. Finir proprement les séries est plus utile que forcer avec une mauvaise technique.'}</p></div></section>

    <section className="section-block compact-block"><div className="section-title"><h2>Ta journée</h2><CalendarDays size={20}/></div><div className="day-agenda"><div><span>08:00</span><b>Petit-déjeuner</b></div><div><span>13:00</span><b>Déjeuner</b></div><div><span>{profile?.preferred_workout_time?.slice?.(0,5)||'18:30'}</span><b>{workout.exercises.length?'Séance':'Récupération'}</b></div><div><span>22:30</span><b>Sommeil / récupération</b></div></div></section>
  </>
}

function WorkoutScreen({ profile, exercises, sessions, onStartWorkout }) {
  const currentWeek = getProgramWeek(profile?.program_started_at)
  const [viewWeek,setViewWeek]=useState(currentWeek)
  const plan=getWeekPlan(viewWeek)
  const meta=getProgramMeta(viewWeek)
  const bySlug=useMemo(()=>Object.fromEntries(exercises.map(e=>[e.slug,e])),[exercises])

  return <>
    <header className="screen-header"><div><p className="eyebrow">PROGRAMME MAISON</p><h1>Mes séances</h1><p className="muted">Progression structurée sur 6 semaines.</p></div><span className="big-icon"><Dumbbell/></span></header>

    <section className="phase-card">
      <div><span>SEMAINE {viewWeek}/6</span><h2>{meta.phase}</h2><p>Objectif : progresser sans brûler les étapes.</p></div>
      <div className="week-switch">{[1,2,3,4,5,6].map(w=><button key={w} className={w===viewWeek?'active':''} onClick={()=>setViewWeek(w)}>{w}</button>)}</div>
    </section>

    <section className="week-list">
      {Object.entries(plan).map(([day,data])=>{
        const isToday=Number(day)===new Date().getDay() && viewWeek===currentWeek
        const completed=sessions.some(s=>s.program_week===viewWeek && s.program_day===Number(day))
        return <article key={day} className={`day-card ${isToday?'active':''}`}>
          <div className="day-number">{dayLabels[day]?.slice(0,1)}</div>
          <div className="day-body"><b>{data.title}</b><span>{data.duration} · {data.focus}</span></div>
          {completed?<span className="done-pill"><Check size={13}/></span>:data.exercises.length?<button className="day-play" onClick={()=>onStartWorkout(data,viewWeek,Number(day))}><Play size={15}/></button>:<span className="rest-badge">Repos</span>}
        </article>
      })}
    </section>

    <section className="section-block"><div className="section-title"><div><p className="eyebrow">BIBLIOTHÈQUE</p><h2>Exercices</h2></div><span>{exercises.length}</span></div><div className="exercise-grid">{exercises.map(ex=><details className="exercise-card" key={ex.id}><summary><span className="icon-orb blue"><Zap size={17}/></span><div><b>{ex.name}</b><small>{ex.category} · {ex.difficulty}</small></div><ChevronRight size={18}/></summary><div className="exercise-detail"><h4>Comment faire</h4><ol>{(ex.instructions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol>{ex.safety_notes?.length>0&&<div className="safety"><ShieldCheck size={17}/><div><b>Sécurité</b>{ex.safety_notes.map((x,i)=><p key={i}>{x}</p>)}</div></div>}</div></details>)}</div></section>
  </>
}

function NutritionScreen({ profile, waterMl, meals, onWater, onAddMeal }) {
  const [meal,setMeal]=useState({meal_type:'lunch',title:''})
  const target=profile?.water_target_ml||2000
  const percent=clamp(Math.round(waterMl/target*100),0,100)
  const submit=async(e)=>{e.preventDefault();if(!meal.title.trim())return;await onAddMeal(meal);setMeal({...meal,title:''})}

  return <>
    <header className="screen-header"><div><p className="eyebrow">ALIMENTATION & EAU</p><h1>Nutrition</h1><p className="muted">Simple, régulier, adapté à ton quotidien.</p></div><span className="big-icon"><Apple/></span></header>

    <section className="hydration-banner">
      <div><Droplets size={28}/><p>Hydratation aujourd’hui</p><h2>{waterMl} ml <small>/ {target} ml</small></h2><div className="water-progress"><i style={{width:`${percent}%`}}/></div></div>
      <div className="water-actions"><button onClick={()=>onWater(250)}>+250</button><button onClick={()=>onWater(500)}>+500</button></div>
    </section>

    <section className="section-block"><div className="section-title"><h2>Repas du jour</h2><span>{meals.length}/4</span></div><div className="meal-timeline">{mealMoments.map(m=>{const found=meals.find(x=>x.meal_type===m.key);return <div className={`meal-row ${found?'done':''}`} key={m.key}><span className="meal-time">{m.time}</span><span className="meal-check">{found?<Check size={16}/>:<Utensils size={16}/>}</span><div><b>{m.label}</b><p>{found?found.title||'Repas enregistré':'À noter'}</p></div></div>})}</div></section>

    <section className="section-block"><div className="section-title"><h2>Ajouter un repas</h2><Plus size={20}/></div><form className="quick-form" onSubmit={submit}><select value={meal.meal_type} onChange={e=>setMeal({...meal,meal_type:e.target.value})}>{mealMoments.map(m=><option value={m.key} key={m.key}>{m.label}</option>)}</select><input value={meal.title} onChange={e=>setMeal({...meal,title:e.target.value})} placeholder="Ex. riz, poulet, haricots, légumes"/><button className="primary-button small">Enregistrer</button></form></section>

    <section className="nutrition-guide"><div><span className="icon-orb blue"><Target size={18}/></span><b>Repère simple</b></div><p>À plusieurs repas : une source de protéines, des féculents selon ta faim et ton activité, des fruits/légumes et de l’eau. Pour voir les abdos, la régularité alimentaire compte autant que les exercices.</p></section>
  </>
}

function MiniLineChart({ history, field, label, unit='cm' }) {
  const points=history.map(x=>Number(x[field])).filter(v=>Number.isFinite(v)&&v>0)
  if(points.length<2) return <div className="chart-empty">Ajoute au moins 2 mesures pour voir la courbe.</div>
  const min=Math.min(...points), max=Math.max(...points), range=Math.max(1,max-min)
  const coords=points.map((v,i)=>`${(i/(points.length-1))*100},${92-((v-min)/range)*72}`).join(' ')
  return <div className="mini-chart"><div><b>{label}</b><span>{points.at(-1)} {unit}</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={coords}/></svg></div>
}

function ProgressScreen({ latest, measurementHistory, sessions, onAddMeasurement }) {
  const [open,setOpen]=useState(false)
  const [m,setM]=useState({weight_kg:'',neck_cm:'',forearm_left_cm:'',forearm_right_cm:'',wrist_left_cm:'',wrist_right_cm:'',chest_cm:'',waist_cm:'',pushups_max:'',plank_seconds:'',jump_rope_seconds:''})
  const save=async(e)=>{e.preventDefault();await onAddMeasurement(m);setOpen(false)}
  const completedThisWeek=sessions.filter(s=>Date.now()-new Date(s.started_at).getTime()<7*86400000).length

  return <>
    <header className="screen-header"><div><p className="eyebrow">TRANSFORMATION</p><h1>Mes progrès</h1><p className="muted">Mesures réelles, pas de score arbitraire.</p></div><span className="big-icon"><Activity/></span></header>

    <section className="progress-hero"><div><p>Séances 7 jours</p><strong>{completedThisWeek}</strong></div><div><p>Tour de cou</p><strong>{latest?.neck_cm?`${latest.neck_cm} cm`:'—'}</strong></div><div><p>Avant-bras D</p><strong>{latest?.forearm_right_cm?`${latest.forearm_right_cm} cm`:'—'}</strong></div></section>

    <section className="section-block"><div className="section-title"><h2>Évolution</h2><button className="text-button" onClick={()=>setOpen(true)}><Plus size={16}/> Nouvelle mesure</button></div><div className="chart-grid"><MiniLineChart history={measurementHistory} field="neck_cm" label="Cou"/><MiniLineChart history={measurementHistory} field="forearm_right_cm" label="Avant-bras droit"/></div></section>

    <section className="section-block"><div className="section-title"><h2>Dernier point</h2><Trophy size={20}/></div><div className="measure-grid"><StatPill icon={Weight} label="Poids" value={latest?.weight_kg?`${latest.weight_kg} kg`:'—'}/><StatPill icon={Target} label="Poitrine" value={latest?.chest_cm?`${latest.chest_cm} cm`:'—'}/><StatPill icon={Flame} label="Pompes max" value={latest?.pushups_max||'—'}/><StatPill icon={Clock3} label="Planche" value={latest?.plank_seconds?`${latest.plank_seconds}s`:'—'}/></div></section>

    <section className="section-block"><div className="section-title"><h2>Historique séances</h2><CalendarDays size={20}/></div>{sessions.length?<div className="session-list">{sessions.slice(0,10).map(s=><div className="session-row" key={s.id}><span className="icon-orb blue"><Check size={16}/></span><div><b>{s.title}</b><p>{new Date(s.started_at).toLocaleDateString('fr-FR')} · Semaine {s.program_week||'—'}</p></div><span>{s.duration_seconds?`${Math.round(s.duration_seconds/60)} min`:'Terminé'}</span></div>)}</div>:<div className="empty-state">Ta première séance terminée apparaîtra ici.</div>}</section>

    {open&&<div className="modal-backdrop"><form className="modal measurement-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">NOUVEAU POINT</p><h2>Mesures & performances</h2></div><button type="button" className="icon-button" onClick={()=>setOpen(false)}><X/></button></div>
      <div className="split"><label>Poids kg<input inputMode="decimal" value={m.weight_kg} onChange={e=>setM({...m,weight_kg:e.target.value})}/></label><label>Cou cm<input inputMode="decimal" value={m.neck_cm} onChange={e=>setM({...m,neck_cm:e.target.value})}/></label></div>
      <div className="split"><label>Avant-bras G<input inputMode="decimal" value={m.forearm_left_cm} onChange={e=>setM({...m,forearm_left_cm:e.target.value})}/></label><label>Avant-bras D<input inputMode="decimal" value={m.forearm_right_cm} onChange={e=>setM({...m,forearm_right_cm:e.target.value})}/></label></div>
      <div className="split"><label>Poignet G<input inputMode="decimal" value={m.wrist_left_cm} onChange={e=>setM({...m,wrist_left_cm:e.target.value})}/></label><label>Poignet D<input inputMode="decimal" value={m.wrist_right_cm} onChange={e=>setM({...m,wrist_right_cm:e.target.value})}/></label></div>
      <div className="split"><label>Poitrine cm<input inputMode="decimal" value={m.chest_cm} onChange={e=>setM({...m,chest_cm:e.target.value})}/></label><label>Taille cm<input inputMode="decimal" value={m.waist_cm} onChange={e=>setM({...m,waist_cm:e.target.value})}/></label></div>
      <div className="split"><label>Pompes max<input inputMode="numeric" value={m.pushups_max} onChange={e=>setM({...m,pushups_max:e.target.value})}/></label><label>Planche sec<input inputMode="numeric" value={m.plank_seconds} onChange={e=>setM({...m,plank_seconds:e.target.value})}/></label></div>
      <button className="primary-button">Enregistrer</button>
    </form></div>}
  </>
}

function ProfileScreen({ profile, reminders, sleepLog, pushState, onEnablePush, onSaveProfile, onSaveReminder, onSaveRecovery, onLogout }) {
  const [draft,setDraft]=useState(profile)
  const [recovery,setRecovery]=useState({quality:sleepLog?.quality||0,fatigue:sleepLog?.fatigue||0,soreness:sleepLog?.soreness||0})
  useEffect(()=>setDraft(profile),[profile])
  useEffect(()=>setRecovery({quality:sleepLog?.quality||0,fatigue:sleepLog?.fatigue||0,soreness:sleepLog?.soreness||0}),[sleepLog])

  const defaults=[
    {kind:'workout',title:'Séance One Fitness',body:'C’est l’heure de ta séance.',time_local:profile?.preferred_workout_time?.slice?.(0,5)||'18:30',target_path:'/?tab=workout'},
    {kind:'water',title:'Hydratation',body:'Pense à boire un peu d’eau.',time_local:'08:30',repeat_every_minutes:120,window_start:'08:30',window_end:'22:30',target_path:'/?tab=nutrition'},
    {kind:'breakfast',title:'Petit-déjeuner',body:'Ton petit-déjeuner est prévu maintenant.',time_local:'08:00',target_path:'/?tab=nutrition'},
    {kind:'lunch',title:'Déjeuner',body:'C’est l’heure de ton déjeuner.',time_local:'13:00',target_path:'/?tab=nutrition'},
    {kind:'snack',title:'Collation',body:'Ta collation est prévue maintenant.',time_local:'17:00',target_path:'/?tab=nutrition'},
    {kind:'dinner',title:'Dîner',body:'C’est l’heure de ton dîner.',time_local:'20:30',target_path:'/?tab=nutrition'},
    {kind:'sleep',title:'Récupération',body:'Prépare ton sommeil pour mieux récupérer.',time_local:'22:30',target_path:'/?tab=profile'},
  ]
  const equipmentOptions=[['hand_gripper','Hand gripper'],['jump_rope','Corde à sauter'],['dumbbells','Haltères'],['resistance_bands','Élastiques'],['pull_up_bar','Barre de traction']]
  const toggleEquipment=key=>{const current=draft?.equipment||[];setDraft({...draft,equipment:current.includes(key)?current.filter(x=>x!==key):[...current,key]})}

  return <>
    <header className="screen-header"><div><p className="eyebrow">TON ESPACE</p><h1>Moi</h1><p className="muted">Profil, récupération et rappels.</p></div><span className="big-icon"><Settings/></span></header>

    <section className="profile-card"><img src="/coach.svg" alt="Coach One Fitness"/><div><p className="eyebrow">PROGRAMME ACTUEL</p><h2>Semaine {getProgramWeek(profile?.program_started_at)}/6</h2><p>Maison · silhouette · cardio · pecs · abdos · cou · avant-bras</p></div></section>

    <section className="section-block"><div className="section-title"><h2>Notifications</h2><Bell size={20}/></div><button className={`notification-permission ${pushState==='active'?'enabled':''}`} onClick={onEnablePush}><span className="icon-orb blue"><Bell size={17}/></span><div><b>{pushState==='active'?'Notifications activées':'Activer les notifications'}</b><p>Eau, repas, séance et récupération.</p></div><ChevronRight size={18}/></button></section>

    <section className="section-block"><div className="section-title"><h2>Mon profil</h2><UserRound size={20}/></div><div className="grid-form"><label>Nom affiché<input value={draft?.display_name||''} onChange={e=>setDraft({...draft,display_name:e.target.value})}/></label><div className="split"><label>Poids kg<input value={draft?.weight_kg||''} onChange={e=>setDraft({...draft,weight_kg:e.target.value})}/></label><label>Taille cm<input value={draft?.height_cm||''} onChange={e=>setDraft({...draft,height_cm:e.target.value})}/></label></div><div className="split"><label>Heure séance<input type="time" value={draft?.preferred_workout_time?.slice?.(0,5)||'18:30'} onChange={e=>setDraft({...draft,preferred_workout_time:e.target.value})}/></label><label>Objectif eau<input inputMode="numeric" value={draft?.water_target_ml||2000} onChange={e=>setDraft({...draft,water_target_ml:e.target.value})}/></label></div><button className="primary-button small" onClick={()=>onSaveProfile(draft)}>Enregistrer</button></div></section>

    <section className="section-block"><div className="section-title"><h2>Équipement</h2><Dumbbell size={20}/></div><div className="equipment-grid">{equipmentOptions.map(([key,label])=><button type="button" key={key} className={(draft?.equipment||[]).includes(key)?'equipment-chip selected':'equipment-chip'} onClick={()=>toggleEquipment(key)}>{(draft?.equipment||[]).includes(key)?<Check size={15}/>:<Plus size={15}/>} {label}</button>)}</div><button className="primary-button small equipment-save" onClick={()=>onSaveProfile(draft)}>Sauvegarder</button></section>

    <section className="section-block recovery-card"><div className="section-title"><div><p className="eyebrow">RÉCUPÉRATION</p><h2>Comment tu te sens ?</h2></div><Moon size={20}/></div>{[['quality','Sommeil'],['fatigue','Fatigue'],['soreness','Courbatures']].map(([key,label])=><div className="rating-row" key={key}><div><b>{label}</b><span>{recovery[key]||'—'}/5</span></div><div className="rating-scale">{[1,2,3,4,5].map(n=><button type="button" key={n} className={recovery[key]===n?'active':''} onClick={()=>setRecovery({...recovery,[key]:n})}>{n}</button>)}</div></div>)}<button className="primary-button small recovery-save" onClick={()=>onSaveRecovery(recovery)}>Enregistrer</button></section>

    <section className="section-block"><div className="section-title"><h2>Rappels</h2><Clock3 size={20}/></div><div className="reminder-list">{defaults.map(d=>{const saved=reminders.find(r=>r.kind===d.kind);const item=saved||d;return <div className="reminder-row" key={d.kind}><span className="icon-orb dark">{d.kind==='water'?<Droplets size={16}/>:['breakfast','lunch','snack','dinner'].includes(d.kind)?<Utensils size={16}/>:d.kind==='sleep'?<Moon size={16}/>:<Dumbbell size={16}/>}</span><div><b>{item.title}</b><p>{item.repeat_every_minutes?`Toutes les ${Math.round(item.repeat_every_minutes/60)} h`:String(item.time_local).slice(0,5)}</p></div><button className={saved?.enabled===false?'toggle':'toggle on'} onClick={()=>onSaveReminder({...item,kind:d.kind,enabled:saved?!saved.enabled:true})}><i/></button></div>})}</div></section>

    <section className="install-card"><Smartphone size={22}/><div><b>Utilise One Fitness comme une vraie app</b><p>Sur iPhone : Partager → Sur l’écran d’accueil. L’app s’ouvrira sans la barre Safari.</p></div></section>
    <button className="logout-button" onClick={onLogout}><LogOut size={18}/> Se déconnecter</button>
  </>
}

function ActiveWorkout({ workout, week, day, exercises, onClose, onComplete }) {
  const bySlug=useMemo(()=>Object.fromEntries(exercises.map(e=>[e.slug,e])),[exercises])
  const restored=useMemo(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(WORKOUT_DRAFT_KEY)||'null')
      return saved && saved.week===week && saved.day===day ? saved : null
    }catch{return null}
  },[week,day])
  const [exerciseIndex,setExerciseIndex]=useState(restored?.exerciseIndex??0)
  const [setNo,setSetNo]=useState(restored?.setNo??1)
  const [phase,setPhase]=useState(restored?.phase||'prepare')
  const [running,setRunning]=useState(Boolean(restored?.running ?? true))
  const [secondsLeft,setSecondsLeft]=useState(restored?.secondsLeft??5)
  const [pending,setPending]=useState(restored?.pending||null)
  const [done,setDone]=useState(restored?.done||[])
  const [elapsed,setElapsed]=useState(restored?.elapsed||0)
  const [wakeState,setWakeState]=useState('activation')
  const startedAt=useRef(restored?.startedAt||Date.now())
  const wakeLockRef=useRef(null)
  const timerEndRef=useRef(Date.now()+5000)
  const autoStartRef=useRef(true)

  const item=workout.exercises[exerciseIndex]
  const exercise=bySlug[item?.slug]
  const isTimed=Boolean(item?.seconds)

  useEffect(()=>{
    if(!item||!exercise)return
    try{
      localStorage.setItem(WORKOUT_DRAFT_KEY,JSON.stringify({
        week,day,exerciseIndex,setNo,phase,running,secondsLeft,pending,done,elapsed,
        startedAt:startedAt.current,savedAt:Date.now(),
      }))
    }catch{}
  },[week,day,exerciseIndex,setNo,phase,running,secondsLeft,pending,done,elapsed,item,exercise])

  const requestWakeLock=async()=>{
    if(!('wakeLock' in navigator)){setWakeState('indisponible');return}
    try{
      if(wakeLockRef.current && !wakeLockRef.current.released){setWakeState('actif');return}
      wakeLockRef.current=await navigator.wakeLock.request('screen')
      setWakeState('actif')
      wakeLockRef.current.addEventListener('release',()=>setWakeState('pause'))
    }catch{
      setWakeState('pause')
    }
  }

  useEffect(()=>{
    primeAudio()
    requestWakeLock()
    const onVisibility=()=>{if(document.visibilityState==='visible')requestWakeLock()}
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{
      document.removeEventListener('visibilitychange',onVisibility)
      try{wakeLockRef.current?.release()}catch{}
    }
  },[])

  useEffect(()=>{
    if(phase!=='prepare'){
      const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-startedAt.current)/1000)),1000)
      return()=>clearInterval(timer)
    }
  },[phase])

  useEffect(()=>{
    if(phase==='work'){
      const target=item?.seconds||0
      setSecondsLeft(target)
      timerEndRef.current=null
      if(autoStartRef.current && target>0){
        autoStartRef.current=false
        setRunning(true)
      }else{
        setRunning(false)
      }
    }
  },[exerciseIndex,setNo,phase,item?.seconds])

  useEffect(()=>{
    if(!running||secondsLeft<=0)return
    timerEndRef.current=Date.now()+secondsLeft*1000
    const tick=()=>{
      const left=Math.max(0,Math.ceil((timerEndRef.current-Date.now())/1000))
      setSecondsLeft(left)
    }
    tick()
    const id=setInterval(tick,200)
    return()=>clearInterval(id)
  },[running,phase])

  useEffect(()=>{
    if(secondsLeft!==0||!running)return

    if(phase==='prepare'){
      playTimerTone('start')
      navigator.vibrate?.([70,45,70])
      startedAt.current=Date.now()
      setElapsed(0)
      setPhase('work')
      setRunning(false)
      return
    }

    if(phase==='work' && isTimed){
      playTimerTone('done')
      navigator.vibrate?.([90,50,90])
      setRunning(false)
      return
    }

    if(phase==='rest' && pending){
      playTimerTone('rest')
      navigator.vibrate?.([70,40,70])
      const nextIndex=pending==='exercise'?exerciseIndex+1:exerciseIndex
      autoStartRef.current=Boolean(workout.exercises[nextIndex]?.seconds)
      if(pending==='set') setSetNo(n=>n+1)
      if(pending==='exercise'){setExerciseIndex(nextIndex);setSetNo(1)}
      setPending(null)
      setPhase('work')
      setRunning(false)
    }
  },[secondsLeft,running,phase,pending,isTimed,item?.seconds,exerciseIndex,workout.exercises])

  if(!item||!exercise) return <div className="session-screen"><div className="session-error">Exercice indisponible.<button onClick={onClose}>Fermer</button></div></div>

  const totalSets=item.sets
  const completeSet=()=>{
    const entry={exercise,set_number:setNo,reps:item.reps||null,seconds:item.seconds||null}
    const next=[...done,entry]
    setDone(next)
    navigator.vibrate?.(35)
    const lastSet=setNo>=totalSets
    const lastExercise=exerciseIndex>=workout.exercises.length-1
    if(lastSet&&lastExercise){
      playTimerTone('done')
      navigator.vibrate?.([100,60,100,60,160])
      onComplete(next,elapsed,week,day)
      return
    }
    setPending(lastSet?'exercise':'set')
    setPhase('rest')
    setSecondsLeft(item.rest||45)
    setRunning(true)
  }

  const skipCurrentSet=(alreadyDone=false)=>{
    const entry={
      exercise,
      set_number:setNo,
      reps:alreadyDone?(item.reps||null):null,
      seconds:alreadyDone?(item.seconds||null):null,
      skipped:!alreadyDone,
      recovered:alreadyDone,
    }
    const next=[...done,entry]
    setDone(next)
    const lastSet=setNo>=totalSets
    const lastExercise=exerciseIndex>=workout.exercises.length-1
    if(lastSet&&lastExercise){
      onComplete(next,elapsed,week,day)
      return
    }
    setPending(null)
    timerEndRef.current=null
    if(lastSet){
      const nextIndex=exerciseIndex+1
      autoStartRef.current=Boolean(workout.exercises[nextIndex]?.seconds)
      setExerciseIndex(nextIndex)
      setSetNo(1)
    }else{
      autoStartRef.current=Boolean(item?.seconds)
      setSetNo(n=>n+1)
    }
    setPhase('work')
    setRunning(false)
  }

  const skipRest=()=>{
    setSecondsLeft(0)
    setRunning(true)
  }

  const toggleTimer=()=>{
    if(running){
      setRunning(false)
      timerEndRef.current=null
    }else{
      primeAudio()
      setRunning(true)
    }
  }

  const completedUnits=done.length
  const totalUnits=workout.exercises.reduce((sum,x)=>sum+x.sets,0)
  const sessionProgress=clamp(Math.round(completedUnits/Math.max(1,totalUnits)*100),0,100)

  if(phase==='prepare') return <div className="session-screen prepare-screen">
    <header className="session-header">
      <button className="session-close" onClick={onClose}><X size={20}/></button>
      <div><span>ÉCRAN</span><b className={wakeState==='actif'?'wake-active':''}>{wakeState==='actif'?'Éveillé':'En attente'}</b></div>
      <div><span>SÉANCE</span><b>{workout.duration}</b></div>
    </header>
    <main className="prepare-main">
      <div className="prepare-coach"><img src="/coach.svg" alt="Coach One Fitness"/></div>
      <p className="eyebrow">PRÉPARE-TOI</p>
      <h1>{workout.title}</h1>
      <div className="countdown-orb" aria-live="assertive">{secondsLeft}</div>
      <p>Place-toi correctement. La séance démarre automatiquement après le signal sonore.</p>
      <button className="prepare-skip" onClick={()=>{setSecondsLeft(0);setRunning(true)}}>Commencer maintenant</button>
    </main>
  </div>

  return <div className="session-screen">
    <header className="session-header">
      <button className="session-close" onClick={onClose}><X size={20}/></button>
      <div><span>DURÉE</span><b>{formatSeconds(elapsed)}</b></div>
      <div><span>ÉCRAN</span><b className={wakeState==='actif'?'wake-active':''}>{wakeState==='actif'?'Éveillé':wakeState}</b></div>
    </header>
    <div className="session-progress"><i style={{width:`${sessionProgress}%`}}/></div>

    <main className="session-main">
      <div className="session-meta"><span>Exercice {exerciseIndex+1}/{workout.exercises.length}</span><span>Série {setNo}/{totalSets}</span></div>
      <div className="session-exercise-icon"><Zap size={38}/></div>
      <p className="eyebrow">{exercise.category}</p>
      <h1>{exercise.name}</h1>
      <p className="session-target">{item.eachSide?'Chaque côté · ':''}{item.reps?`${item.reps} répétitions`:`${item.seconds} secondes`}</p>

      {phase==='work' ? <>
        {isTimed ? <div className="work-timer">
          <strong className={secondsLeft===0?'timer-finished':''}>{formatSeconds(secondsLeft)}</strong>
          <div className="timer-actions">
            {secondsLeft>0
              ? <button className="timer-play" onClick={toggleTimer}>{running?<Pause size={22}/>:<Play size={22}/>} {running?'Pause':'Reprendre'}</button>
              : <button className="timer-play" onClick={()=>{setSecondsLeft(item.seconds);setRunning(false)}}><TimerReset size={22}/> Refaire</button>}
            <button className="timer-done" onClick={completeSet} disabled={secondsLeft>0}><Check size={20}/> Série finie</button>
          </div>
        </div> : <button className="session-complete" onClick={completeSet}><Check size={22}/> Série terminée</button>}
        <div className="series-recovery-actions">
          <button onClick={()=>skipCurrentSet(true)}><Check size={16}/> Déjà faite</button>
          <button className="skip-series" onClick={()=>skipCurrentSet(false)}>Sauter la série <ChevronRight size={16}/></button>
        </div>
      </> : <div className="rest-panel">
        <span>REPOS</span>
        <strong>{formatSeconds(secondsLeft)}</strong>
        <p>La prochaine série démarre à la fin du chrono. Un signal te préviendra.</p>
        <div className="rest-actions">
          <button onClick={toggleTimer}>{running?'Pause':'Reprendre'}</button>
          <button onClick={skipRest}>Passer le repos</button>
        </div>
      </div>}

      <section className="session-howto"><h2>Technique</h2><ol>{(exercise.instructions||[]).slice(0,4).map((x,i)=><li key={i}>{x}</li>)}</ol>{exercise.safety_notes?.length>0&&<div className="session-safety"><ShieldCheck size={18}/><p>{exercise.safety_notes[0]}</p></div>}</section>
    </main>
  </div>
}

export default function App() {
  const [user,setUser]=useState(null)
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState(initialTab)
  const [exercises,setExercises]=useState([])
  const [waterMl,setWaterMl]=useState(0)
  const [meals,setMeals]=useState([])
  const [latest,setLatest]=useState(null)
  const [measurementHistory,setMeasurementHistory]=useState([])
  const [sessions,setSessions]=useState([])
  const [reminders,setReminders]=useState([])
  const [sleepLog,setSleepLog]=useState(null)
  const [pushState,setPushState]=useState('default')
  const [activeWorkout,setActiveWorkout]=useState(null)

  const appWakeLockRef=useRef(null)

  useEffect(()=>{
    let cancelled=false
    const keepAwake=async()=>{
      if(cancelled || document.visibilityState!=='visible' || !('wakeLock' in navigator)) return
      try{
        if(appWakeLockRef.current && !appWakeLockRef.current.released) return
        appWakeLockRef.current=await navigator.wakeLock.request('screen')
      }catch{}
    }
    keepAwake()
    const resume=()=>{if(document.visibilityState==='visible')keepAwake()}
    document.addEventListener('visibilitychange',resume)
    const firstInteraction=()=>{primeAudio();keepAwake()}
    window.addEventListener('pointerdown',firstInteraction,{once:true})
    return()=>{
      cancelled=true
      document.removeEventListener('visibilitychange',resume)
      window.removeEventListener('pointerdown',firstInteraction)
      try{appWakeLockRef.current?.release()}catch{}
    }
  },[])

  const changeTab=key=>{
    setTab(key)
    const url=new URL(window.location.href)
    url.searchParams.set('tab',key)
    history.replaceState({},'',url)
  }

  const loadData=async(currentUser=user)=>{
    if(!currentUser)return
    const today=startOfTodayISO()
    const [p,e,w,m,meas,s,r,sl]=await Promise.all([
      supabase.from(TABLE.profile).select('*').eq('user_id',currentUser.id).maybeSingle(),
      supabase.from(TABLE.exercises).select('*').order('category').order('name'),
      supabase.from(TABLE.water).select('amount_ml').eq('user_id',currentUser.id).gte('logged_at',today),
      supabase.from(TABLE.meals).select('*').eq('user_id',currentUser.id).gte('logged_at',today).order('logged_at'),
      supabase.from(TABLE.measurements).select('*').eq('user_id',currentUser.id).order('measured_at',{ascending:false}).limit(12),
      supabase.from(TABLE.sessions).select('*').eq('user_id',currentUser.id).not('completed_at','is',null).order('started_at',{ascending:false}).limit(50),
      supabase.from(TABLE.reminders).select('*').eq('user_id',currentUser.id).order('kind'),
      supabase.from(TABLE.sleep).select('*').eq('user_id',currentUser.id).eq('sleep_date',todayDateKey()).maybeSingle(),
    ])
    setProfile(p.data||null)
    setExercises(e.data||[])
    try{
      const saved=JSON.parse(localStorage.getItem(WORKOUT_DRAFT_KEY)||'null')
      if(saved?.week && Number.isInteger(saved?.day)){
        const savedWorkout=getWeekPlan(saved.week)?.[saved.day]
        if(savedWorkout) setActiveWorkout({workout:savedWorkout,week:saved.week,day:saved.day})
      }
    }catch{}
    setWaterMl((w.data||[]).reduce((a,x)=>a+x.amount_ml,0))
    setMeals(m.data||[])
    setMeasurementHistory([...(meas.data||[])].reverse())
    setLatest(meas.data?.[0]||null)
    setSessions(s.data||[])
    setReminders(r.data||[])
    setSleepLog(sl.data||null)
  }

  useEffect(()=>{
    let mounted=true
    supabase.auth.getUser().then(({data})=>{
      if(!mounted)return
      const u=data.user||null
      setUser(u)
      if(u)loadData(u).finally(()=>setLoading(false))
      else setLoading(false)
    })
    getOneFitnessPushState().then(setPushState).catch(()=>{})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const u=session?.user||null
      setUser(u)
      if(u)loadData(u)
      else{setProfile(null);setTab('home')}
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  const enablePush=async()=>{
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone
    const isiOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)
    if(isiOS&&!standalone){
      alert('Sur iPhone : appuie sur Partager puis « Sur l’écran d’accueil ». Ouvre ensuite One Fitness depuis l’icône et active les notifications.')
      return
    }
    try{const r=await enableOneFitnessPush();setPushState(r.ok?'active':r.state)}catch(e){alert(e?.message||'Impossible d’activer les notifications.')}
  }

  const addWater=async amount=>{if(!user)return;const {error}=await supabase.from(TABLE.water).insert({user_id:user.id,amount_ml:amount});if(!error)setWaterMl(v=>v+amount)}
  const addMeal=async meal=>{if(!user)return;const {data,error}=await supabase.from(TABLE.meals).insert({user_id:user.id,...meal}).select().single();if(!error)setMeals(v=>[...v,data])}
  const addMeasurement=async raw=>{if(!user)return;const payload={user_id:user.id};Object.entries(raw).forEach(([k,v])=>{payload[k]=v===''?null:Number(v)});const {data,error}=await supabase.from(TABLE.measurements).insert(payload).select().single();if(!error){setLatest(data);setMeasurementHistory(v=>[...v,data].slice(-12))}}
  const saveProfile=async draft=>{if(!user)return;const payload={...draft,user_id:user.id,weight_kg:draft.weight_kg?Number(draft.weight_kg):null,height_cm:draft.height_cm?Number(draft.height_cm):null,water_target_ml:Number(draft.water_target_ml)||2000};const {data,error}=await supabase.from(TABLE.profile).upsert(payload).select().single();if(!error)setProfile(data)}
  const saveReminder=async item=>{if(!user)return;const payload={user_id:user.id,kind:item.kind,title:item.title,body:item.body||'',time_local:String(item.time_local).slice(0,5),days_of_week:item.days_of_week||[0,1,2,3,4,5,6],enabled:item.enabled!==false,repeat_every_minutes:item.repeat_every_minutes||null,window_start:item.window_start?String(item.window_start).slice(0,5):null,window_end:item.window_end?String(item.window_end).slice(0,5):null,target_path:item.target_path||'/'};const existing=reminders.find(r=>r.kind===item.kind);const q=supabase.from(TABLE.reminders);const {data,error}=existing?await q.update(payload).eq('id',existing.id).select().single():await q.insert(payload).select().single();if(!error)setReminders(v=>[...v.filter(r=>r.kind!==item.kind),data])}
  const saveRecovery=async values=>{if(!user)return;const payload={user_id:user.id,sleep_date:todayDateKey(),quality:Number(values.quality)||null,fatigue:Number(values.fatigue)||null,soreness:Number(values.soreness)||null};const {data,error}=await supabase.from(TABLE.sleep).upsert(payload,{onConflict:'user_id,sleep_date'}).select().single();if(!error)setSleepLog(data)}
  const completeWorkout=async(done,elapsed,week,day)=>{
    if(!user)return
    const now=new Date()
    const started=new Date(now.getTime()-elapsed*1000)
    const workout=activeWorkout.workout
    const {data:session,error}=await supabase.from(TABLE.sessions).insert({
      user_id:user.id,title:workout.title,started_at:started.toISOString(),completed_at:now.toISOString(),
      duration_seconds:elapsed,program_week:week,program_day:day,completion_percent:100,
    }).select().single()
    if(!error&&session){
      const rows=done.map(x=>({session_id:session.id,user_id:user.id,exercise_id:x.exercise.id,set_number:x.set_number,reps:x.reps,seconds:x.seconds,completed:true}))
      if(rows.length)await supabase.from(TABLE.sets).insert(rows)
      setSessions(v=>[session,...v])
    }
    setActiveWorkout(null)
    changeTab('progress')
  }

  if(loading)return <main className="loading-screen"><img src="/icon.svg" alt="One Fitness"/><Spinner/></main>
  if(!user)return <AuthScreen/>
  if(!profile?.onboarding_complete)return <Onboarding user={user} onDone={p=>{setProfile(p);loadData(user)}}/>

  const {week,day,workout}=getTodayWorkout(profile.program_started_at)

  return <div className="app-shell"><main className="mobile-app">
    <div className="content-scroll">
      {tab==='home'&&<HomeScreen profile={profile} waterMl={waterMl} meals={meals} sessions={sessions} sleepLog={sleepLog} pushState={pushState} onEnablePush={enablePush} onWater={addWater} onStart={()=>{primeAudio();setActiveWorkout({workout,week,day})}} onTab={changeTab}/>}
      {tab==='workout'&&<WorkoutScreen profile={profile} exercises={exercises} sessions={sessions} onStartWorkout={(w,wk,d)=>{primeAudio();setActiveWorkout({workout:w,week:wk,day:d})}}/>}
      {tab==='nutrition'&&<NutritionScreen profile={profile} waterMl={waterMl} meals={meals} onWater={addWater} onAddMeal={addMeal}/>}
      {tab==='progress'&&<ProgressScreen latest={latest} measurementHistory={measurementHistory} sessions={sessions} onAddMeasurement={addMeasurement}/>}
      {tab==='profile'&&<ProfileScreen profile={profile} reminders={reminders} sleepLog={sleepLog} pushState={pushState} onEnablePush={enablePush} onSaveProfile={saveProfile} onSaveReminder={saveReminder} onSaveRecovery={saveRecovery} onLogout={()=>supabase.auth.signOut()}/>}
    </div>
    <nav className="bottom-nav">{tabs.map(([key,Icon,label])=><button key={key} className={tab===key?'active':''} onClick={()=>changeTab(key)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {activeWorkout&&<ActiveWorkout workout={activeWorkout.workout} week={activeWorkout.week} day={activeWorkout.day} exercises={exercises} onClose={()=>setActiveWorkout(null)} onComplete={completeWorkout}/>}
  </main></div>
}
