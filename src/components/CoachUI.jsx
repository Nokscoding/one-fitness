import { Check, ChevronRight, Clock3, Dumbbell, Home, Sparkles, Trophy, X } from 'lucide-react'
import { coachAssets, getExerciseGuide } from '../assets'

const formatShortDate=(date)=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(date)).replace('.','')

export function SafeImage({ src, fallback='/coach.svg', alt='', className='' }) {
  if(typeof src==='string' && src.startsWith('sprite:')){
    const [,sheet,key]=src.split(':')
    return <span
      role="img"
      aria-label={alt}
      className={`visual-sprite visual-sprite--${sheet} visual-sprite--${key} ${className}`.trim()}
    />
  }
  return <img
    src={src || fallback}
    alt={alt}
    className={className}
    loading="eager"
    decoding="async"
    onError={(event)=>{
      const img=event.currentTarget
      if(img.dataset.fallback==='1'){img.style.display='none';return}
      img.dataset.fallback='1'
      img.src=fallback
    }}
  />
}

export function CoachPopup({ popup, onClose, onAction }) {
  if(!popup) return null
  const src=coachAssets[popup.variant] || coachAssets.welcome
  return <div className="coach-popup-backdrop" role="dialog" aria-modal="true">
    <section className="coach-popup-card">
      <button className="coach-popup-close" onClick={onClose} aria-label="Fermer"><X size={19}/></button>
      <div className="coach-popup-art"><SafeImage src={src} alt="Coach One Fitness"/></div>
      <div className="coach-popup-copy">
        <p className="eyebrow">{popup.eyebrow || 'COACH ONE FITNESS'}</p>
        <h2>{popup.title || 'Ton coach'}</h2>
        <p>{popup.message}</p>
        <button className="primary-button" onClick={onAction || onClose}>{popup.actionLabel || 'Compris'} <ChevronRight size={17}/></button>
      </div>
    </section>
  </div>
}

export function ExerciseGuideImage({ slug, name, compact=false }) {
  const src=getExerciseGuide(slug)
  if(!src) return null
  return <div className={compact?'exercise-visual compact':'exercise-visual'}>
    <SafeImage src={src} fallback="/coach.svg" alt={`Guide visuel : ${name || slug}`}/>
  </div>
}

export function CompletionScreen({ summary, tomorrow, onHome, onTomorrow }) {
  if(!summary) return null
  return <div className="completion-screen">
    <div className="completion-confetti">✦</div>
    <header className="completion-top"><span className="completion-badge"><Check size={17}/> TERMINÉE</span></header>
    <main className="completion-main">
      <div className="completion-coach"><SafeImage src={coachAssets.complete} alt="Coach qui célèbre la séance"/></div>
      <p className="eyebrow">BRAVO</p>
      <h1>Bien joué, {summary.name || 'Noks'} !</h1>
      <p className="completion-sub">Ta séance est enregistrée. Maintenant, récupération, eau et alimentation.</p>

      <section className="completion-stats">
        <div><Clock3 size={19}/><b>{summary.durationMinutes} min</b><span>Durée</span></div>
        <div><Dumbbell size={19}/><b>{summary.completedSets}/{summary.totalSets}</b><span>Séries faites</span></div>
        <div><Trophy size={19}/><b>{summary.percent}%</b><span>Réussite</span></div>
      </section>

      {tomorrow?.workout && <section className="completion-next">
        <div><p className="eyebrow">DEMAIN · {formatShortDate(tomorrow.date)}</p><h3>{tomorrow.workout.title}</h3><span>{tomorrow.workout.duration} · {tomorrow.workout.focus}</span></div>
        <Sparkles size={22}/>
      </section>}

      <div className="completion-actions">
        <button className="primary-button" onClick={onHome}><Home size={18}/> Retour accueil</button>
        {tomorrow?.workout?.exercises?.length>0 && <button className="secondary-button" onClick={onTomorrow}>Voir demain <ChevronRight size={18}/></button>}
      </div>
    </main>
  </div>
}
