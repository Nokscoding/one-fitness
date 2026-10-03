import { supabase } from './supabase'

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BKrKmaJAVOmZTPtFfuXMhNatJzts4OKDG4ZnE_amZRKiXcl5t6Fpwe55uBT9EnNGKIAoZbXE3af4ZEXtfLj4bFw'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function canUseWebPush() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function enableOneFitnessPush() {
  if (!canUseWebPush()) {
    return { ok: false, state: 'unsupported', message: 'Les notifications push ne sont pas prises en charge sur cet appareil.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, state: permission, message: 'Autorisation des notifications non accordée.' }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, state: 'signed-out', message: 'Reconnecte-toi avant d’activer les rappels.' }
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const endpoint = json.endpoint || subscription.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return { ok: false, state: 'invalid-subscription', message: 'Abonnement push incomplet.' }
  }

  const { error } = await supabase
    .from('one_fitness_push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth_key: auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id,endpoint' },
    )

  if (error) throw error

  await registration.showNotification('One Fitness est prêt 💙', {
    body: 'Tes rappels peuvent maintenant arriver même quand l’app est fermée.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: '/' },
  })

  return { ok: true, state: 'granted', message: 'Notifications push activées.' }
}

export async function disableOneFitnessPush() {
  if (!canUseWebPush()) return { ok: false, state: 'unsupported' }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await supabase
      .from('one_fitness_push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)

    await subscription.unsubscribe()
  }

  return { ok: true, state: Notification.permission }
}

export async function getOneFitnessPushState() {
  if (!canUseWebPush()) return 'unsupported'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (Notification.permission !== 'granted') return Notification.permission
  return subscription ? 'active' : 'granted'
}
