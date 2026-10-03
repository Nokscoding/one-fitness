import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Apple, Bell, CalendarDays, Check, ChevronRight, Clock3, Droplets, Dumbbell,
  Flame, Home, LogOut, Moon, Play, Plus, Settings, ShieldCheck, Sparkles, Target,
  UserRound, Utensils, Weight, X, Zap,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { enableOneFitnessPush, getOneFitnessPushState } from './lib/push'
import { mealMoments, starterWeek } from './starterPlan'

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
  ['workout', Dumbbell, 'Séance'],
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
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><img src="/icon.svg" alt=""/><span><b>One</b> Fitness</span></div>
}

function Spinner() { return <div className="spinner" aria-label="Chargement"/> }

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const sendLink = async (e) => {
    e.preventDefault(); setLoading(true); setStatus('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setStatus(error ? error.message : 'Lien envoyé. Ouvre ton e-mail pour te connecter.')
    setLoading(false)
  }
  return <main className="auth-screen">
    <div className="auth-card">
      <Brand />
      <img className="auth-coach" src="/coach.svg" alt="Coach One Fitness"/>
      <p className="eyebrow">TON COACH PERSONNEL</p>
      <h1>Entraînement, cardio, alimentation et récupération au même endroit.</h1>
      <p className="muted">Connexion par lien sécurisé. Tes données One Fitness restent séparées des données NKS.</p>
      <form onSubmit={sendLink} className="auth-form">
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" required />
        <button className="primary-button" disabled={loading}>{loading ? 'Envoi…' : 'Recevoir le lien'}</button>
      </form>
      {status && <p className="status-note">{status}</p>}
    </div>
  </main>
}

function Onboarding({ user, onDone }) {
  const [form, setForm] = useState({ display_name: '', height_cm: '', weight_kg: '', preferred_workout_time: '18:30', water_target_ml: 2000 })
  const [saving, setSaving] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    const payload = {
      user_id: user.id,
      display_name: form.display_name || 'Noks',
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      preferred_workout_time: form.preferred_workout_time || null,
      water_target_ml: Number(form.water_target_ml) || 2000,
      onboarding_complete: true,
    }
    const { data, error } = await supabase.from(TABLE.profile).upsert(payload).select().single()
    setSaving(false)
    if (!error) onDone(data)
  }
  return <main className="onboarding">
    <section className="onboarding-card">
      <Brand />
      <div className="coach-bubble"><img src="/coach.svg" alt="Coach"/><div><b>On prépare ton point de départ.</b><span>Tu pourras modifier ces infos plus tard.</span></div></div>
      <h1>Ton profil One Fitness</h1>
      <form onSubmit={save} className="grid-form">
        <label>Prénom / nom à afficher<input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="Noks" /></label>
        <div className="split"><label>Taille (cm)<input inputMode="decimal" value={form.height_cm} onChange={e=>setForm({...form,height_cm:e.target.value})} /></label><label>Poids (kg)<input inputMode="decimal" value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})} /></label></div>
        <div className="split"><label>Heure préférée<input type="time" value={form.preferred_workout_time} onChange={e=>setForm({...form,preferred_workout_time:e.target.value})}/></label><label>Objectif eau (ml)<input inputMode="numeric" value={form.water_target_ml} onChange={e=>setForm({...form,water_target_ml:e.target.value})}/></label></div>
        <div className="goal-box"><Target size={18}/><div><b>Objectif principal</b><span>Meilleure silhouette · cou et avant-bras plus épais · pecs · abdos · cardio</span></div></div>
        <div className="goal-box"><Dumbbell size={18}/><div><b>Matériel actuel</b><span>Hand gripper · corde à sauter · poids du corps</span></div></div>
        <button className="primary-button" disabled={saving}>{saving ? 'Création…' : 'Créer mon coach'}</button>
      </form>
    </section>
  </main>
}

function StatPill({ icon: Icon, label, value }) { return <div className="stat-pill"><Icon size={17}/><div><b>{value}</b><span>{label}</span></div></div> }

