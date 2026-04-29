<template>
<div class="app-root">

  <!-- LOADING -->
  <div class="loading-overlay" v-if="loading">
    <div class="loading-spinner"></div>
    <p class="loading-text">Chargement de tes gardiens...</p>
  </div>

  <!-- BUNGIE ERROR -->
  <div class="bungie-error" v-if="bungieError && !loading">⚠ {{ bungieError }}</div>

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,2 34,30 2,30" fill="none" stroke="#918EF4" stroke-width="2"/>
        <polygon points="18,10 28,27 8,27" fill="rgba(145,142,244,0.15)" stroke="#6F9CEB" stroke-width="1.5"/>
        <circle cx="18" cy="18" r="3" fill="#918EF4"/>
      </svg>
    </div>
    <button class="nav-btn active" title="Gardiens">◈</button>
    <button class="nav-btn" title="Vault" @click="router.push('/vault')">⊞</button>
    <button class="nav-btn" title="Collections">⊡</button>
    <button class="nav-btn" title="Triomphes">✦</button>
    <button class="nav-btn" title="Carte">◎</button>
    <button class="nav-btn" title="Season Pass">⊕</button>
    <div class="sidebar-spacer"></div>
    <button class="nav-btn" title="Paramètres">⚙</button>
    <div class="guardian-avatar">{{ userInitials }}</div>
  </aside>

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <span class="page-title">Guardian Ledger</span>
      <span class="season-badge">Season of the Cipher · S26</span>
    </div>
    <div class="header-center" v-if="displayName">
      <span class="guardian-name">{{ displayName }}</span>
    </div>
    <div class="header-right"></div>
  </header>

  <!-- MAIN -->
  <main class="main">

    <!-- Stats -->
    <div class="stats-row" v-if="characters.length">
      <div class="stat-card">
        <div class="stat-label">Personnages</div>
        <div class="stat-value">{{ characters.length }}</div>
        <div class="stat-sub">gardiens actifs</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Puissance Max</div>
        <div class="stat-value">{{ maxPower }}</div>
        <div class="stat-sub">meilleur gardien</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Puissance Moy.</div>
        <div class="stat-value">{{ avgPower }}</div>
        <div class="stat-sub">sur tous les gardiens</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vault</div>
        <div class="stat-value">—</div>
        <div class="stat-sub">bientôt disponible</div>
      </div>
    </div>

    <!-- Section header -->
    <div class="section-header">
      <span class="section-title">Mes Gardiens</span>
    </div>

    <!-- Guardian cards -->
    <div class="characters-row">
      <div
        v-for="char in characters"
        :key="char.id"
        class="guardian-card"
        :data-char-class="char.class"
      >
        <!-- Card header -->
        <div class="guardian-card-header">
          <div>
            <div class="gc-class-name">{{ char.class }}</div>
            <div class="gc-race-sub">{{ char.race }}<span v-if="char.subclass"> · {{ char.subclass }}</span></div>
          </div>
          <div class="gc-power">
            <span class="gc-power-star">✦</span>
            <span class="gc-power-val">{{ char.power }}</span>
          </div>
        </div>

        <!-- Card body -->
        <div class="guardian-card-body">

          <!-- Weapons (left) -->
          <div class="gc-column">
            <div
              v-for="(wep, idx) in [char.weapons.kinetic, char.weapons.energy, char.weapons.power]"
              :key="idx"
              class="gc-item"
              :class="wep ? wep.rarity : 'empty'"
              :title="wep ? wep.name : ''"
            >
              <template v-if="wep">
                <img :src="wep.icon" :alt="wep.name" class="gc-item-img" v-if="wep.icon" />
                <span v-else class="gc-item-ph">?</span>
                <div class="gc-item-power">{{ wep.power }}</div>
                <div class="gc-item-bar"></div>
              </template>
            </div>
            <!-- Light level badge -->
            <div class="gc-light">
              <span>✦</span>
              <span class="gc-light-num">{{ char.power }}</span>
            </div>
          </div>

          <!-- Logo de classe (center) -->
          <div class="gc-silhouette">
            <!-- Emblem du personnage si dispo, sinon logo de classe SVG -->
            <div class="gc-class-logo-wrap">
              <img
                v-if="char.emblemPath"
                :src="char.emblemPath"
                :alt="char.class"
                class="gc-emblem-img"
              />
              <!-- Titan -->
              <svg v-else-if="char.class === 'Titan'" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="gc-class-svg">
                <polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="rgba(48,107,172,0.12)" stroke="rgba(48,107,172,0.6)" stroke-width="2.5"/>
                <polygon points="50,20 80,37 80,63 50,80 20,63 20,37" fill="rgba(48,107,172,0.08)" stroke="rgba(111,156,235,0.4)" stroke-width="1.5"/>
                <line x1="50" y1="8" x2="50" y2="92" stroke="rgba(111,156,235,0.45)" stroke-width="1.5"/>
                <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(111,156,235,0.45)" stroke-width="1.5"/>
                <circle cx="50" cy="50" r="8" fill="rgba(48,107,172,0.4)" stroke="rgba(111,156,235,0.8)" stroke-width="2"/>
                <circle cx="50" cy="50" r="3" fill="rgba(111,156,235,0.9)"/>
              </svg>
              <!-- Chasseur -->
              <svg v-else-if="char.class === 'Chasseur'" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="gc-class-svg">
                <polygon points="50,6 94,50 50,94 6,50" fill="rgba(111,156,235,0.1)" stroke="rgba(111,156,235,0.55)" stroke-width="2.5"/>
                <polygon points="50,18 82,50 50,82 18,50" fill="rgba(111,156,235,0.07)" stroke="rgba(111,156,235,0.3)" stroke-width="1.5"/>
                <line x1="26" y1="26" x2="74" y2="74" stroke="rgba(111,156,235,0.5)" stroke-width="1.5"/>
                <line x1="74" y1="26" x2="26" y2="74" stroke="rgba(111,156,235,0.5)" stroke-width="1.5"/>
                <line x1="50" y1="6"  x2="50" y2="94" stroke="rgba(111,156,235,0.35)" stroke-width="1"/>
                <line x1="6"  y1="50" x2="94" y2="50" stroke="rgba(111,156,235,0.35)" stroke-width="1"/>
                <circle cx="50" cy="50" r="7" fill="rgba(111,156,235,0.35)" stroke="rgba(152,185,242,0.9)" stroke-width="2"/>
                <circle cx="50" cy="50" r="2.5" fill="rgba(152,185,242,1)"/>
              </svg>
              <!-- Arcaniste -->
              <svg v-else viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="gc-class-svg">
                <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="rgba(145,142,244,0.1)" stroke="rgba(145,142,244,0.55)" stroke-width="2.5"/>
                <path d="M50 22 L72 34 L78 58 L62 76 L38 76 L22 58 L28 34 Z" fill="rgba(145,142,244,0.08)" stroke="rgba(145,142,244,0.35)" stroke-width="1.5"/>
                <line x1="50" y1="5"  x2="50" y2="95" stroke="rgba(145,142,244,0.4)" stroke-width="1"/>
                <line x1="5"  y1="27.5" x2="95" y2="72.5" stroke="rgba(145,142,244,0.3)" stroke-width="1"/>
                <line x1="95" y1="27.5" x2="5"  y2="72.5" stroke="rgba(145,142,244,0.3)" stroke-width="1"/>
                <circle cx="50" cy="50" r="9" fill="rgba(145,142,244,0.25)" stroke="rgba(145,142,244,0.9)" stroke-width="2"/>
                <circle cx="50" cy="50" r="4" fill="rgba(145,142,244,0.85)"/>
                <circle cx="50" cy="50" r="1.5" fill="white" opacity="0.8"/>
              </svg>
            </div>
          </div>

          <!-- Armor (right) -->
          <div class="gc-column">
            <div
              v-for="(arm, idx) in [char.armor.helmet, char.armor.chest, char.armor.gauntlets, char.armor.legs, char.armor.classItem]"
              :key="idx"
              class="gc-item"
              :class="arm ? arm.rarity : 'empty'"
              :title="arm ? arm.name : ''"
            >
              <template v-if="arm">
                <img :src="arm.icon" :alt="arm.name" class="gc-item-img" v-if="arm.icon" />
                <span v-else class="gc-item-ph">?</span>
                <div class="gc-item-power">{{ arm.power }}</div>
                <div class="gc-item-bar"></div>
              </template>
            </div>
          </div>

        </div>
      </div>
    </div>

  </main>

  <!-- TOAST -->
  <div class="toast" :class="{show: toastVisible}">
    <div class="toast-dot"></div>
    {{ toastMessage }}
  </div>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()
