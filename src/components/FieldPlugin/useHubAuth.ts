import { ref } from 'vue'

export interface HubAuthData {
  sessionUuid: string
  token: string
  projectUuid: string
  companyUuid: string
  sassKey: string
}

const HUB_OAUTH_URL = 'https://hub.scaleflex.com/oauth2/login'
const HUB_SESSION_API_BASE = 'https://oauth2.sfxconnector.com/api/storyblok'
const STORAGE_KEY = 'sfx_hub_auth'

type HubAuthStatus = 'idle' | 'loading' | 'ready' | 'error'

interface HubAuthState {
  status: HubAuthStatus
  token: string
  sassKey: string
  error: string
}

// Shared across index.vue / Filerobot.vue / PreviewModal.vue within one iframe.
// Storyblok's portal modal reloads the whole plugin in a separate iframe, so
// each iframe independently re-resolves this from localStorage (same technique
// as usePreviewState.ts's cross-iframe bridging).
export const hubAuth = ref<HubAuthState>({ status: 'idle', token: '', sassKey: '', error: '' })

const getStoredHubAuth = (): HubAuthData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveHubAuth = (data: HubAuthData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const clearHubAuth = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}

// registers a freshly-logged-in Hub session with the plugins-oauth2 backend, which then
// keeps its session/SASS key renewed server-to-server
const registerHubSession = async (data: HubAuthData): Promise<void> => {
  await fetch(`${HUB_SESSION_API_BASE}/hub-sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// fetches the current (backend-renewed) session/SASS key for a known session_uuid;
// 'gone' only on 404 (never registered, or pruned after repeated renewal failures) —
// the caller should treat that as "log in again". Any other failure (network, 429, 5xx)
// is 'error' and must not log the user out.
const fetchCurrentHubSession = async (sessionUuid: string): Promise<HubAuthData | 'gone' | 'error'> => {
  try {
    const response = await fetch(`${HUB_SESSION_API_BASE}/hub-sessions/${sessionUuid}`, {
      headers: { accept: 'application/json' },
    })
    if (response.status === 404) return 'gone'
    if (!response.ok) return 'error'
    return await response.json()
  } catch {
    return 'error'
  }
}

// opens the Hub OAuth popup and resolves with the session data it posts back
const openHubLoginPopup = (): Promise<HubAuthData> =>
  new Promise((resolve, reject) => {
    const authWindow = window.open(
      HUB_OAUTH_URL,
      '_blank',
      'toolbar=0,location=0,directories=0,status=1,menubar=0,titlebar=0,scrollbars=1,resizable=1,width=600,height=650'
    )

    if (!authWindow) {
      reject(new Error('Popup blocked. Please allow popups and try again.'))
      return
    }

    let settled = false

    const cleanup = () => {
      window.removeEventListener('message', handleAuth)
      clearInterval(pollClosed)
    }

    const handleAuth = (event: MessageEvent) => {
      if (event.source !== authWindow) return
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      settled = true
      cleanup()
      authWindow.close()
      if (!data?.sessionUuid || !data?.sassKey) {
        reject(new Error('Access denied (session data is missing).'))
      } else {
        resolve(data)
      }
    }

    const pollClosed = window.setInterval(() => {
      if (authWindow.closed && !settled) {
        cleanup()
        reject(new Error('Login window was closed before completing.'))
      }
    }, 500)

    window.addEventListener('message', handleAuth)
  })

// true unless Filerobot rejects the key with 401; a network error is not proof the key
// is dead, so it counts as usable
const isSassKeyUsable = async (data: HubAuthData): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.filerobot.com/${data.token}/v5/labels`, {
      headers: { 'X-Filerobot-Key': data.sassKey },
    })
    return response.status !== 401
  } catch {
    return true
  }
}

const setReady = (data: HubAuthData) => {
  hubAuth.value = { status: 'ready', token: data.token, sassKey: data.sassKey, error: '' }
}

const setLoggedOut = () => {
  clearHubAuth()
  hubAuth.value = { status: 'idle', token: '', sassKey: '', error: '' }
}

// Loads the Hub session from localStorage only — no network call. Status 'idle'
// (caller shows the login button) if nothing is stored.
export const resolveHubAuth = async (): Promise<void> => {
  const stored = getStoredHubAuth()
  if (stored) setReady(stored)
  else hubAuth.value = { status: 'idle', token: '', sassKey: '', error: '' }
}

// Called once per app load (main iframe only): pulls the latest sassKey from the backend
// and stores it in localStorage for every later use. Keeps the stored session on a
// transient backend failure; logs out only if the backend no longer has the session.
export const refreshHubAuth = async (): Promise<void> => {
  const stored = getStoredHubAuth()
  if (!stored) return setLoggedOut()

  const current = await fetchCurrentHubSession(stored.sessionUuid)
  if (current === 'gone') return setLoggedOut()
  if (current === 'error') return setReady(stored)
  saveHubAuth(current)
  setReady(current)
}

let ensurePromise: Promise<void> | null = null

// Called right before opening the asset picker: keeps using the local sassKey while it
// works. Only on a 401 from Filerobot, fetches the latest key from the backend;
// if the backend can't provide one, logs out so the user signs in again.
export const ensureValidHubAuth = (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    const stored = getStoredHubAuth()
    if (!stored) return setLoggedOut()
    if (await isSassKeyUsable(stored)) return setReady(stored)

    const current = await fetchCurrentHubSession(stored.sessionUuid)
    if (current === 'gone' || current === 'error' || !(await isSassKeyUsable(current))) {
      return setLoggedOut()
    }
    saveHubAuth(current)
    setReady(current)
  })().finally(() => {
    ensurePromise = null
  })

  return ensurePromise
}

export const loginWithHub = async (): Promise<void> => {
  hubAuth.value = { ...hubAuth.value, status: 'loading', error: '' }
  try {
    const data = await openHubLoginPopup()
    await registerHubSession(data)
    saveHubAuth(data)
    hubAuth.value = { status: 'ready', token: data.token, sassKey: data.sassKey, error: '' }
  } catch (err: any) {
    hubAuth.value = { status: 'error', token: '', sassKey: '', error: err?.message || 'Login failed' }
  }
}

export const getAuthConfig = () => {
  if (hubAuth.value.status !== 'ready') return undefined
  return {
    mode: 'sassKey' as const,
    sassKey: hubAuth.value.sassKey,
    projectToken: hubAuth.value.token,
  }
}
