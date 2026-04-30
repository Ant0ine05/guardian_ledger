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

    <!-- Filtre gardien (armure) + Tri + Stats -->
    <div class="class-filter-bar">
      <span class="class-filter-label">Gardien</span>
      <div class="filter-tabs">
        <button
          v-for="cls in classTabs" :key="cls"
          class="filter-tab"
          :class="{ active: activeClassFilter === cls }"
          @click="activeClassFilter = cls"
        >{{ cls }}</button>
      </div>
      <div class="sort-divider"></div>
      <span class="class-filter-label">Tri</span>
      <div class="filter-tabs">
        <button
          v-for="s in sortTabs" :key="s.key"
          class="filter-tab"
          :class="{ active: activeSort === s.key }"
          @click="activeSort = s.key"
        >{{ s.label }}</button>
      </div>
      <div class="vault-summary">
        <span class="vault-summary-chip">
          <span class="vault-summary-num">{{ totalVault }}</span>
          <span class="vault-summary-label">/ {{ vaultCapacity }} items</span>
        </span>
        <span class="vault-summary-chip exotic">
          <span class="vault-summary-num">{{ exoticCount }}</span>
          <span class="vault-summary-label">exotiques</span>
        </span>
      </div>
    </div>

    <!-- Sections du coffre -->
    <template v-for="section in vaultSections" :key="section.key">
      <div class="section-header section-header--collapsible" style="margin-top:8px" @click="toggleSection(section.key)">
        <span class="section-title">{{ section.label }}</span>
        <div class="section-header-right">
          <span class="section-count">{{ filteredVault[section.key].length }}</span>
          <span class="section-chevron" :class="{ open: !collapsed[section.key] }">›</span>
        </div>
      </div>
      <div class="item-grid" v-if="!collapsed[section.key]">
        <div
          v-for="item in filteredVault[section.key]" :key="item.id"
          class="item-slot tooltip-wrap"
          :class="[item.rarity, { dimmed: isDimmed(section, item) }]"
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
        <div
          v-if="filteredVault[section.key].length === 0"
          class="empty-section"
        >Aucun item</div>
      </div>
    </template>

  </main>

  <!-- ITEM DETAIL OVERLAY -->
  <div class="item-selected-overlay" v-if="selectedItem" @click.self="selectedItem = null">
    <div class="item-detail">
      <button class="item-detail-close" @click="selectedItem = null">✕</button>

      <!-- En-tête -->
      <div class="item-detail-header">
        <div class="item-detail-icon-wrap" :class="selectedItem.rarity">
          <img v-if="selectedItem.icon" :src="selectedItem.icon" :alt="selectedItem.name" class="item-detail-img" />
          <span v-else>?</span>
        </div>
        <div class="item-detail-meta">
          <div class="item-detail-name">{{ selectedItem.name }}</div>
          <div class="item-detail-sub">
            <span class="item-detail-rarity-badge" :class="selectedItem.rarity">{{ selectedItem.rarity }}</span>
            <span class="item-detail-type">{{ selectedItem.type }}</span>
            <span class="item-detail-class" v-if="selectedItem.guardianClass !== 'Universel'">· {{ selectedItem.guardianClass }}</span>
          </div>
          <div class="item-detail-power-row">
            <span class="item-detail-power-icon">✦</span>
            <span class="item-detail-power-val">{{ selectedItem.power }}</span>
          </div>
        </div>
      </div>

      <!-- Chargement -->
      <div class="item-detail-loading" v-if="detailLoading">
        <div class="loading-spinner" style="width:24px;height:24px;border-width:3px"></div>
      </div>

      <!-- Corps : stats + perks -->
      <div class="item-detail-body" v-else-if="itemDetail">

        <!-- Stats -->
        <div class="item-detail-section" v-if="itemDetail.stats.length">
          <div class="item-detail-section-title">Statistiques</div>
          <div class="item-stat-row" v-for="stat in itemDetail.stats" :key="stat.name">
            <div class="item-stat-name">{{ stat.name }}</div>
            <div class="item-stat-bar-wrap">
              <div class="item-stat-bar" :style="{ width: Math.min(100, (stat.value / stat.max) * 100) + '%', '--pct': Math.min(100, (stat.value / stat.max) * 100) }"></div>
            </div>
            <div class="item-stat-value">{{ stat.value }}</div>
          </div>
        </div>

        <!-- Perks -->
        <div class="item-detail-section" v-if="itemDetail.perks.length">
          <div class="item-detail-section-title">Aptitudes</div>
          <div class="perk-row" v-for="perk in itemDetail.perks" :key="perk.name" :class="{ intrinsic: perk.isIntrinsic }">
            <img v-if="perk.icon" :src="perk.icon" class="perk-icon" :alt="perk.name" />
            <div v-else class="perk-icon perk-icon-placeholder">◈</div>
            <div class="perk-info">
              <div class="perk-name">{{ perk.name }}</div>
              <div class="perk-desc" v-if="perk.description">{{ perk.description }}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Item non instancié (consumable, etc.) -->
      <div class="item-detail-loading" v-else-if="!selectedItem.instanced">
        <span style="color:var(--text-muted);font-size:13px">Pas de stats disponibles pour cet item.</span>
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
const vault = ref({
  kinetic: [], energy: [], power: [],
  helmet: [], gauntlets: [], chest: [], legs: [], classItem: []
})