const API    = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Auth
const displayName  = ref('')
const userInitials = ref('GD')
const loading      = ref(true)
const bungieError  = ref('')

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

function applyUser(token) {
  const payload = parseJwt(token)
  if (!payload) return
  displayName.value  = payload.displayName || payload.email || 'Gardien'
  const parts = displayName.value.replace('#', ' ').split(/\s+/)
  userInitials.value = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : displayName.value.slice(0, 2).toUpperCase()
}

// Data
const characters = ref([])

const maxPower = computed(() =>
  characters.value.length ? Math.max(...characters.value.map(c => c.power)) : 0
)
const avgPower = computed(() =>
  characters.value.length
    ? Math.round(characters.value.reduce((s, c) => s + c.power, 0) / characters.value.length)
    : 0
)

async function fetchDestinyData(token) {
  try {
    const res = await fetch(`${API}/api/me/destiny`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.status === 401) {
      localStorage.removeItem('app_token')
      router.push('/login')
      return
    }
    if (!res.ok) {
      bungieError.value = 'Impossible de charger les données Bungie.'
      return
    }
    const data = await res.json()
    characters.value = data.characters || []

    if (data.displayName) {
      displayName.value  = data.displayName
      const parts = data.displayName.replace('#', ' ').split(/\s+/)
      userInitials.value = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : data.displayName.slice(0, 2).toUpperCase()
    }
  } catch {
    bungieError.value = 'Erreur réseau.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const urlToken = route.query.appToken
  if (urlToken) {
    localStorage.setItem('app_token', urlToken)
    router.replace({ path: '/dashboard' })
    applyUser(urlToken)
    await fetchDestinyData(urlToken)
    return
  }
  const stored = localStorage.getItem('app_token')
  if (!stored) { router.push('/login'); return }
  applyUser(stored)
  await fetchDestinyData(stored)
})

