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
      <button class="reload-btn" :class="{ spinning: reloading }" title="Recharger les données" @click="reloadData">↻</button>
    </div>
  </header>

  <!-- MAIN -->
  <main class="main vault-main">

    <!-- ══ PANNEAU GAUCHE : PERSONNAGE ══ -->
    <div
      class="char-panel"
      :class="{ 'char-panel--dragover': dragOverTarget === 'char-panel' }"
      :style="selectedChar?.emblemBackgroundPath ? {
        backgroundImage: `linear-gradient(to bottom, rgba(20,27,65,0.35) 0%, rgba(20,27,65,0.7) 35%, #141B41 70%), url(${selectedChar.emblemBackgroundPath})`,
        backgroundSize: '100% auto',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat'
      } : {}"
      @dragover.prevent="dragOverTarget = 'char-panel'"
      @dragleave.self="dragOverTarget = null"
      @drop.prevent="onDropCharPanel"
    >
      <!-- Sélecteur de personnage -->
      <div class="char-tabs" v-if="characters.length">
        <button
          v-for="char in characters" :key="char.id"
          class="char-tab"
          :class="['char-tab--' + char.class.toLowerCase(), { active: selectedCharId === char.id }]"
          @click="selectedCharId = char.id"
        >
          <span class="char-tab-icon">{{ classTabIcon(char.class) }}</span>
          {{ char.class }}
        </button>
      </div>

      <!-- Équipement du personnage sélectionné -->
      <template v-if="selectedChar">

        <!-- En-tête personnage -->
        <!-- <div class="char-header" :class="`char-header--${selectedChar.class.toLowerCase()}`">
          <div>
            <div class="char-header-class">{{ selectedChar.class }}</div>
            <div class="char-header-sub">{{ selectedChar.race }}<span v-if="selectedChar.subclass"> · {{ selectedChar.subclass }}</span></div>
          </div>
          <div class="char-header-power"><span>✦</span> {{ selectedChar.power }}</div>
        </div> -->

        <!-- Corps équipement : armes | logo | armure -->
        <div class="char-equip-body">

          <!-- ── Colonne Armes ── -->
          <div class="char-equip-col">
            <div class="char-col-label">Armes</div>
            <div v-for="slot in weaponSlots" :key="slot.key" class="char-equip-row">
              <!-- Slot équipé (cible de drop) -->
              <div
                class="equip-slot tooltip-wrap"
                :class="[slot.item ? slot.item.rarity : 'empty', { 'equip-slot--dragover': dragOverTarget === 'equipped:' + slot.key }]"
                @dragover.prevent="dragOverTarget = 'equipped:' + slot.key"
                @drop.prevent="onDropEquipped(slot)"
              >
                <template v-if="slot.item">
                  <img :src="slot.item.icon" :alt="slot.item.name" class="equip-img" />
                  <div class="equip-power">{{ slot.item.power }}</div>
                  <div class="equip-bar"></div>
                  <div class="tooltip">{{ slot.item.name }}</div>
                </template>
                <span v-else class="equip-empty-label">{{ slot.label }}</span>
              </div>
              <!-- Alternatives inventaire (draggables) -->
              <div class="inv-alts">
                <div
                  v-for="alt in getCharInvByBucket(slot.bucketHash)" :key="alt.id"
                  class="inv-alt-item tooltip-wrap" :class="alt.rarity"
                  draggable="true"
                  @dragstart="onDragStart(alt, 'char-inventory')"
                  @dragend="onDragEnd"
                  @click="selectItem(alt)"
                >
                  <img v-if="alt.icon" :src="alt.icon" :alt="alt.name" class="inv-alt-img" />
                  <span v-else class="inv-alt-ph">?</span>
                  <div class="inv-alt-power">{{ alt.power }}</div>
                  <div class="inv-alt-bar"></div>
                  <div class="tooltip">{{ alt.name }}</div>
                </div>
                <span v-if="!getCharInvByBucket(slot.bucketHash).length" class="inv-alts-empty">—</span>
              </div>
            </div>
            <!-- Badge lumière -->
            <div class="char-light-badge">
              <span class="char-light-star">✦</span>
              <span class="char-light-val">{{ selectedChar.power }}</span>
            </div>
          </div>

          <!-- ── Colonne Armure ── -->
          <div class="char-equip-col">
            <div class="char-col-label">Armure</div>
            <div v-for="slot in armorSlots" :key="slot.key" class="char-equip-row">
              <div
                class="equip-slot tooltip-wrap"
                :class="[slot.item ? slot.item.rarity : 'empty', { 'equip-slot--dragover': dragOverTarget === 'equipped:' + slot.key }]"
                @dragover.prevent="dragOverTarget = 'equipped:' + slot.key"
                @drop.prevent="onDropEquipped(slot)"
              >
                <template v-if="slot.item">
                  <img :src="slot.item.icon" :alt="slot.item.name" class="equip-img" />
                  <div class="equip-power">{{ slot.item.power }}</div>
                  <div class="equip-bar"></div>
                  <div class="tooltip">{{ slot.item.name }}</div>
                </template>
                <span v-else class="equip-empty-label">{{ slot.label }}</span>
              </div>
              <div class="inv-alts">
                <div
                  v-for="alt in getCharInvByBucket(slot.bucketHash)" :key="alt.id"
                  class="inv-alt-item tooltip-wrap" :class="alt.rarity"
                  draggable="true"
                  @dragstart="onDragStart(alt, 'char-inventory')"
                  @dragend="onDragEnd"
                  @click="selectItem(alt)"
                >
                  <img v-if="alt.icon" :src="alt.icon" :alt="alt.name" class="inv-alt-img" />
                  <span v-else class="inv-alt-ph">?</span>
                  <div class="inv-alt-power">{{ alt.power }}</div>
                  <div class="inv-alt-bar"></div>
                  <div class="tooltip">{{ alt.name }}</div>
                </div>
                <span v-if="!getCharInvByBucket(slot.bucketHash).length" class="inv-alts-empty">—</span>
              </div>
            </div>
          </div>

        </div>
      </template>

      <div class="char-panel-empty" v-else-if="!loading">
        <p>Aucun gardien disponible</p>
      </div>
    </div>

    <!-- ══ PANNEAU DROIT : VAULT ══ -->
    <div
      class="vault-panel"
      :class="{ 'vault-panel--dragover': dragOverTarget === 'vault' }"
      @dragover.prevent="dragOverTarget = 'vault'"
      @dragleave.self="dragOverTarget = null"
      @drop.prevent="onDropVault"
    >
      <!-- En-tête vault -->
      <div class="vault-panel-topbar">
        <span class="vault-panel-title">COFFRE</span>
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
        <div class="vault-drop-hint" v-if="dragging?.from === 'char-inventory'">
          ⬇ Dépose ici pour envoyer au coffre
        </div>
      </div>

      <!-- Filtres -->
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
      </div>

      <!-- Items du coffre (scrollable) -->
      <div class="vault-scroll">
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
              draggable="true"
              @dragstart="onDragStart(item, 'vault')"
              @dragend="onDragEnd"
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
            <div v-if="filteredVault[section.key].length === 0" class="empty-section">Aucun item</div>
          </div>
        </template>
      </div>
    </div>

  </main>

  <!-- ITEM DETAIL MODAL -->
  <ItemDetailModal
    v-if="selectedItem"
    :item="selectedItem"
    :detail="itemDetail"
    :loading="detailLoading"
    :characters="characters"
    @close="selectedItem = null"
    @transfer="handleTransfer"
  />

  <!-- TOAST -->
  <div class="toast" :class="{show: toastVisible}">
    <div class="toast-dot"></div>
    {{ toastMessage }}
  </div>

  <!-- NOTIFICATIONS DE TRANSFERT -->
  <TransitionGroup name="notif" tag="div" class="notif-stack">
    <div
      v-for="n in notifications"
      :key="n.id"
      class="notif-card"
      :class="'notif-card--' + n.status"
    >
      <div class="notif-img-wrap">
        <img v-if="n.icon" :src="n.icon" :alt="n.name" class="notif-img" />
        <div v-else class="notif-img-ph">?</div>
        <span class="notif-status-dot" :class="'notif-dot--' + n.status"></span>
      </div>
      <div class="notif-text">
        <span class="notif-name">{{ n.name }}</span>
        <span class="notif-dest">{{ n.destination }}</span>
      </div>
    </div>
  </TransitionGroup>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ItemDetailModal from '../component/ItemDetailModal.vue'