function HomeScreen({ profile, exercises, waterMl, meals, sessions, onWater, onStart, onTab }) {
  const today = starterWeek[new Date().getDay()]
  const target = profile?.water_target_ml || 2000
  const waterPercent = clamp(Math.round((waterMl / target) * 100), 0, 100)
  const name = profile?.display_name || 'Noks'
  return <>
    <header className="topbar">
      <div><p className="tiny">{formatDate()}</p><h1>Salut, {name} 👋</h1><p className="muted">Ton coach a préparé ta journée.</p></div>
      <div className="profile-stack"><img src="/coach.svg" alt="Coach"/><button className="icon-button" onClick={()=>onTab('profile')}><Bell size={20}/><i/></button></div>
    </header>

    <section className="hero-card">
      <div className="hero-content"><span className="pill-label">SÉANCE DU JOUR</span><h2>{today.title}</h2><p>{today.subtitle}</p>
      <div className="hero-tags"><span><Clock3 size={15}/> {today.exercises.length ? '20–35 min' : 'Repos'}</span><span><Home size={15}/> Maison</span></div>
      {today.exercises.length ? <button className="white-button" onClick={onStart}>Commencer <ChevronRight size={18}/></button> : <button className="white-button" onClick={()=>onTab('progress')}>Voir mes progrès <ChevronRight size={18}/></button>}</div>
      <img src="/coach.svg" alt="Coach One Fitness" className="hero-coach"/>
    </section>

    <section className="metric-grid">
      <article className="metric-card water"><div className="metric-head"><span className="icon-orb blue"><Droplets size={18}/></span><b>Hydratation</b><button onClick={()=>onWater(250)}>+250</button></div><div className="metric-big">{(waterMl/1000).toFixed(1)} L <small>/ {(target/1000).toFixed(1)} L</small></div><div className="progress-track"><i style={{width:`${waterPercent}%`}}/></div><p>{waterPercent >= 100 ? 'Objectif atteint ✓' : `${100-waterPercent}% restant aujourd’hui`}</p></article>
      <article className="metric-card"><div className="metric-head"><span className="icon-orb dark"><Utensils size={18}/></span><b>Repas</b><button onClick={()=>onTab('nutrition')}>Voir</button></div><div className="metric-big">{meals.length} <small>/ 4</small></div><p>{meals.length ? 'Continue à noter tes repas.' : 'Commence par ton prochain repas.'}</p><div className="meal-dots">{mealMoments.map((m,i)=><i key={m.key} className={i<meals.length?'done':''}/>)}</div></article>
      <article className="metric-card"><div className="metric-head"><span className="icon-orb blue"><Activity size={18}/></span><b>Progrès</b><button onClick={()=>onTab('progress')}>Voir</button></div><div className="metric-big">{sessions.length} <small>séances</small></div><p>Historique enregistré dans ton espace personnel.</p></article>
      <article className="metric-card"><div className="metric-head"><span className="icon-orb dark"><Bell size={18}/></span><b>Rappels</b><button onClick={()=>onTab('profile')}>Gérer</button></div><ul className="mini-list"><li><Dumbbell size={15}/> Séance <span>{profile?.preferred_workout_time?.slice?.(0,5) || '18:30'}</span></li><li><Droplets size={15}/> Eau <span>régulier</span></li><li><Moon size={15}/> Récupération <span>soir</span></li></ul></article>
    </section>

    <section className="section-block"><div className="section-title"><div><p className="eyebrow">COACH</p><h2>Conseil du jour</h2></div><Sparkles size={22}/></div><div className="coach-message"><img src="/coach.svg" alt="Coach"/><p>{today.exercises.some(x=>x.slug.includes('neck')) ? 'Pour la nuque : résistance légère et contrôle total. Aucun mouvement brusque. La qualité passe avant la force.' : 'Le plus important aujourd’hui : terminer proprement la séance prévue. On augmente la difficulté seulement quand la technique reste bonne.'}</p></div></section>
  </>
}