// Toast
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null
const showToast = (msg) => {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2800)
}
</script>

<style>
/* ─── CHARACTERS ROW ─── */
.characters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* ─── GUARDIAN CARD ─── */
.guardian-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  animation: fadeUp .4s ease both;
}
.guardian-card[data-char-class="Titan"]     { border-top: 2px solid var(--ocean-deep) }
.guardian-card[data-char-class="Chasseur"]  { border-top: 2px solid var(--cornflower) }
.guardian-card[data-char-class="Arcaniste"] { border-top: 2px solid var(--soft-periwinkle) }

/* Card header */
.guardian-card-header {
  background: linear-gradient(135deg, var(--space-indigo), var(--surface-2));
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gc-class-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 20px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--soft-periwinkle);
  text-shadow: 0 0 15px rgba(145,142,244,.4);
}
.gc-race-sub {
  font-size: 11px; color: var(--text-muted);
  letter-spacing: 1px; text-transform: uppercase;
  margin-top: 2px;
}
.gc-power { display: flex; align-items: center; gap: 5px }
.gc-power-star { color: #f4c441; font-size: 14px }
.gc-power-val {
  font-family: 'Rajdhani', sans-serif;
  font-size: 28px; font-weight: 700;
  color: #f4c441; line-height: 1;
  text-shadow: 0 0 12px rgba(244,196,65,.4);
}

/* Card body */
.guardian-card-body {
  display: flex;
  padding: 14px 12px;
  gap: 8px;
  align-items: flex-start;
}

/* Item columns */
.gc-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

/* Individual item in card */
.gc-item {
  width: 60px; height: 60px;
  background: var(--space-indigo);
  border: 1px solid var(--border);
  border-radius: 6px;
  position: relative;
  cursor: default;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column;
  transition: border-color .15s, transform .15s;
}
.gc-item:not(.empty):hover { border-color: var(--cornflower); transform: scale(1.06); z-index: 2 }
.gc-item.empty { border-style: dashed; opacity: .22; }
.gc-item.exotic    { border-color: rgba(244,196,65,.5);  background: linear-gradient(135deg,rgba(244,196,65,.07),var(--space-indigo)) }
.gc-item.legendary { border-color: rgba(145,102,197,.5); background: linear-gradient(135deg,rgba(145,102,197,.07),var(--space-indigo)) }
.gc-item.rare      { border-color: rgba(48,107,172,.4) }
.gc-item-img { width: 40px; height: 40px; object-fit: contain; display: block }
.gc-item-ph  { font-size: 18px; color: var(--text-muted) }
.gc-item-power {
  position: absolute; bottom: 2px; right: 3px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px; font-weight: 700;
  color: #f4c441; line-height: 1;
}
.gc-item-bar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
}
.gc-item.exotic    .gc-item-bar { background: #f4c441 }
.gc-item.legendary .gc-item-bar { background: #9166c5 }
.gc-item.rare      .gc-item-bar { background: var(--ocean-deep) }
.gc-item.common    .gc-item-bar { background: #4a7c59 }

/* Light badge (bas de la colonne armes) */
.gc-light {
  margin-top: 4px;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 6px;
  background: rgba(244,196,65,.07);
  border: 1px solid rgba(244,196,65,.2);
  border-radius: 6px;
  width: 60px;
}
.gc-light > span:first-child { color: #f4c441; font-size: 10px }
.gc-light-num {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px; font-weight: 700;
  color: #f4c441;
}

/* Silhouette / logo de classe */
.gc-silhouette {
  flex: 1;
  display: flex;
  align-items: center; justify-content: center;
  min-width: 70px;
}
.gc-class-logo-wrap {
  display: flex;
  align-items: center; justify-content: center;
  width: 90px; height: 90px;
}
.gc-emblem-img {
  width: 90px; height: 90px;
  object-fit: contain;
  border-radius: 8px;
  filter: drop-shadow(0 0 10px rgba(145,142,244,.35));
}
.gc-class-svg {
  width: 80px; height: 80px;
  filter: drop-shadow(0 0 8px rgba(145,142,244,.3));
  transition: filter .2s;
}
.guardian-card:hover .gc-class-svg {
  filter: drop-shadow(0 0 16px rgba(145,142,244,.6));
}
.guardian-card[data-char-class="Titan"]:hover .gc-class-svg {
  filter: drop-shadow(0 0 16px rgba(48,107,172,.7));
}
.guardian-card[data-char-class="Chasseur"]:hover .gc-class-svg {
  filter: drop-shadow(0 0 16px rgba(111,156,235,.7));
}
</style>
