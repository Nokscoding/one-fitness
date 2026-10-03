# One Fitness

One Fitness est une application **mobile-first** de coaching personnel : entraînement à domicile, cardio, hydratation, alimentation, récupération, mensurations, progression et rappels push.

## Identité

- App : bleu / blanc / noir
- Coach 2D : rose / blanc / vert
- Nom : **One Fitness**
- Interface pensée d'abord pour smartphone, avec une présentation mobile sur grand écran au lieu d'un dashboard desktop compressé.

## Stack

- React + Vite
- Supabase Auth + Postgres + Storage
- PWA / Service Worker
- Web Push
- Supabase Edge Functions + Cron pour les rappels
- Netlify pour l'hébergement

## Base de données isolée de NKS

One Fitness utilise le projet Supabase NKS existant mais **aucune table métier NKS n'est réutilisée**.

Toutes les tables de l'app ont le préfixe `one_fitness_` :

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

RLS est activé : un utilisateur connecté n'accède qu'à ses propres données. La bibliothèque d'exercices est partagée en lecture seule.

## Fonctionnalités V1

- Authentification par lien e-mail
- Onboarding poids / taille / objectif eau / heure d'entraînement
- Coach du jour
- Programme maison sans équipement obligatoire
- Hand gripper + corde à sauter
- Pompes, abdos, nuque, avant-bras et cardio
- Fiches d'exercices avec explications et sécurité
- Mode séance : séries, répétitions, chrono et repos
- Suivi eau
- Journal des repas
- Mensurations et performances
- Check-in sommeil / fatigue / courbatures
- Équipement évolutif
- Rappels entraînement, eau, repas et récupération
- Web Push même app fermée après autorisation
- PWA installable sur iPhone/Android

## Rappels push

Une Edge Function Supabase `one-fitness-reminders` est déployée et un Cron `one-fitness-reminders-every-minute` l'appelle chaque minute.

Les rappels par défaut sont :

- entraînement : heure choisie dans le profil
- eau : toutes les 2 h entre 08:30 et 22:30
- petit-déjeuner : 08:00
- déjeuner : 13:00
- collation : 17:00
- dîner : 20:30
- récupération : 22:30

Sur iPhone, Web Push nécessite l'installation de la PWA sur l'écran d'accueil et l'autorisation des notifications.

## Lancer localement

```bash
npm install
npm run dev
```

## Variables front

Copier `.env.example` vers `.env.local` si nécessaire.

Seules des valeurs publiques sont utilisées dans le front :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_VAPID_PUBLIC_KEY`

Aucune clé serveur privée ne doit être ajoutée au repository.

## Netlify

Projet Netlify créé : **one-fitness-nks**

URL prévue :

`https://one-fitness-nks.netlify.app`

Build :

- commande : `npm run build`
- publication : `dist`

Les variables front sont déjà configurées dans le projet Netlify.

## CI

GitHub Actions vérifie le build de production à chaque push sur `main`.