const route  = useRoute()
const router = useRouter()
const API    = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Auth ─────────────────────────────────────────────────────────────────
const displayName  = ref('')
const userInitials = ref('GD')
const loading      = ref(true)
const reloading    = ref(false)
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

// ── Data ─────────────────────────────────────────────────────────────────
const characters = ref([])
const vault = ref({
  kinetic: [], energy: [], power: [],
  helmet: [], gauntlets: [], chest: [], legs: [], classItem: []
})

// ── Sélecteur de personnage ───────────────────────────────────────────────
const selectedCharId = ref(null)
const selectedChar   = computed(() => characters.value.find(c => c.id === selectedCharId.value) || null)

const weaponSlots = computed(() => {
  if (!selectedChar.value) return []
  return [
    { key: 'kinetic',  label: 'Cinétique', bucketHash: 1498876634, item: selectedChar.value.weapons.kinetic },
    { key: 'energy',   label: 'Énergie',   bucketHash: 2465295065, item: selectedChar.value.weapons.energy  },
    { key: 'power',    label: 'Puissance', bucketHash: 953998645,  item: selectedChar.value.weapons.power   },
  ]
})
const armorSlots = computed(() => {
  if (!selectedChar.value) return []
  return [
    { key: 'helmet',    label: 'Casque',    bucketHash: 3448274439, item: selectedChar.value.armor.helmet    },
    { key: 'gauntlets', label: 'Gantelets', bucketHash: 3551918588, item: selectedChar.value.armor.gauntlets },
    { key: 'chest',     label: 'Torse',     bucketHash: 14239492,   item: selectedChar.value.armor.chest     },
    { key: 'legs',      label: 'Jambes',    bucketHash: 20886954,   item: selectedChar.value.armor.legs      },
    { key: 'classItem', label: 'Classe',    bucketHash: 1585787867, item: selectedChar.value.armor.classItem },
  ]
})