function WorkoutScreen({ exercises, onStart }) {
  const days = Object.entries(starterWeek).sort((a,b)=>Number(a[0])-Number(b[0]))
  const bySlug = Object.fromEntries(exercises.map(e=>[e.slug,e]))
  return <>
    <header className="screen-header"><div><p className="eyebrow">PROGRAMME MAISON</p><h1>Mes séances</h1><p className="muted">Poids du corps + hand gripper + corde à sauter.</p></div><span className="big-icon"><Dumbbell/></span></header>
    <section className="today-workout">
      <div><span className="pill-label dark-pill">AUJOURD’HUI</span><h2>{starterWeek[new Date().getDay()].title}</h2><p>{starterWeek[new Date().getDay()].subtitle}</p></div>
      {starterWeek[new Date().getDay()].exercises.length ? <button className="primary-button small" onClick={onStart}><Play size={17}/> Démarrer</button> : <span className="rest-badge">Repos</span>}
    </section>
    <section className="week-list">
      {days.map(([day,data])=><article key={day} className={`day-card ${Number(day)===new Date().getDay()?'active':''}`}><div className="day-number">{['D','L','M','M','J','V','S'][day]}</div><div className="day-body"><b>{data.title}</b><span>{data.exercises.length ? data.exercises.map(x=>bySlug[x.slug]?.name || x.slug).slice(0,3).join(' · ') : data.subtitle}</span></div><span>{data.exercises.length} ex.</span></article>)}
    </section>
    <section className="section-block"><div className="section-title"><h2>Bibliothèque</h2><span>{exercises.length} exercices</span></div><div className="exercise-grid">{exercises.map(ex=><details className="exercise-card" key={ex.id}><summary><span className="icon-orb blue"><Zap size={17}/></span><div><b>{ex.name}</b><small>{ex.category} · {ex.difficulty}</small></div><ChevronRight size={18}/></summary><div className="exercise-detail"><h4>Comment faire</h4><ol>{(ex.instructions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol>{ex.safety_notes?.length>0&&<div className="safety"><ShieldCheck size={17}/><div><b>À retenir</b>{ex.safety_notes.map((x,i)=><p key={i}>{x}</p>)}</div></div>}</div></details>)}</div></section>
  </>
}

function NutritionScreen({ profile, waterMl, meals, onWater, onAddMeal }) {
  const [meal, setMeal] = useState({ meal_type:'lunch', title:'' })
  const target = profile?.water_target_ml || 2000
  const submit = (e) => { e.preventDefault(); if (!meal.title.trim()) return; onAddMeal(meal).then(()=>setMeal({...meal,title:''})) }
  return <>
    <header className="screen-header"><div><p className="eyebrow">ALIMENTATION & EAU</p><h1>Nutrition</h1><p className="muted">On suit tes habitudes sans te compliquer la journée.</p></div><span className="big-icon"><Apple/></span></header>
    <section className="hydration-banner"><div><Droplets size={28}/><p>Hydratation aujourd’hui</p><h2>{waterMl} ml <small>/ {target} ml</small></h2></div><div className="water-actions"><button onClick={()=>onWater(250)}>+250 ml</button><button onClick={()=>onWater(500)}>+500 ml</button></div></section>
    <section className="section-block"><div className="section-title"><h2>Repas du jour</h2><span>{meals.length}/4 notés</span></div><div className="meal-timeline">{mealMoments.map(m=>{const found=meals.find(x=>x.meal_type===m.key);return <div className={`meal-row ${found?'done':''}`} key={m.key}><span className="meal-time">{m.time}</span><span className="meal-check">{found?<Check size={16}/>:<Utensils size={16}/>}</span><div><b>{m.label}</b><p>{found ? found.title || 'Repas enregistré' : 'À enregistrer'}</p></div></div>})}</div></section>
    <section className="section-block"><div className="section-title"><h2>Ajouter un repas</h2><Plus size={20}/></div><form className="quick-form" onSubmit={submit}><select value={meal.meal_type} onChange={e=>setMeal({...meal,meal_type:e.target.value})}>{mealMoments.map(m=><option value={m.key} key={m.key}>{m.label}</option>)}</select><input value={meal.title} onChange={e=>setMeal({...meal,title:e.target.value})} placeholder="Ex. riz, poulet, légumes"/><button className="primary-button small">Enregistrer</button></form></section>
    <section className="coach-message nutrition-tip"><img src="/coach.svg" alt="Coach"/><p>Pour construire du muscle, cherche surtout la régularité : une source de protéines à plusieurs repas, des féculents selon ta faim et ton activité, des fruits/légumes et assez d’eau. Pas besoin de manger “parfait”.</p></section>
  </>
}

function ProgressScreen({ latest, sessions, onAddMeasurement }) {
  const [open,setOpen]=useState(false)
  const [m,setM]=useState({weight_kg:'',neck_cm:'',forearm_left_cm:'',forearm_right_cm:'',chest_cm:'',waist_cm:'',pushups_max:'',plank_seconds:'',jump_rope_seconds:''})
  const save=async(e)=>{e.preventDefault();await onAddMeasurement(m);setOpen(false)}
  return <>
    <header className="screen-header"><div><p className="eyebrow">TRANSFORMATION</p><h1>Mes progrès</h1><p className="muted">Mensurations, performances et régularité.</p></div><span className="big-icon"><Activity/></span></header>
    <section className="progress-hero"><div><p>Séances enregistrées</p><strong>{sessions.length}</strong></div><div><p>Dernier tour de cou</p><strong>{latest?.neck_cm ? `${latest.neck_cm} cm` : '—'}</strong></div><div><p>Avant-bras droit</p><strong>{latest?.forearm_right_cm ? `${latest.forearm_right_cm} cm` : '—'}</strong></div></section>
    <section className="section-block"><div className="section-title"><h2>Dernières mesures</h2><button className="text-button" onClick={()=>setOpen(true)}><Plus size={16}/> Ajouter</button></div><div className="measure-grid"><StatPill icon={Weight} label="Poids" value={latest?.weight_kg?`${latest.weight_kg} kg`:'—'}/><StatPill icon={Target} label="Poitrine" value={latest?.chest_cm?`${latest.chest_cm} cm`:'—'}/><StatPill icon={Flame} label="Pompes max" value={latest?.pushups_max||'—'}/><StatPill icon={Clock3} label="Planche" value={latest?.plank_seconds?`${latest.plank_seconds}s`:'—'}/></div></section>
    <section className="section-block"><div className="section-title"><h2>Historique récent</h2><CalendarDays size={20}/></div>{sessions.length ? <div className="session-list">{sessions.slice(0,6).map(s=><div className="session-row" key={s.id}><span className="icon-orb blue"><Check size={16}/></span><div><b>{s.title}</b><p>{new Date(s.started_at).toLocaleDateString('fr-FR')}</p></div><span>{s.duration_seconds?`${Math.round(s.duration_seconds/60)} min`:'Terminé'}</span></div>)}</div> : <div className="empty-state">Ta première séance terminée apparaîtra ici.</div>}</section>
    {open&&<div className="modal-backdrop"><form className="modal measurement-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">NOUVELLE MESURE</p><h2>Point de progression</h2></div><button type="button" className="icon-button" onClick={()=>setOpen(false)}><X/></button></div><div className="split"><label>Poids kg<input inputMode="decimal" value={m.weight_kg} onChange={e=>setM({...m,weight_kg:e.target.value})}/></label><label>Cou cm<input inputMode="decimal" value={m.neck_cm} onChange={e=>setM({...m,neck_cm:e.target.value})}/></label></div><div className="split"><label>Avant-bras G<input inputMode="decimal" value={m.forearm_left_cm} onChange={e=>setM({...m,forearm_left_cm:e.target.value})}/></label><label>Avant-bras D<input inputMode="decimal" value={m.forearm_right_cm} onChange={e=>setM({...m,forearm_right_cm:e.target.value})}/></label></div><div className="split"><label>Poitrine cm<input inputMode="decimal" value={m.chest_cm} onChange={e=>setM({...m,chest_cm:e.target.value})}/></label><label>Taille cm<input inputMode="decimal" value={m.waist_cm} onChange={e=>setM({...m,waist_cm:e.target.value})}/></label></div><div className="split"><label>Pompes max<input inputMode="numeric" value={m.pushups_max} onChange={e=>setM({...m,pushups_max:e.target.value})}/></label><label>Planche sec<input inputMode="numeric" value={m.plank_seconds} onChange={e=>setM({...m,plank_seconds:e.target.value})}/></label></div><button className="primary-button">Enregistrer</button></form></div>}
  </>
}

function ProfileScreen({ profile, reminders, onSaveProfile, onSaveReminder, onLogout }) {
  const [draft,setDraft]=useState(profile)
  const [notificationState,setNotificationState]=useState(typeof Notification!=='undefined'?Notification.permission:'unsupported')
  const [notificationMessage,setNotificationMessage]=useState('')
  useEffect(()=>setDraft(profile),[profile])
  useEffect(()=>{
    let active=true
    getOneFitnessPushState().then(state=>{if(active)setNotificationState(state)}).catch(()=>{})
    return()=>{active=false}
  },[])

  const requestNotifications=async()=>{
    try {
      setNotificationMessage('Activation…')
      const result=await enableOneFitnessPush()
      setNotificationState(result.state)
      setNotificationMessage(result.message||'')
    } catch (error) {
      setNotificationMessage(error?.message || 'Impossible d’activer les notifications.')
    }
  }

  const defaults=[
    {kind:'workout',title:'Séance One Fitness',body:'C’est l’heure de ta séance.',time_local:profile?.preferred_workout_time?.slice?.(0,5)||'18:30',target_path:'/?tab=workout'},
    {kind:'water',title:'Hydratation',body:'Pense à boire un peu d’eau.',time_local:'08:30',repeat_every_minutes:120,window_start:'08:30',window_end:'22:30',target_path:'/?tab=nutrition'},
    {kind:'breakfast',title:'Petit-déjeuner',body:'Ton petit-déjeuner est prévu maintenant.',time_local:'08:00',target_path:'/?tab=nutrition'},
    {kind:'lunch',title:'Déjeuner',body:'C’est l’heure de ton déjeuner.',time_local:'13:00',target_path:'/?tab=nutrition'},
    {kind:'snack',title:'Collation',body:'Ta collation est prévue maintenant.',time_local:'17:00',target_path:'/?tab=nutrition'},
    {kind:'dinner',title:'Dîner',body:'C’est l’heure de ton dîner.',time_local:'20:30',target_path:'/?tab=nutrition'},
    {kind:'sleep',title:'Récupération',body:'Prépare ton sommeil pour mieux récupérer.',time_local:'22:30',target_path:'/?tab=profile'},
  ]
  const saveDraft=()=>onSaveProfile(draft)
  const reminderIcon=(kind)=>{
    if(kind==='water') return <Droplets size={16}/>
    if(['breakfast','lunch','snack','dinner'].includes(kind)) return <Utensils size={16}/>
    if(kind==='sleep') return <Moon size={16}/>
    return <Dumbbell size={16}/>
  }
  const reminderTime=(item)=>{
    if(item.repeat_every_minutes) return `Toutes les ${Math.round(item.repeat_every_minutes/60)} h · ${String(item.window_start||item.time_local).slice(0,5)}–${String(item.window_end||'22:30').slice(0,5)}`
    return String(item.time_local).slice(0,5)
  }

  return <>
    <header className="screen-header"><div><p className="eyebrow">TON ESPACE</p><h1>Profil & rappels</h1><p className="muted">Tes réglages One Fitness uniquement.</p></div><span className="big-icon"><Settings/></span></header>
    <section className="profile-card"><img src="/coach.svg" alt="Coach One Fitness"/><div><p className="eyebrow">OBJECTIF</p><h2>Meilleure silhouette</h2><p>Cou · avant-bras · poignets · pecs · abdos · cardio</p></div></section>
    <section className="section-block"><div className="section-title"><h2>Mon profil</h2><UserRound size={20}/></div><div className="grid-form"><label>Nom affiché<input value={draft?.display_name||''} onChange={e=>setDraft({...draft,display_name:e.target.value})}/></label><div className="split"><label>Poids kg<input value={draft?.weight_kg||''} onChange={e=>setDraft({...draft,weight_kg:e.target.value})}/></label><label>Taille cm<input value={draft?.height_cm||''} onChange={e=>setDraft({...draft,height_cm:e.target.value})}/></label></div><label>Heure d’entraînement<input type="time" value={draft?.preferred_workout_time?.slice?.(0,5)||'18:30'} onChange={e=>setDraft({...draft,preferred_workout_time:e.target.value})}/></label><label>Objectif eau ml<input inputMode="numeric" value={draft?.water_target_ml||2000} onChange={e=>setDraft({...draft,water_target_ml:e.target.value})}/></label><button className="primary-button small" onClick={saveDraft}>Enregistrer</button></div></section>
    <section className="section-block"><div className="section-title"><h2>Équipement</h2><Dumbbell size={20}/></div><div className="chip-row"><span className="selected">✓ Hand gripper</span><span className="selected">✓ Corde à sauter</span><span>Poids du corps</span><span className="locked">+ Haltères plus tard</span></div></section>
    <section className="section-block">
      <div className="section-title"><h2>Rappels</h2><Bell size={20}/></div>
      <button className="notification-permission" onClick={requestNotifications}>
        <span className="icon-orb blue"><Bell size={17}/></span>
        <div><b>Notifications de l’app</b><p>État : {notificationState==='active'?'activées':notificationState}</p>{notificationMessage&&<p>{notificationMessage}</p>}</div>
        <ChevronRight size={18}/>
      </button>
      <div className="reminder-list">{defaults.map(d=>{
        const saved=reminders.find(r=>r.kind===d.kind)
        const item=saved||d
        return <div className="reminder-row" key={d.kind}>
          <span className="icon-orb dark">{reminderIcon(d.kind)}</span>
          <div><b>{item.title}</b><p>{reminderTime(item)}</p></div>
          <button className={saved?.enabled===false?'toggle':'toggle on'} onClick={()=>onSaveReminder({...item,kind:d.kind,enabled:saved? !saved.enabled:true})}><i/></button>
        </div>
      })}</div>
      <p className="fine-print">Sur iPhone, ajoute One Fitness à l’écran d’accueil puis autorise les notifications. Les rappels sont isolés dans les tables One Fitness et peuvent fonctionner même lorsque la web-app est fermée une fois le push activé.</p>
    </section>
    <button className="logout-button" onClick={onLogout}><LogOut size={18}/> Se déconnecter</button>
  </>
}

function WorkoutModal({ workout, exercises, user, onClose, onComplete }) {
  const bySlug=Object.fromEntries(exercises.map(e=>[e.slug,e]))
  const [index,setIndex]=useState(0); const [setNo,setSetNo]=useState(1); const [done,setDone]=useState([]); const [timer,setTimer]=useState(null)
  const item=workout.exercises[index]; const ex=bySlug[item?.slug]
  useEffect(()=>{ if(timer===0) setTimer(null); if(timer>0){const t=setTimeout(()=>setTimer(timer-1),1000);return()=>clearTimeout(t)} },[timer])
  if(!item||!ex) return <div className="modal-backdrop"><div className="modal"><button className="icon-button" onClick={onClose}><X/></button><p>Exercice indisponible.</p></div></div>
  const total=item.sets; const target=item.reps?`${item.reps} répétitions${item.eachSide?' / côté':''}`:`${item.seconds}s${item.eachSide?' / côté':''}`
  const completeSet=()=>{const next=[...done,{exercise:ex,set_number:setNo,reps:item.reps||null,seconds:item.seconds||null}];setDone(next);if(setNo<total){setSetNo(setNo+1);setTimer(item.rest||45)}else if(index<workout.exercises.length-1){setIndex(index+1);setSetNo(1);setTimer(item.rest||45)}else onComplete(next)}
  return <div className="modal-backdrop"><div className="modal workout-modal"><div className="modal-head"><div><p className="eyebrow">EXERCICE {index+1}/{workout.exercises.length}</p><h2>{ex.name}</h2></div><button className="icon-button" onClick={onClose}><X/></button></div><div className="set-ring"><span>{setNo}/{total}</span><small>séries</small></div><h3>{target}</h3>{timer!==null?<div className="rest-timer"><p>Repos</p><strong>00:{String(timer).padStart(2,'0')}</strong><button onClick={()=>setTimer(null)}>Passer</button></div>:<button className="primary-button" onClick={completeSet}><Check size={18}/> Série terminée</button>}<div className="howto"><h4>Comment faire</h4><ol>{ex.instructions.map((x,i)=><li key={i}>{x}</li>)}</ol>{ex.safety_notes?.length>0&&<div className="safety"><ShieldCheck size={17}/><div>{ex.safety_notes.map((x,i)=><p key={i}>{x}</p>)}</div></div>}</div></div></div>
}

export default function App() {
  const [user,setUser]=useState(null); const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState(initialTab)
  const [exercises,setExercises]=useState([]); const [waterMl,setWaterMl]=useState(0); const [meals,setMeals]=useState([]); const [latest,setLatest]=useState(null); const [sessions,setSessions]=useState([]); const [reminders,setReminders]=useState([]); const [workoutOpen,setWorkoutOpen]=useState(false)

  const loadData=async(currentUser=user)=>{
    if(!currentUser) return
    const today=startOfTodayISO()
    const [p,e,w,m,meas,s,r]=await Promise.all([
      supabase.from(TABLE.profile).select('*').eq('user_id',currentUser.id).maybeSingle(),
      supabase.from(TABLE.exercises).select('*').order('category').order('name'),
      supabase.from(TABLE.water).select('amount_ml').eq('user_id',currentUser.id).gte('logged_at',today),
      supabase.from(TABLE.meals).select('*').eq('user_id',currentUser.id).gte('logged_at',today).order('logged_at'),
      supabase.from(TABLE.measurements).select('*').eq('user_id',currentUser.id).order('measured_at',{ascending:false}).limit(1),
      supabase.from(TABLE.sessions).select('*').eq('user_id',currentUser.id).not('completed_at','is',null).order('started_at',{ascending:false}).limit(20),
      supabase.from(TABLE.reminders).select('*').eq('user_id',currentUser.id).order('kind'),
    ])
    setProfile(p.data||null); setExercises(e.data||[]); setWaterMl((w.data||[]).reduce((a,x)=>a+x.amount_ml,0)); setMeals(m.data||[]); setLatest(meas.data?.[0]||null); setSessions(s.data||[]); setReminders(r.data||[])
  }

  useEffect(()=>{
    let mounted=true
    supabase.auth.getUser().then(({data})=>{if(!mounted)return;setUser(data.user||null);if(data.user)loadData(data.user).finally(()=>setLoading(false));else setLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{const u=session?.user||null;setUser(u);if(u)loadData(u);else{setProfile(null);setTab('home')}})
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  const addWater=async(amount)=>{if(!user)return;const {error}=await supabase.from(TABLE.water).insert({user_id:user.id,amount_ml:amount});if(!error)setWaterMl(v=>v+amount)}
  const addMeal=async(meal)=>{if(!user)return;const {data,error}=await supabase.from(TABLE.meals).insert({user_id:user.id,...meal}).select().single();if(!error)setMeals(v=>[...v,data])}
  const addMeasurement=async(raw)=>{if(!user)return;const payload={user_id:user.id};Object.entries(raw).forEach(([k,v])=>{payload[k]=v===''?null:Number(v)});const {data,error}=await supabase.from(TABLE.measurements).insert(payload).select().single();if(!error)setLatest(data)}
  const saveProfile=async(draft)=>{if(!user)return;const payload={...draft,user_id:user.id,weight_kg:draft.weight_kg?Number(draft.weight_kg):null,height_cm:draft.height_cm?Number(draft.height_cm):null,water_target_ml:Number(draft.water_target_ml)||2000};const {data,error}=await supabase.from(TABLE.profile).upsert(payload).select().single();if(!error)setProfile(data)}
  const saveReminder=async(item)=>{if(!user)return;const payload={user_id:user.id,kind:item.kind,title:item.title,body:item.body||'',time_local:String(item.time_local).slice(0,5),days_of_week:item.days_of_week||[0,1,2,3,4,5,6],enabled:item.enabled!==false,repeat_every_minutes:item.repeat_every_minutes||null,window_start:item.window_start?String(item.window_start).slice(0,5):null,window_end:item.window_end?String(item.window_end).slice(0,5):null,target_path:item.target_path||'/'};let q=supabase.from(TABLE.reminders);const existing=reminders.find(r=>r.kind===item.kind);const {data,error}=existing?await q.update(payload).eq('id',existing.id).select().single():await q.insert(payload).select().single();if(!error)setReminders(v=>[...v.filter(r=>r.kind!==item.kind),data])}
  const completeWorkout=async(done)=>{if(!user)return;const now=new Date();const {data:session,error}=await supabase.from(TABLE.sessions).insert({user_id:user.id,title:starterWeek[now.getDay()].title,completed_at:now.toISOString(),duration_seconds:null}).select().single();if(!error&&session){const rows=done.map(x=>({session_id:session.id,user_id:user.id,exercise_id:x.exercise.id,set_number:x.set_number,reps:x.reps,seconds:x.seconds,completed:true}));if(rows.length)await supabase.from(TABLE.sets).insert(rows);setSessions(v=>[session,...v])}setWorkoutOpen(false);setTab('progress')}

  if(loading) return <main className="loading-screen"><img src="/icon.svg" alt="One Fitness"/><Spinner/></main>
  if(!user) return <AuthScreen/>
  if(!profile?.onboarding_complete) return <Onboarding user={user} onDone={p=>{setProfile(p);loadData(user)}}/>

  const today=starterWeek[new Date().getDay()]
  return <div className="app-shell"><main className="mobile-app">
    <div className="content-scroll">
      {tab==='home'&&<HomeScreen profile={profile} exercises={exercises} waterMl={waterMl} meals={meals} sessions={sessions} onWater={addWater} onStart={()=>setWorkoutOpen(true)} onTab={setTab}/>}
      {tab==='workout'&&<WorkoutScreen exercises={exercises} onStart={()=>setWorkoutOpen(true)}/>}
      {tab==='nutrition'&&<NutritionScreen profile={profile} waterMl={waterMl} meals={meals} onWater={addWater} onAddMeal={addMeal}/>}
      {tab==='progress'&&<ProgressScreen latest={latest} sessions={sessions} onAddMeasurement={addMeasurement}/>}
      {tab==='profile'&&<ProfileScreen profile={profile} reminders={reminders} onSaveProfile={saveProfile} onSaveReminder={saveReminder} onLogout={()=>supabase.auth.signOut()}/>}
    </div>
    <nav className="bottom-nav">{tabs.map(([key,Icon,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {workoutOpen&&today.exercises.length>0&&<WorkoutModal workout={today} exercises={exercises} user={user} onClose={()=>setWorkoutOpen(false)} onComplete={completeWorkout}/>}
  </main></div>
}
