# One Fitness

Application mobile-first de coaching personnel : entraînement à domicile, cardio, hydratation, alimentation, récupération, mensurations et rappels.

## Stack

- React + Vite
- Supabase (projet NKS existant, **tables One Fitness isolées par préfixe `one_fitness_`**)
- PWA / service worker
- Déploiement prévu sur Netlify

## Isolation de la base NKS

One Fitness ne réutilise aucune table métier NKS. Toutes ses données sont stockées dans des tables dédiées :

- `one_fitness_profiles`
- `one_fitness_exercises`
- `one_fitness_workout_plans`
- `one_fitness_plan_items`
- `one_fitness_workout_sessions`
- `one_fitness_workout_sets`
- `one_fitness_measurements`
- `one_fitness_meal_logs`
- `one_fitness_water_logs`
- `one_fitness_sleep_logs`
- `one_fitness_reminders`
- `one_fitness_push_subscriptions`
- `one_fitness_progress_photos`

RLS est activé afin qu'un utilisateur connecté ne puisse lire et modifier que ses propres lignes. La bibliothèque d'exercices est en lecture seule pour les utilisateurs connectés.

## Lancer localement

```bash
npm install
npm run dev
```

Les credentials front Supabase utilisés sont des credentials **publishable**. Il est possible de les surcharger via `.env.local` en copiant `.env.example`.

## Déploiement Netlify

Le projet contient déjà `netlify.toml`. Le build est `npm run build` et le dossier publié est `dist`.

Les notifications push serveur seront reliées après le premier déploiement, une fois le domaine HTTPS disponible et les clés VAPID ajoutées aux variables d'environnement.