function getCharInvByBucket(bucketHash) {
  return selectedChar.value?.inventory?.filter(i => i.bucketHash === bucketHash) || []
}

function classTabIcon(cls) {
  if (cls === 'Titan')    return '⬡'
  if (cls === 'Chasseur') return '◇'
  return '✦'
}

// ── Vault sections ────────────────────────────────────────────────────────
const vaultSections = [
  { key: 'kinetic',   label: 'Armes — Cinétique',       isArmor: false },
  { key: 'energy',    label: 'Armes — Énergie',          isArmor: false },
  { key: 'power',     label: 'Armes — Puissance',        isArmor: false },
  { key: 'helmet',    label: 'Armure — Casque',          isArmor: true  },
  { key: 'gauntlets', label: 'Armure — Gantelets',       isArmor: true  },
  { key: 'chest',     label: 'Armure — Torse',           isArmor: true  },
  { key: 'legs',      label: 'Armure — Jambes',          isArmor: true  },
  { key: 'classItem', label: 'Armure — Objet de classe', isArmor: true  },
]
const collapsed = ref({
  kinetic: false, energy: false, power: false,
  helmet: true, gauntlets: true, chest: true, legs: true, classItem: true
})
function toggleSection(key) { collapsed.value[key] = !collapsed.value[key] }

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
function isDimmed(section, item) {
  if (!section.isArmor || activeClassFilter.value === 'Tout') return false
  if (item.guardianClass === 'Universel') return false
  return item.guardianClass !== activeClassFilter.value
}

