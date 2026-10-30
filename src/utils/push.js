import { VAPID_PUBLIC_KEY } from '../config/push';

const API_PROXY = '/api/dataverse-proxy';

const urlBase64ToUint8Array = (base64) => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

// Inscreve o dispositivo (smartphone, tablet ou notebook) para Web Push e guarda a inscrição no Dataverse, uma vez por endpoint.
export const registerPushSubscription = async (username) => {
  const cleanUser = String(username || '').trim().toLowerCase();
  if (!cleanUser || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  const json = subscription.toJSON();

  // Memo não pode ser filtrado no Dataverse: busca as inscrições do usuário e compara o endpoint aqui.
  const filter = encodeURIComponent(`cr4a1_username eq '${cleanUser}'`);
  const existingRes = await fetch(`${API_PROXY}?table=cr4a1_push_subscriptions&$filter=${filter}`).catch(() => null);
  const existing = existingRes && existingRes.ok ? await existingRes.json() : { value: [] };
  if ((existing.value || []).some(s => s.cr4a1_endpoint === json.endpoint)) return true;

  await fetch(`${API_PROXY}?table=cr4a1_push_subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cr4a1_nome: cleanUser,
      cr4a1_username: cleanUser,
      cr4a1_endpoint: json.endpoint,
      cr4a1_p256dh: json.keys.p256dh,
      cr4a1_auth: json.keys.auth
    })
  });
  return true;
};