const vaultSections = [
  { key: 'kinetic',   label: 'Armes — Cinétique',        isArmor: false },
  { key: 'energy',    label: 'Armes — Énergie',           isArmor: false },
  { key: 'power',     label: 'Armes — Puissance',         isArmor: false },
  { key: 'helmet',    label: 'Armure — Casque',           isArmor: true  },
  { key: 'gauntlets', label: 'Armure — Gantelets',        isArmor: true  },
  { key: 'chest',     label: 'Armure — Torse',            isArmor: true  },
  { key: 'legs',      label: 'Armure — Jambes',           isArmor: true  },
  { key: 'classItem', label: 'Armure — Objet de classe',  isArmor: true  },
]

// Sections repliées par défaut
const collapsed = ref({
  kinetic: true, energy: true, power: true,
  helmet: true, gauntlets: true, chest: true, legs: true, classItem: true
})
function toggleSection(key) {
  collapsed.value[key] = !collapsed.value[key]
}

// Filtre par classe de gardien (armure)
const classTabs = ['Tout', 'Titan', 'Chasseur', 'Arcaniste']
const activeClassFilter = ref('Tout')

const activeSort = ref('power_desc')
const sortTabs = [
  { key: 'power_desc', label: '⬆ Lumière' },
  { key: 'power_asc',  label: '⬇ Lumière' },
  { key: 'az',         label: 'A → Z' },
  { key: 'za',         label: 'Z → A' },
]

function sortItems(list) {
  const s = activeSort.value
  return [...list].sort((a, b) => {
    if (s === 'power_desc') return b.power - a.power
    if (s === 'power_asc')  return a.power - b.power
    if (s === 'az')         return a.name.localeCompare(b.name)
    if (s === 'za')         return b.name.localeCompare(a.name)
    return 0
  })
}

function itemOpacity(section, item) {
  if (!section.isArmor || activeClassFilter.value === 'Tout') return 1
  if (item.guardianClass === 'Universel') return 1
  return item.guardianClass === activeClassFilter.value ? 1 : 0.2
}

function isDimmed(section, item) {
  if (!section.isArmor || activeClassFilter.value === 'Tout') return false
  if (item.guardianClass === 'Universel') return false
  return item.guardianClass !== activeClassFilter.value
}

const searchQuery = ref('')

const filteredVault = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const filter = list => {
    let r = q ? list.filter(i => i.name.toLowerCase().includes(q)) : list
    return sortItems(r)
  }
  return {
    kinetic:   filter(vault.value.kinetic),
    energy:    filter(vault.value.energy),
    power:     filter(vault.value.power),
    helmet:    filter(vault.value.helmet),
    gauntlets: filter(vault.value.gauntlets),
    chest:     filter(vault.value.chest),
    legs:      filter(vault.value.legs),
    classItem: filter(vault.value.classItem),
  }
})

const totalWeapons = computed(() =>
  vault.value.kinetic.length + vault.value.energy.length + vault.value.power.length
)
const totalArmor = computed(() =>
  vault.value.helmet.length + vault.value.gauntlets.length + vault.value.chest.length +
  vault.value.legs.length + vault.value.classItem.length
)
const totalVault  = computed(() => totalWeapons.value + totalArmor.value)
const vaultCapacity = ref('—')
const exoticCount = computed(() =>
  Object.values(vault.value).flat().filter(i => i.rarity === 'exotic').length
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
    vault.value = data.vault || vault.value
    vaultCapacity.value = data.vaultCapacity ?? '—'

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
const selectedItem  = ref(null)
const itemDetail    = ref(null)   // { stats, perks }
const detailLoading = ref(false)
const detailCache   = new Map()

async function selectItem(item) {
  selectedItem.value  = item
  itemDetail.value    = null
  if (!item.instanced) return

  if (detailCache.has(item.id)) {
    itemDetail.value = detailCache.get(item.id)
    return
  }

  detailLoading.value = true
  try {
    const token = localStorage.getItem('app_token')
    const res   = await fetch(`${API}/api/me/item-detail/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      detailCache.set(item.id, data)
      itemDetail.value = data
    }
  } catch { /* silencieux */ } finally {
    detailLoading.value = false
  }
}

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
