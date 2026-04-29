<template>
<div class="app-root">

  <!-- LOADING -->
  <div class="loading-overlay" v-if="loading">
    <div class="loading-spinner"></div>
    <p class="loading-text">Chargement de la vault...</p>
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
    <button class="nav-btn" title="Gardiens" @click="router.push('/dashboard')">◈</button>
    <button class="nav-btn active" title="Vault">⊞</button>
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
    <div class="header-right">
      <input
        class="search-bar"
        type="text"
        placeholder="🔍  Rechercher un item..."
        v-model="searchQuery"
      />
    </div>
  </header>

  <!-- MAIN -->
  <main class="main">

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Armes</div>
        <div class="stat-value">{{ weapons.length }}</div>
        <div class="stat-sub">dans l'inventaire</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Armures</div>
        <div class="stat-value">{{ armor.length }}</div>
        <div class="stat-sub">dans l'inventaire</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Exotiques</div>
        <div class="stat-value">{{ exoticCount }}</div>
        <div class="stat-sub">armes &amp; armures</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vault</div>
        <div class="stat-value">—</div>
        <div class="stat-sub">bientôt disponible</div>
      </div>
    </div>

    <!-- Weapons -->
    <div class="section-header">
      <span class="section-title">Inventaire — Armes</span>
      <div class="filter-tabs">
        <button
          v-for="tab in weaponTabs" :key="tab"
          class="filter-tab"
          :class="{active: activeWeaponTab === tab}"
          @click="activeWeaponTab = tab"
        >{{ tab }}</button>
      </div>
    </div>
    <div class="item-grid">
      <div
        v-for="item in filteredWeapons" :key="item.id"
        class="item-slot tooltip-wrap"
        :class="item.rarity"
        @click="selectItem(item)"
      >
        <div class="item-icon">
          <img v-if="item.icon" :src="item.icon" :alt="item.name" class="item-icon-img" />
          <span v-else>?</span>
        </div>
        <div class="item-power">{{ item.power }}</div>
        <div class="item-type-bar"></div>
        <div class="tooltip">{{ item.name }}</div>
      </div>
      <div class="item-slot empty" v-for="n in emptySlots(filteredWeapons, 15)" :key="'ew'+n"></div>
    </div>

    <!-- Armor -->
    <div class="section-header" style="margin-top:8px">
      <span class="section-title">Inventaire — Armure</span>
      <div class="filter-tabs">
        <button
          v-for="tab in armorTabs" :key="tab"
          class="filter-tab"
          :class="{active: activeArmorTab === tab}"
          @click="activeArmorTab = tab"
        >{{ tab }}</button>
      </div>
    </div>
    <div class="item-grid">
      <div
        v-for="item in filteredArmor" :key="item.id"
        class="item-slot tooltip-wrap"
        :class="item.rarity"
        @click="selectItem(item)"
      >
        <div class="item-icon">
          <img v-if="item.icon" :src="item.icon" :alt="item.name" class="item-icon-img" />
          <span v-else>?</span>
        </div>
        <div class="item-power">{{ item.power }}</div>
        <div class="item-type-bar"></div>
        <div class="tooltip">{{ item.name }}</div>
      </div>
      <div class="item-slot empty" v-for="n in emptySlots(filteredArmor, 8)" :key="'ea'+n"></div>
    </div>

  </main>

  <!-- ITEM DETAIL OVERLAY -->
  <div class="item-selected-overlay" v-if="selectedItem" @click.self="selectedItem = null">
    <div class="item-detail">
      <button class="item-detail-close" @click="selectedItem = null">✕</button>
      <div class="item-detail-icon">
        <img v-if="selectedItem.icon" :src="selectedItem.icon" :alt="selectedItem.name" style="width:52px;height:52px;object-fit:contain" />
        <span v-else>?</span>
      </div>
      <div class="item-detail-name">{{ selectedItem.name }}</div>
      <div class="item-detail-rarity">{{ selectedItem.rarity }} · {{ selectedItem.type }}</div>
      <div class="item-detail-power">{{ selectedItem.power }}</div>
      <div class="item-detail-power-label">Niveau de puissance</div>
      <div class="item-detail-actions">
        <button class="btn-primary" @click="selectedItem = null">Fermer</button>
      </div>
    </div>
  </div>

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
const weapons = ref([])
const armor   = ref([])

const exoticCount = computed(() =>
  [...weapons.value, ...armor.value].filter(i => i.rarity === 'exotic').length
)

const searchQuery     = ref('')
const weaponTabs      = ['Tout', 'Cinétique', 'Énergie', 'Puissance']
const activeWeaponTab = ref('Tout')
const armorTabs       = ['Tout', 'Casque', 'Torse', 'Gantelets', 'Jambes', 'Classe']
const activeArmorTab  = ref('Tout')

const filteredWeapons = computed(() => {
  let list = weapons.value
  if (activeWeaponTab.value !== 'Tout') list = list.filter(w => w.type === activeWeaponTab.value)
  if (searchQuery.value) list = list.filter(w => w.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  return list
})

const filteredArmor = computed(() => {
  let list = armor.value
  if (activeArmorTab.value !== 'Tout') list = list.filter(a => a.type === activeArmorTab.value)
  if (searchQuery.value) list = list.filter(a => a.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  return list
})

const emptySlots = (list, max) => Math.max(0, max - list.length)

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
    weapons.value = data.weapons || []
    armor.value   = data.armor   || []

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
  const stored = localStorage.getItem('app_token')
  if (!stored) { router.push('/login'); return }
  applyUser(stored)
  await fetchDestinyData(stored)
})

// Item detail
const selectedItem = ref(null)
const selectItem   = (item) => { selectedItem.value = item }

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
