<script setup lang="ts">
import { hubAuth, loginWithHub } from './useHubAuth'

const handleLoginClick = () => {
  loginWithHub()
}
</script>

<template>
  <div class="missConfig hub-login">
    <div>
      Sign in with your Scaleflex DAM account to connect this field — no token or security template needed.
    </div>
    <div v-if="hubAuth.status === 'error'" class="hub-login-error">
      {{ hubAuth.error }}
    </div>
    <button
      type="button"
      class="btn"
      :class="{ disabled: hubAuth.status === 'loading' }"
      :disabled="hubAuth.status === 'loading'"
      @click="handleLoginClick"
    >
      {{ hubAuth.status === 'loading' ? 'Signing in…' : 'Login via Hub' }}
    </button>
  </div>
</template>