const searchQuery = ref('')
const filteredVault = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const filter = list => sortItems(q ? list.filter(i => i.name.toLowerCase().includes(q)) : list)
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
const totalVault    = computed(() => Object.values(vault.value).reduce((s, a) => s + a.length, 0))
const vaultCapacity = ref('—')
const exoticCount   = computed(() => Object.values(vault.value).flat().filter(i => i.rarity === 'exotic').length)

// ── Chargement données ────────────────────────────────────────────────────
async function fetchDestinyData(token) {
  try {
    const res = await fetch(`${API}/api/me/destiny`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.status === 401) { localStorage.removeItem('app_token'); router.push('/login'); return }
    if (!res.ok) { bungieError.value = 'Impossible de charger les données Bungie.'; return }
    const data = await res.json()
    vault.value      = data.vault      || vault.value
    characters.value = data.characters || []
    vaultCapacity.value = data.vaultCapacity ?? '—'

    // Sélectionner le bon personnage (query param ou premier par défaut)
    if (!selectedCharId.value || !characters.value.find(c => c.id === selectedCharId.value)) {
      const qId = route.query.charId
      selectedCharId.value = (qId && characters.value.find(c => c.id === qId))
        ? qId
        : characters.value[0]?.id || null
    }
    if (data.displayName) {
      displayName.value = data.displayName
      const parts = data.displayName.replace('#', ' ').split(/\s+/)
      userInitials.value = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : data.displayName.slice(0, 2).toUpperCase()
    }
  } catch { bungieError.value = 'Erreur réseau.' }
  finally  { loading.value = false }
}

async function reloadData() {
  const token = localStorage.getItem('app_token')
  if (!token || reloading.value) return
  reloading.value = true
  await fetchDestinyData(token)
  reloading.value = false
}

onMounted(async () => {
  const stored = localStorage.getItem('app_token')
  if (!stored) { router.push('/login'); return }
  applyUser(stored)
  await fetchDestinyData(stored)
})

// ── Drag & Drop ───────────────────────────────────────────────────────────
const dragging      = ref(null)
const dragOverTarget = ref(null)

function onDragStart(item, from) { dragging.value = { item, from } }
function onDragEnd()             { dragging.value = null; dragOverTarget.value = null }

// bucketHash → clé de section vault/slot
const BUCKET_KEY = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645:  'power',
  3448274439: 'helmet',
  3551918588: 'gauntlets',
  14239492:   'chest',
  20886954:   'legs',
  1585787867: 'classItem',
}
function _equippedGroup(key) {
  return ['kinetic', 'energy', 'power'].includes(key) ? 'weapons' : 'armor'
}

// ── Notifications de transfert ────────────────────────────────────────────
const notifications = ref([])
const isProcessing  = ref(false)
let _innerQueue     = []
let _qid            = 0

function enqueueAction(info, fn) {
  const id = ++_qid
  notifications.value.push({ id, name: info.name, icon: info.icon, destination: info.destination, status: 'pending' })
  _innerQueue.push({ id, fn })
  if (!isProcessing.value) _drainQueue()
}

async function _drainQueue() {
  if (isProcessing.value) return
  isProcessing.value = true
  while (_innerQueue.length > 0) {
    const { id, fn } = _innerQueue.shift()
    const entry = notifications.value.find(n => n.id === id)
    if (entry) entry.status = 'running'
    try {
      await fn()
      if (entry) entry.status = 'done'
    } catch {
      if (entry) entry.status = 'error'
    }
    await new Promise(r => setTimeout(r, 600))
    notifications.value = notifications.value.filter(n => n.id !== id)
  }
  isProcessing.value = false
}

