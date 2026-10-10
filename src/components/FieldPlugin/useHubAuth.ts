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
// null if the backend no longer has this session (never registered, or pruned after
// repeated renewal failures) — the caller should treat that as "log in again"
const fetchCurrentHubSession = async (sessionUuid: string): Promise<HubAuthData | null> => {
  try {
    const response = await fetch(`${HUB_SESSION_API_BASE}/hub-sessions/${sessionUuid}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
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

let resolvePromise: Promise<void> | null = null

// Checks localStorage for a stored Hub session and refreshes it against the backend.
// Falls back to status 'idle' (caller shows the login button) if there's no session
// or the backend no longer recognizes it.
export const resolveHubAuth = (): Promise<void> => {
  if (resolvePromise) return resolvePromise

  resolvePromise = (async () => {
    const stored = getStoredHubAuth()
    if (!stored) {
      hubAuth.value = { status: 'idle', token: '', sassKey: '', error: '' }
      return
    }

    hubAuth.value = { ...hubAuth.value, status: 'loading' }
    const current = await fetchCurrentHubSession(stored.sessionUuid)
    if (current) {
      saveHubAuth(current)
      hubAuth.value = { status: 'ready', token: current.token, sassKey: current.sassKey, error: '' }
      return
    }

    clearHubAuth()
    hubAuth.value = { status: 'idle', token: '', sassKey: '', error: '' }
  })().finally(() => {
    resolvePromise = null
  })

  return resolvePromise
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
