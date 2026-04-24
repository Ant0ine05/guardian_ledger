<template>
  <div class="login-root">

    <!-- Fond animé -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <!-- Carte centrale -->
    <div class="login-card">

      <!-- Logo -->
      <div class="logo-wrap">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
          <polygon points="18,2 34,30 2,30" fill="none" stroke="#918EF4" stroke-width="2"/>
          <polygon points="18,10 28,27 8,27" fill="rgba(145,142,244,0.15)" stroke="#6F9CEB" stroke-width="1.5"/>
          <circle cx="18" cy="18" r="3" fill="#918EF4"/>
        </svg>
        <span class="logo-title">Guardian Ledger</span>
      </div>

      <p class="logo-sub">Season of the Cipher · S26</p>

      <!-- Onglets -->
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          @click="switchTab('login')"
        >Connexion</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          @click="switchTab('register')"
        >Créer un compte</button>
      </div>

      <!-- ── LOGIN ── -->
      <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="handleLogin">
        <div class="field">
          <label>Email</label>
          <input
            v-model="loginEmail"
            type="email"
            placeholder="gardien@exemple.com"
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input
            v-model="loginPassword"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="!loading">Se connecter</span>
          <span v-else class="spinner"></span>
        </button>
      </form>

      <!-- ── REGISTER ── -->
      <form v-if="activeTab === 'register'" class="auth-form" @submit.prevent="handleRegister">
        <div class="field">
          <label>Email</label>
          <input
            v-model="regEmail"
            type="email"
            placeholder="gardien@exemple.com"
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label>Mot de passe <span class="hint">(min. 8 caractères)</span></label>
          <input
            v-model="regPassword"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="field">
          <label>Confirmer le mot de passe</label>
          <input
            v-model="regConfirm"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>

        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="!loading">Créer mon compte</span>
          <span v-else class="spinner"></span>
        </button>
      </form>

      <!-- ── ÉTAT : redirection Bungie ── -->
      <div v-if="activeTab === 'bungie-redirect'" class="bungie-redirect">
        <div class="bungie-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <circle cx="12" cy="12" r="10" stroke="#918EF4" stroke-width="1.5"/>
            <path d="M8 12 L16 12 M13 9 L16 12 L13 15" stroke="#6F9CEB" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="bungie-text">Compte créé ! Connexion à Bungie.net...</p>
        <p class="bungie-sub">Tu vas être redirigé pour lier ton compte Destiny 2.</p>
        <div class="pulse-bar">
          <div class="pulse-fill"></div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const activeTab    = ref('login')
const loading      = ref(false)
const errorMsg     = ref('')

// Login
const loginEmail    = ref('')
const loginPassword = ref('')

// Register
const regEmail    = ref('')
const regPassword = ref('')
const regConfirm  = ref('')

function switchTab(tab) {
  activeTab.value = tab
  errorMsg.value  = ''
}

// ── Login ───────────────────────────────────────────────────────────────────
async function handleLogin() {
  errorMsg.value = ''
  loading.value  = true
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value }),
    })
    const data = await res.json()
    if (!res.ok) { errorMsg.value = data.error; return }

    if (data.bungieRequired) {
      // Pas encore lié Bungie → OAuth
      activeTab.value = 'bungie-redirect'
      setTimeout(() => {
        window.location.href = `${API}/api/auth/bungie-connect?state=${encodeURIComponent(data.tempToken)}`
      }, 1500)
      return
    }

    // Tout OK → stocker le JWT et aller sur le dashboard
    localStorage.setItem('app_token', data.appToken)
    router.push('/dashboard')
  } catch {
    errorMsg.value = 'Impossible de contacter le serveur.'
  } finally {
    loading.value = false
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
async function handleRegister() {
  errorMsg.value = ''
  if (regPassword.value !== regConfirm.value) {
    errorMsg.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  loading.value = true
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail.value, password: regPassword.value }),
    })
    const data = await res.json()
    if (!res.ok) { errorMsg.value = data.error; return }

    // Compte créé → lier Bungie obligatoirement
    activeTab.value = 'bungie-redirect'
    setTimeout(() => {
      window.location.href = `${API}/api/auth/bungie-connect?state=${encodeURIComponent(data.tempToken)}`
    }, 1500)
  } catch {
    errorMsg.value = 'Impossible de contacter le serveur.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.login-root {
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  background: #0d1230;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* ── Fond ── */
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(111,156,235,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(111,156,235,.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
.bg-glow {
  position: absolute;
  width: 600px; height: 600px;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, rgba(145,142,244,.08) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Carte ── */
.login-card {
  position: relative;
  background: #1a2252;
  border: 1px solid rgba(111,156,235,.15);
  border-radius: 16px;
  padding: 40px 44px;
  width: 420px;
  box-shadow:
    0 0 0 1px rgba(145,142,244,.06),
    0 24px 60px rgba(0,0,0,.5),
    0 0 40px rgba(145,142,244,.05);
}

/* ── Logo ── */
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.logo-svg { width: 36px; height: 36px; flex-shrink: 0; }
.logo-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #c8d8f0;
  letter-spacing: .5px;
}
.logo-sub {
  font-size: 11px;
  color: #6a85b8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 28px;
}

/* ── Onglets ── */
.tabs {
  display: flex;
  gap: 4px;
  background: rgba(13,18,48,.5);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 28px;
}
.tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6a85b8;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}
.tab-btn.active {
  background: #1e2a5e;
  color: #98b9f2;
  box-shadow: 0 0 12px rgba(145,142,244,.1);
}
.tab-btn:hover:not(.active) { color: #c8d8f0; }

/* ── Formulaire ── */
.auth-form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 12px;
  font-weight: 500;
  color: #6a85b8;
  text-transform: uppercase;
  letter-spacing: .8px;
}
.field .hint { font-size: 10px; color: #456; text-transform: none; letter-spacing: 0; }
.field input {
  background: rgba(13,18,48,.6);
  border: 1px solid rgba(111,156,235,.2);
  border-radius: 8px;
  padding: 11px 14px;
  color: #c8d8f0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.field input::placeholder { color: #3a4f7a; }
.field input:focus {
  border-color: rgba(145,142,244,.5);
  box-shadow: 0 0 0 3px rgba(145,142,244,.08);
}

/* ── Bouton principal ── */
.btn-primary {
  margin-top: 6px;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #306BAC, #918EF4);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .5px;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}
.btn-primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* ── Spinner ── */
.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Erreur ── */
.error-msg {
  padding: 10px 14px;
  background: rgba(255,80,80,.08);
  border: 1px solid rgba(255,80,80,.2);
  border-radius: 8px;
  color: #ff9090;
  font-size: 13px;
}

/* ── État redirection Bungie ── */
.bungie-redirect {
  text-align: center;
  padding: 20px 0 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.bungie-icon { animation: float 2s ease-in-out infinite; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
.bungie-text {
  font-family: 'Rajdhani', sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: #c8d8f0;
}
.bungie-sub { font-size: 12px; color: #6a85b8; }
.pulse-bar {
  width: 100%;
  height: 3px;
  background: rgba(111,156,235,.15);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 10px;
}
.pulse-fill {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #306BAC, #918EF4);
  border-radius: 2px;
  animation: pulse-slide 1.2s ease-in-out infinite;
}
@keyframes pulse-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
</style>