// Drop sur un slot équipé : transfer+equip (vault) ou equip direct (inventaire char)
function onDropEquipped(slot) {
  const src       = dragging.value
  const char      = selectedChar.value
  const charId    = char?.id
  const charClass = char?.class || ''
  dragOverTarget.value = null
  dragging.value = null
  if (!src || !charId || !char) return

  const group      = _equippedGroup(slot.key)
  const oldEquipped = char[group][slot.key] || null

  // Mise à jour optimiste : item visible dans le slot immédiatement
  char[group][slot.key] = src.item
  if (src.from === 'vault') {
    vault.value[slot.key] = (vault.value[slot.key] || []).filter(i => i.id !== src.item.id)
    if (oldEquipped) char.inventory = [oldEquipped, ...(char.inventory || [])]
  } else {
    char.inventory = (char.inventory || []).filter(i => i.id !== src.item.id)
    if (oldEquipped) char.inventory = [oldEquipped, ...char.inventory]
  }

  enqueueAction({ name: src.item.name, icon: src.item.icon, destination: `Équiper — ${charClass}` }, async () => {
    const token = localStorage.getItem('app_token')
    try {
      if (src.from === 'vault') {
        const r1 = await fetch(`${API}/api/me/transfer-item`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceId: src.item.id, itemHash: src.item.itemHash, transferToVault: false, characterId: charId })
        })
        const d1 = await r1.json()
        if (!r1.ok) throw new Error(d1.error || 'Erreur transfert')
      }
      const r2 = await fetch(`${API}/api/me/equip-item`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: src.item.id, characterId: charId })
      })
      const d2 = await r2.json()
      if (!r2.ok) throw new Error(d2.error || 'Erreur equipement')
      detailCache.delete(src.item.id)
    } catch (e) {
      // Resync depuis Bungie (corrige les données périmées)
      const t = localStorage.getItem('app_token')
      if (t) await fetchDestinyData(t)
      showToast(`❌ ${e.message}`)
      throw e
    }
  })
}

// Drop sur le panneau perso (hors slot équipé) : vault → inventaire char
function onDropCharPanel() {
  const src       = dragging.value
  const char      = selectedChar.value
  const charId    = char?.id
  const charClass = char?.class || ''
  dragOverTarget.value = null
  dragging.value = null
  if (!src || src.from !== 'vault' || !charId || !char) return

  const sectionKey = BUCKET_KEY[src.item.bucketHash] || null

  // Mise à jour optimiste
  if (sectionKey) vault.value[sectionKey] = (vault.value[sectionKey] || []).filter(i => i.id !== src.item.id)
  char.inventory = [...(char.inventory || []), src.item]

  enqueueAction({ name: src.item.name, icon: src.item.icon, destination: charClass }, async () => {
    const token = localStorage.getItem('app_token')
    try {
      const r = await fetch(`${API}/api/me/transfer-item`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: src.item.id, itemHash: src.item.itemHash, transferToVault: false, characterId: charId })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erreur transfert')
      detailCache.delete(src.item.id)
    } catch (e) {
      // Resync depuis Bungie (corrige les données périmées)
      const t = localStorage.getItem('app_token')
      if (t) await fetchDestinyData(t)
      showToast(`❌ ${e.message}`)
      throw e
    }
  })
}

// Drop sur le vault : inventaire char → coffre
function onDropVault() {
  const src    = dragging.value
  const char   = selectedChar.value
  const charId = char?.id
  dragOverTarget.value = null
  dragging.value = null
  if (!src || src.from !== 'char-inventory' || !charId || !char) return

  const sectionKey = BUCKET_KEY[src.item.bucketHash] || null

  // Mise à jour optimiste
  char.inventory = (char.inventory || []).filter(i => i.id !== src.item.id)
  if (sectionKey) vault.value[sectionKey] = [...(vault.value[sectionKey] || []), src.item]

  enqueueAction({ name: src.item.name, icon: src.item.icon, destination: 'Coffre' }, async () => {
    const token = localStorage.getItem('app_token')
    try {
      const r = await fetch(`${API}/api/me/transfer-item`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: src.item.id, itemHash: src.item.itemHash, transferToVault: true, characterId: charId })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erreur transfert')
      detailCache.delete(src.item.id)
    } catch (e) {
      // Resync depuis Bungie (corrige les données périmées)
      const t = localStorage.getItem('app_token')
      if (t) await fetchDestinyData(t)
      showToast(`❌ ${e.message}`)
      throw e
    }
  })
}

// ── Item detail (modal) ───────────────────────────────────────────────────
const selectedItem  = ref(null)
const itemDetail    = ref(null)
const detailLoading = ref(false)
const detailCache   = new Map()

async function selectItem(item) {
  selectedItem.value  = item
  itemDetail.value    = null
  if (!item.instanced) return
  if (detailCache.has(item.id)) { itemDetail.value = detailCache.get(item.id); return }
  detailLoading.value = true
  try {
    const token = localStorage.getItem('app_token')
    const res   = await fetch(`${API}/api/me/item-detail/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) { const data = await res.json(); detailCache.set(item.id, data); itemDetail.value = data }
  } catch { /* silencieux */ } finally { detailLoading.value = false }
}

// ── Toast ─────────────────────────────────────────────────────────────────
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null
const showToast = (msg) => {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2800)
}

// ── Transfer depuis la modal ──────────────────────────────────────────────
async function handleTransfer({ instanceId, itemHash, transferToVault, characterId }) {
  try {
    const token = localStorage.getItem('app_token')
    const res = await fetch(`${API}/api/me/transfer-item`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, itemHash, transferToVault, characterId })
    })
    const data = await res.json()
    if (!res.ok) { showToast(`❌ ${data.error || 'Erreur de transfert'}`); return }
    showToast(transferToVault ? '✅ Envoyé dans le coffre' : '✅ Transféré au gardien')
    detailCache.delete(instanceId)
    selectedItem.value = null
    const stored = localStorage.getItem('app_token')
    if (stored) await fetchDestinyData(stored)
  } catch { showToast('❌ Erreur réseau lors du transfert') }
}
</script>

<style>
/* ─── VAULT SPLIT LAYOUT ─── */
.app-root { overflow-x: hidden }
.app-root > main { min-width: 0 }
.app-root > main.vault-main {
  padding: 0;
  flex-direction: row;
  height: calc(100vh - 60px);
  overflow: hidden;
  gap: 0;
}

/* ─── PANNEAU GAUCHE PERSONNAGE ─── */
.char-panel {
  width: 460px;
  min-width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--space-indigo);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 20px;
  gap: 16px;
  transition: background .2s;
}
.char-panel--dragover { background: rgba(145,142,244,.06) }

/* Tabs personnage */
.char-tabs { display: flex; gap: 6px }
.char-tab {
  flex: 1; padding: 8px 10px;
  border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted);
  font-family: 'Rajdhani', sans-serif; font-size: 13px;
  font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  cursor: pointer; transition: all .2s;
  display: flex; align-items: center; gap: 6px; justify-content: center;
}
.char-tab:hover { color: var(--cornflower); border-color: rgba(111,156,235,.3) }
.char-tab.active { background: rgba(145,142,244,.15); border-color: rgba(145,142,244,.35); color: var(--soft-periwinkle) }
.char-tab--titan.active   { background: rgba(48,107,172,.15); border-color: rgba(48,107,172,.45); color: #6db4e8 }
.char-tab--chasseur.active{ background: rgba(111,156,235,.12); border-color: rgba(111,156,235,.4); color: var(--cornflower) }
.char-tab-icon { font-size: 14px }

/* En-tête personnage */
.char-header {
  padding: 12px 14px; border-radius: 10px;
  background: linear-gradient(135deg, var(--surface-2), var(--space-indigo));
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  border-left: 3px solid var(--soft-periwinkle);
}
.char-header--titan    { border-left-color: var(--ocean-deep) }
.char-header--chasseur { border-left-color: var(--cornflower) }
.char-header-class {
  font-family: 'Rajdhani', sans-serif; font-size: 17px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase; color: var(--soft-periwinkle);
}
.char-header--titan    .char-header-class { color: #6db4e8 }
.char-header--chasseur .char-header-class { color: var(--cornflower) }
.char-header-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px }
.char-header-power {
  font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700;
  color: #f4c441; display: flex; align-items: center; gap: 4px;
}
.char-header-power span { font-size: 13px }

/* Corps équipement */
.char-equip-body { display: flex; gap: 16px; align-items: flex-start }
.char-equip-col  { display: flex; flex-direction: column; gap: 6px }
.char-col-label  {
  font-family: 'Exo 2', sans-serif; font-size: 10px; font-weight: 600;
  letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted);
  margin-bottom: 2px;
}
.char-equip-row { display: flex; align-items: center; gap: 6px }

/* Slot équipé */
.equip-slot {
  width: 56px; height: 56px; flex-shrink: 0;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); position: relative;
  display: flex; align-items: center; justify-content: center;
  cursor: default; transition: border-color .15s, box-shadow .15s;
}
.equip-slot.exotic    { border-color: rgba(244,196,65,.45);  background: linear-gradient(135deg,rgba(244,196,65,.07),var(--surface)) }
.equip-slot.legendary { border-color: rgba(145,102,197,.45); background: linear-gradient(135deg,rgba(145,102,197,.07),var(--surface)) }
.equip-slot.rare      { border-color: rgba(48,107,172,.4) }
.equip-slot.empty     { border-style: dashed; opacity: .35 }
.equip-slot--dragover {
  border-color: var(--soft-periwinkle) !important;
  box-shadow: 0 0 14px rgba(145,142,244,.45);
  background: rgba(145,142,244,.1) !important;
}
.equip-img   { width: 38px; height: 38px; object-fit: contain }
.equip-power {
  position: absolute; bottom: 2px; right: 3px;
  font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700; color: #f4c441;
}
.equip-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px }
.equip-slot.exotic    .equip-bar { background: #f4c441 }
.equip-slot.legendary .equip-bar { background: #9166c5 }
.equip-slot.rare      .equip-bar { background: var(--ocean-deep) }
.equip-empty-label { font-size: 9px; color: var(--text-muted); text-align: center; padding: 4px; line-height: 1.2 }

/* Alternatives inventaire */
.inv-alts {
  display: flex; flex-wrap: wrap; gap: 4px;
  max-width: 116px; /* 3 × 36px + 2 × 4px gap */
}
.inv-alt-item {
  width: 36px; height: 36px; border-radius: 5px;
  border: 1px solid rgba(255,255,255,.1);
  background: var(--surface); position: relative;
  display: flex; align-items: center; justify-content: center;
  cursor: grab; transition: border-color .15s, transform .12s;
}
.inv-alt-item:hover        { border-color: var(--cornflower); transform: scale(1.06); z-index: 2 }
.inv-alt-item:active       { cursor: grabbing }
.inv-alt-item.exotic    { border-color: rgba(244,196,65,.5);  background: linear-gradient(135deg,rgba(244,196,65,.08),var(--surface)) }
.inv-alt-item.legendary { border-color: rgba(145,102,197,.45); background: linear-gradient(135deg,rgba(145,102,197,.08),var(--surface)) }
.inv-alt-item.rare      { border-color: rgba(48,107,172,.4) }
.inv-alt-img   { width: 24px; height: 24px; object-fit: contain; display: block }
.inv-alt-ph    { font-size: 14px; color: var(--text-muted) }
.inv-alt-power {
  position: absolute; bottom: 1px; right: 2px;
  font-family: 'Rajdhani', sans-serif; font-size: 9px; font-weight: 700; color: #f4c441;
}
.inv-alt-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px }
.inv-alt-item.exotic    .inv-alt-bar { background: #f4c441 }
.inv-alt-item.legendary .inv-alt-bar { background: #9166c5 }
.inv-alt-item.rare      .inv-alt-bar { background: var(--ocean-deep) }
.inv-alts-empty { font-size: 11px; color: var(--text-muted); opacity: .5; padding: 12px 0 0 6px }

/* Logo de classe central */
/* char-logo-center removed */

/* Badge lumière */
.char-light-badge {
  margin-top: 4px; display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; background: rgba(244,196,65,.07);
  border: 1px solid rgba(244,196,65,.22); border-radius: 8px; width: fit-content;
}
.char-light-star { color: #f4c441; font-size: 11px }
.char-light-val  {
  font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; color: #f4c441;
}

/* État vide panneau personnage */
.char-panel-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 13px;
}

/* ─── PANNEAU DROIT VAULT ─── */
.vault-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; padding: 20px; gap: 12px;
  transition: background .2s;
}
.vault-panel--dragover { background: rgba(145,142,244,.04) }

.vault-panel-topbar {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.vault-panel-title {
  font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase; color: var(--cornflower);
  display: flex; align-items: center; gap: 8px;
}
.vault-panel-title::before {
  content: ''; display: block; width: 16px; height: 2px;
  background: var(--cornflower); box-shadow: 0 0 6px var(--cornflower);
}
.vault-drop-hint {
  margin-left: auto; font-size: 12px; color: var(--soft-periwinkle);
  background: rgba(145,142,244,.1); border: 1px dashed rgba(145,142,244,.35);
  border-radius: 6px; padding: 4px 10px; animation: pulse-hint 1.4s ease infinite;
}
@keyframes pulse-hint { 0%,100%{opacity:.7} 50%{opacity:1} }

/* Scrollable zone vault */
.vault-scroll { flex: 1; overflow-y: auto; padding-right: 4px }
.vault-scroll::-webkit-scrollbar       { width: 4px }
.vault-scroll::-webkit-scrollbar-track { background: transparent }
.vault-scroll::-webkit-scrollbar-thumb { background: rgba(111,156,235,.25); border-radius: 2px }

/* Curseur drag sur les items du vault */
.item-slot[draggable="true"] { cursor: grab }
.item-slot[draggable="true"]:active { cursor: grabbing }

/* ─── NOTIFICATIONS DE TRANSFERT ─── */
.notif-stack {
  position: fixed; bottom: 20px; right: 20px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 1000; pointer-events: none;
}
.notif-card {
  display: flex; align-items: center; gap: 12px;
  background: rgba(18, 16, 36, 0.92);
  border: 1px solid rgba(145,142,244,.25);
  border-radius: 10px; padding: 10px 14px;
  min-width: 240px; max-width: 310px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0,0,0,.55);
  transition: border-color .2s;
}
.notif-card--running { border-color: rgba(145,142,244,.55) }
.notif-card--done    { border-color: rgba(92,201,139,.45) }
.notif-card--error   { border-color: rgba(224,108,108,.45) }

.notif-img-wrap {
  position: relative; flex-shrink: 0;
  width: 42px; height: 42px;
}
.notif-img {
  width: 42px; height: 42px;
  border-radius: 6px; object-fit: contain;
  display: block;
}
.notif-img-ph {
  width: 42px; height: 42px;
  border-radius: 6px; background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--text-muted);
}
.notif-status-dot {
  position: absolute; bottom: -2px; right: -2px;
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid rgba(18,16,36,.9);
}
.notif-dot--pending { background: rgba(145,142,244,.5) }
.notif-dot--running { background: var(--cornflower); animation: dot-pulse .8s ease infinite }
.notif-dot--done    { background: #5cc98b }
.notif-dot--error   { background: #e06c6c }
@keyframes dot-pulse { 0%,100%{opacity:.6;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }

.notif-text {
  display: flex; flex-direction: column; gap: 2px;
  overflow: hidden;
}
.notif-name {
  font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700;
  color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notif-dest {
  font-size: 11px; color: var(--text-muted);
  letter-spacing: .5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.notif-enter-active { transition: opacity .2s, transform .2s }
.notif-leave-active { transition: opacity .25s, transform .25s }
.notif-enter-from   { opacity: 0; transform: translateX(20px) }
.notif-leave-to     { opacity: 0; transform: translateX(20px) }
.notif-move         { transition: transform .3s }
</style>
