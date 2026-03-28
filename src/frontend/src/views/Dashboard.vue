<template>
<div class="app-root">

  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,2 34,30 2,30" fill="none" stroke="#918EF4" stroke-width="2"/>
        <polygon points="18,10 28,27 8,27" fill="rgba(145,142,244,0.15)" stroke="#6F9CEB" stroke-width="1.5"/>
        <circle cx="18" cy="18" r="3" fill="#918EF4"/>
      </svg>
    </div>
    <button
      v-for="nav in navItems" :key="nav.id"
      class="nav-btn"
      :class="{active: activeNav === nav.id}"
      :title="nav.label"
      @click="activeNav = nav.id"
    >{{ nav.icon }}</button>
    <div class="sidebar-spacer"></div>
    <button class="nav-btn" title="Paramètres">⚙</button>
    <div class="guardian-avatar">GD</div>
  </aside>

  <!-- ── HEADER ── -->
  <header class="header">
    <div class="header-left">
      <span class="page-title">Guardian Ledger</span>
      <span class="season-badge">Season of the Cipher · S26</span>
    </div>
    <div class="header-right">
      <div class="power-level">
        <span class="power-icon">✦</span>
        <div>
          <div class="power-num">{{ character.power }}</div>
          <div class="power-label">Power Level</div>
        </div>
      </div>
      <input
        class="search-bar"
        type="text"
        placeholder="🔍  Rechercher un item..."
        v-model="searchQuery"
      >
    </div>
  </header>

  <!-- ── MAIN ── -->
  <main class="main">

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card" v-for="s in stats" :key="s.label">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-sub">
          <span :class="s.trend > 0 ? 'up' : 'down'">
            {{ s.trend > 0 ? '▲' : '▼' }} {{ Math.abs(s.trend) }}
          </span>
          {{ s.sub }}
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-grid">

      <!-- Left: inventory -->
      <div>
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
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-power">{{ item.power }}</div>
            <div class="item-type-bar"></div>
            <div class="tooltip">{{ item.name }}</div>
          </div>
          <div class="item-slot empty" v-for="n in emptySlots(filteredWeapons, 15)" :key="'ew'+n"></div>
        </div>

        <!-- Armor -->
        <div class="section-header" style="margin-top:24px">
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
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-power">{{ item.power }}</div>
            <div class="item-type-bar"></div>
            <div class="tooltip">{{ item.name }}</div>
          </div>
          <div class="item-slot empty" v-for="n in emptySlots(filteredArmor, 8)" :key="'ea'+n"></div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="right-panel">

        <!-- Character card -->
        <div class="character-card">
          <div class="char-header">
            <div class="char-class">{{ character.class }}</div>
            <div class="char-race">{{ character.race }} · {{ character.subclass }}</div>
            <div class="char-power-display">
              <div class="char-power-num">{{ character.power }}</div>
              <div class="char-power-label">Puissance</div>
            </div>
          </div>
          <div class="equipment-grid">
            <div class="equip-slot" v-for="eq in character.equipped" :key="eq.slot">
              <span class="equip-icon">{{ eq.icon }}</span>
              <div class="equip-info">
                <div class="equip-name">{{ eq.name }}</div>
                <div class="equip-power">{{ eq.power }}</div>
              </div>
            </div>
          </div>
          <div class="char-xp">
            <div class="progress-bar-wrap">
              <div class="progress-label">
                <span>XP Saison</span>
                <span>Niveau {{ character.seasonLevel }}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{width: character.xpPercent + '%'}"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activities -->
        <div class="activities-card">
          <div class="section-header">
            <span class="section-title">Activités du jour</span>
          </div>
          <div class="activity-list">
            <div
              class="activity-item"
              v-for="act in activities" :key="act.name"
              @click="showToast('Lancement : ' + act.name)"
            >
              <div class="activity-icon" :style="{background: act.bg}">{{ act.icon }}</div>
              <div class="activity-info">
                <div class="activity-name">{{ act.name }}</div>
                <div class="activity-sub">{{ act.sub }}</div>
              </div>
              <span class="activity-reward">{{ act.reward }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

  </main>

  <!-- ── ITEM DETAIL OVERLAY ── -->
  <div class="item-selected-overlay" v-if="selectedItem" @click.self="selectedItem = null">
    <div class="item-detail">
      <button class="item-detail-close" @click="selectedItem = null">✕</button>
      <div class="item-detail-icon">{{ selectedItem.icon }}</div>
      <div class="item-detail-name">{{ selectedItem.name }}</div>
      <div class="item-detail-rarity">{{ selectedItem.rarity }} · {{ selectedItem.type }}</div>
      <div class="item-detail-power">{{ selectedItem.power }}</div>
      <div class="item-detail-power-label">Niveau de puissance</div>
      <div class="item-detail-actions">
        <button class="btn-primary" @click="equipItem(selectedItem)">Équiper</button>
        <button class="btn-secondary" @click="transferItem(selectedItem)">Transférer</button>
      </div>
    </div>
  </div>

  <!-- ── TOAST ── -->
  <div class="toast" :class="{show: toastVisible}">
    <div class="toast-dot"></div>
    {{ toastMessage }}
  </div>

</div>
</template>

<script setup>
import { ref, computed } from 'vue'

    // ── Navigation ──
    const navItems = [
      { id: 'vault',       icon: '⊞', label: 'Vault' },
      { id: 'characters',  icon: '◈', label: 'Personnages' },
      { id: 'collections', icon: '⊡', label: 'Collections' },
      { id: 'triumphs',    icon: '✦', label: 'Triomphes' },
      { id: 'map',         icon: '◎', label: 'Carte' },
      { id: 'season',      icon: '⊕', label: 'Season Pass' },
    ]
    const activeNav = ref('vault')

    // ── Stats ──
    const stats = ref([
      { label: 'Items en vault',       value: '347', trend: -3,  sub: 'depuis hier' },
      { label: 'Exotiques collectés',  value: '84',  trend: 2,   sub: 'nouveaux cette semaine' },
      { label: 'Puissance moyenne',    value: '1972',trend: 18,  sub: 'ce mois' },
      { label: 'Glimmer',              value: '248K', trend: -2, sub: 'plafond à 250K' },
    ])

    // ── Character ──
    const character = ref({
      class: 'Chasseur',
      race: 'Humain',
      subclass: 'Crépusculaire',
      power: 1985,
      seasonLevel: 142,
      xpPercent: 67,
      equipped: [
        { slot: 'helmet',  icon: '🪖', name: 'Calus Mini-Tool',    power: 1990 },
        { slot: 'chest',   icon: '🦺', name: 'Syntho Chasseur',    power: 1985 },
        { slot: 'heavy',   icon: '🔫', name: 'Gjallarhorn',        power: 1988 },
        { slot: 'gloves',  icon: '🧤', name: 'Gants Ahamkara',     power: 1984 },
      ]
    })

    // ── Weapons ──
    const searchQuery = ref('')
    const weaponTabs = ['Tout', 'Cinétique', 'Énergie', 'Puissance']
    const activeWeaponTab = ref('Tout')
    const armorTabs = ['Tout', 'Casque', 'Torse', 'Jambes']
    const activeArmorTab = ref('Tout')

    const weapons = ref([
      { id:'w1',  name:'Gjallarhorn',          icon:'🔫', power:1990, rarity:'exotic',    type:'Cinétique' },
      { id:'w2',  name:'Le Destin Ardent',     icon:'🏹', power:1985, rarity:'exotic',    type:'Énergie' },
      { id:'w3',  name:'Wendigo GL3',           icon:'🔧', power:1982, rarity:'legendary', type:'Puissance' },
      { id:'w4',  name:'Félicitations',         icon:'⚔️', power:1980, rarity:'legendary', type:'Cinétique' },
      { id:'w5',  name:'Brise-talons',          icon:'🪃', power:1978, rarity:'legendary', type:'Énergie' },
      { id:'w6',  name:'Alésage de précision',  icon:'🔩', power:1965, rarity:'rare',      type:'Cinétique' },
      { id:'w7',  name:'Lame de Crépuscule',    icon:'🗡️', power:1983, rarity:'legendary', type:'Énergie' },
      { id:'w8',  name:'Invective',             icon:'💥', power:1988, rarity:'exotic',    type:'Cinétique' },
      { id:'w9',  name:'Complice',              icon:'🔫', power:1960, rarity:'rare',      type:'Puissance' },
      { id:'w10', name:'Mémoire de Nezarec',    icon:'🎯', power:1979, rarity:'legendary', type:'Énergie' },
      { id:'w11', name:'Scories stellaires',    icon:'🪚', power:1940, rarity:'common',    type:'Cinétique' },
      { id:'w12', name:'Tonnerre du Vide',      icon:'⚡', power:1982, rarity:'legendary', type:'Puissance' },
    ])

    const armor = ref([
      { id:'a1', name:'Casque du Dernier Souffle', icon:'🪖', power:1990, rarity:'exotic',    type:'Casque' },
      { id:'a2', name:'Plastron Syntho',           icon:'🦺', power:1985, rarity:'legendary', type:'Torse' },
      { id:'a3', name:'Gants Ahamkara',            icon:'🧤', power:1984, rarity:'legendary', type:'Mains' },
      { id:'a4', name:'Bottes de Skullfort',       icon:'👟', power:1981, rarity:'legendary', type:'Jambes' },
      { id:'a5', name:'Fragment de Lumière',        icon:'💎', power:1970, rarity:'rare',      type:'Casque' },
      { id:'a6', name:'Marque du Bouclier',         icon:'🛡️', power:1982, rarity:'legendary', type:'Torse' },
    ])

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

    // ── Activities ──
    const activities = ref([
      { name:'Raid — Caverne des Ombres', icon:'🌙', sub:'Recommandé · 1970+',       reward:'+12 000', bg:'rgba(145,142,244,.15)' },
      { name:'Épreuve d\'Osiris',          icon:'⚡', sub:'3 victoires restantes',    reward:'Exotique', bg:'rgba(48,107,172,.15)'  },
      { name:'Contrat journalier',          icon:'🎯', sub:'Tuer 50 Cabales',          reward:'2 500 XP', bg:'rgba(111,156,235,.10)' },
    ])

    // ── Item detail ──
    const selectedItem = ref(null)
    const selectItem = (item) => { selectedItem.value = item }
    const equipItem = (item) => {
      showToast(`${item.name} équipé !`)
      selectedItem.value = null
    }
    const transferItem = (item) => {
      showToast(`${item.name} transféré au coffre.`)
      selectedItem.value = null
    }

    // ── Toast ──
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
  :root {
    --space-indigo:    #141B41;
    --ocean-deep:      #306BAC;
    --cornflower:      #6F9CEB;
    --baby-blue:       #98B9F2;
    --soft-periwinkle: #918EF4;
    --bg:        #0d1230;
    --surface:   #1a2252;
    --surface-2: #1e2a5e;
    --border:    rgba(111,156,235,.15);
    --text:      #c8d8f0;
    --text-muted:#6a85b8;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:'Exo 2',sans-serif;
    background:var(--bg);
    color:var(--text);
    min-height:100vh;
    overflow-x:hidden;
  }
  body::before{
    content:'';position:fixed;inset:0;
    background-image:
      linear-gradient(rgba(48,107,172,.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(48,107,172,.04) 1px,transparent 1px);
    background-size:40px 40px;
    pointer-events:none;z-index:0;
  }
  body::after{
    content:'';position:fixed;top:-30%;right:-10%;
    width:600px;height:600px;
    background:radial-gradient(circle,rgba(145,142,244,.08) 0%,transparent 70%);
    pointer-events:none;z-index:0;
  }

  /* ─── LAYOUT ─── */
  .app-root{display:grid;grid-template-columns:64px 1fr;grid-template-rows:auto 1fr;min-height:100vh;position:relative;z-index:1}

  /* ─── SIDEBAR ─── */
  .sidebar{
    grid-row:1/-1;
    background:var(--space-indigo);
    border-right:1px solid var(--border);
    display:flex;flex-direction:column;align-items:center;
    padding:20px 0;gap:8px;
    position:sticky;top:0;height:100vh;
  }
  .sidebar-logo{width:36px;height:36px;margin-bottom:16px}
  .sidebar-logo svg{width:100%;height:100%}
  .nav-btn{
    width:44px;height:44px;border-radius:10px;
    border:1px solid transparent;background:transparent;
    color:var(--text-muted);cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:all .2s;font-size:18px;position:relative;
  }
  .nav-btn:hover{background:rgba(111,156,235,.1);color:var(--cornflower);border-color:var(--border)}
  .nav-btn.active{background:rgba(145,142,244,.15);color:var(--soft-periwinkle);border-color:rgba(145,142,244,.3)}
  .nav-btn.active::before{
    content:'';position:absolute;left:-1px;top:50%;transform:translateY(-50%);
    width:3px;height:24px;background:var(--soft-periwinkle);
    border-radius:0 2px 2px 0;box-shadow:0 0 8px var(--soft-periwinkle);
  }
  .sidebar-spacer{flex:1}
  .guardian-avatar{
    width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,var(--ocean-deep),var(--soft-periwinkle));
    display:flex;align-items:center;justify-content:center;
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;color:#fff;
    border:2px solid rgba(145,142,244,.4);cursor:pointer;
  }

  /* ─── HEADER ─── */
  .header{
    background:rgba(20,27,65,.8);backdrop-filter:blur(12px);
    border-bottom:1px solid var(--border);
    padding:0 28px;height:60px;
    display:flex;align-items:center;justify-content:space-between;
    position:sticky;top:0;z-index:10;
  }
  .header-left{display:flex;align-items:center;gap:24px}
  .page-title{
    font-family:'Rajdhani',sans-serif;font-size:20px;font-weight:700;
    letter-spacing:2px;text-transform:uppercase;color:var(--baby-blue);
  }
  .season-badge{
    font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600;
    letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);
    background:rgba(48,107,172,.15);border:1px solid rgba(48,107,172,.3);
    padding:4px 10px;border-radius:4px;
  }
  .header-right{display:flex;align-items:center;gap:16px}
  .power-level{display:flex;align-items:center;gap:8px;font-family:'Rajdhani',sans-serif}
  .power-icon{color:#f4c441;font-size:16px}
  .power-num{font-size:22px;font-weight:700;color:#f4c441;letter-spacing:1px}
  .power-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;line-height:1.2}
  .search-bar{
    background:rgba(26,34,82,.8);border:1px solid var(--border);border-radius:8px;
    padding:8px 14px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:13px;
    width:220px;outline:none;transition:border-color .2s;
  }
  .search-bar::placeholder{color:var(--text-muted)}
  .search-bar:focus{border-color:var(--cornflower)}

  /* ─── MAIN ─── */
  .main{padding:24px 28px;display:flex;flex-direction:column;gap:24px}

  /* ─── STAT CARDS ─── */
  .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .stat-card{
    background:var(--surface);border:1px solid var(--border);border-radius:12px;
    padding:20px;position:relative;overflow:hidden;
    transition:transform .2s,border-color .2s;cursor:default;
    animation:fadeUp .4s ease both;
  }
  .stat-card:hover{transform:translateY(-2px);border-color:rgba(111,156,235,.3)}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
  .stat-card:nth-child(1)::before{background:linear-gradient(90deg,var(--ocean-deep),transparent)}
  .stat-card:nth-child(2)::before{background:linear-gradient(90deg,var(--cornflower),transparent)}
  .stat-card:nth-child(3)::before{background:linear-gradient(90deg,var(--soft-periwinkle),transparent)}
  .stat-card:nth-child(4)::before{background:linear-gradient(90deg,var(--baby-blue),transparent)}
  .stat-label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:10px;font-weight:600}
  .stat-value{font-family:'Rajdhani',sans-serif;font-size:32px;font-weight:700;color:var(--baby-blue);line-height:1;margin-bottom:6px}
  .stat-sub{font-size:12px;color:var(--text-muted)}
  .up{color:#6ef4a2}.down{color:#f46e6e}

  /* ─── CONTENT GRID ─── */
  .content-grid{display:grid;grid-template-columns:1fr 320px;gap:24px}

  /* ─── SECTION HEADER ─── */
  .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
  .section-title{
    font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;
    text-transform:uppercase;letter-spacing:2px;color:var(--cornflower);
    display:flex;align-items:center;gap:8px;
  }
  .section-title::before{
    content:'';display:block;width:16px;height:2px;
    background:var(--cornflower);box-shadow:0 0 6px var(--cornflower);
  }
  .filter-tabs{display:flex;gap:4px}
  .filter-tab{
    font-family:'Exo 2',sans-serif;font-size:11px;font-weight:600;
    text-transform:uppercase;letter-spacing:1px;padding:5px 12px;
    border-radius:6px;border:1px solid transparent;cursor:pointer;
    transition:all .15s;color:var(--text-muted);background:transparent;
  }
  .filter-tab:hover{color:var(--cornflower)}
  .filter-tab.active{background:rgba(111,156,235,.12);border-color:rgba(111,156,235,.3);color:var(--cornflower)}

  /* ─── ITEM GRID ─── */
  .item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px}
  .item-slot{
    aspect-ratio:1;background:var(--surface);border:1px solid var(--border);
    border-radius:8px;position:relative;overflow:hidden;cursor:pointer;
    transition:all .2s;display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:4px;animation:fadeUp .3s ease both;
  }
  .item-slot:hover{border-color:var(--cornflower);transform:scale(1.04);z-index:2;box-shadow:0 4px 20px rgba(111,156,235,.2)}
  .item-slot.exotic{border-color:rgba(244,196,65,.4);background:linear-gradient(135deg,rgba(244,196,65,.05),var(--surface))}
  .item-slot.exotic:hover{border-color:#f4c441;box-shadow:0 4px 20px rgba(244,196,65,.25)}
  .item-slot.legendary{border-color:rgba(145,102,197,.4);background:linear-gradient(135deg,rgba(145,102,197,.05),var(--surface))}
  .item-slot.empty{border-style:dashed;opacity:.3}
  .item-icon{font-size:26px;line-height:1}
  .item-power{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;color:#f4c441}
  .item-type-bar{position:absolute;bottom:0;left:0;right:0;height:3px}
  .item-slot.exotic .item-type-bar{background:#f4c441}
  .item-slot.legendary .item-type-bar{background:#9166c5}
  .item-slot.rare .item-type-bar{background:var(--ocean-deep)}
  .item-slot.common .item-type-bar{background:#4a7c59}

  /* ─── RIGHT PANEL ─── */
  .right-panel{display:flex;flex-direction:column;gap:20px}

  /* ─── CHARACTER CARD ─── */
  .character-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
  .char-header{
    background:linear-gradient(135deg,var(--space-indigo),var(--surface-2));
    padding:20px;border-bottom:1px solid var(--border);position:relative;
  }
  .char-header::after{
    content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,var(--soft-periwinkle),transparent);
  }
  .char-class{
    font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;
    letter-spacing:3px;text-transform:uppercase;color:var(--soft-periwinkle);
    margin-bottom:4px;text-shadow:0 0 20px rgba(145,142,244,.5);
  }
  .char-race{font-size:12px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase}
  .char-power-display{position:absolute;right:20px;top:50%;transform:translateY(-50%);text-align:right}
  .char-power-num{
    font-family:'Rajdhani',sans-serif;font-size:36px;font-weight:700;
    color:#f4c441;line-height:1;text-shadow:0 0 20px rgba(244,196,65,.4);
  }
  .char-power-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px}
  .equipment-grid{padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .equip-slot{
    background:rgba(20,27,65,.5);border:1px solid var(--border);border-radius:8px;
    padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s;
  }
  .equip-slot:hover{border-color:rgba(111,156,235,.3);background:rgba(26,34,82,.8)}
  .equip-icon{font-size:20px}
  .equip-info{flex:1;min-width:0}
  .equip-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .equip-power{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:#f4c441}
  .char-xp{padding:0 16px 16px}

  /* ─── ACTIVITIES ─── */
  .activities-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
  .activity-list{display:flex;flex-direction:column;gap:8px}
  .activity-item{
    display:flex;align-items:center;gap:12px;padding:10px 12px;
    background:rgba(20,27,65,.5);border-radius:8px;border:1px solid transparent;
    cursor:pointer;transition:all .15s;
  }
  .activity-item:hover{border-color:var(--border);background:rgba(26,34,82,.8)}
  .activity-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .activity-info{flex:1}
  .activity-name{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
  .activity-sub{font-size:11px;color:var(--text-muted)}
  .activity-reward{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:#6ef4a2}

  /* ─── PROGRESS BAR ─── */
  .progress-bar-wrap{margin-top:16px}
  .progress-label{display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
  .progress-track{height:4px;background:rgba(26,34,82,.8);border-radius:2px;overflow:hidden}
  .progress-fill{
    height:100%;border-radius:2px;
    background:linear-gradient(90deg,var(--ocean-deep),var(--soft-periwinkle));
    box-shadow:0 0 8px rgba(145,142,244,.5);
    animation:progress-glow 2s ease-in-out infinite alternate;
    transition:width .6s ease;
  }
  @keyframes progress-glow{from{box-shadow:0 0 4px rgba(145,142,244,.3)}to{box-shadow:0 0 12px rgba(145,142,244,.7)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

  /* ─── TOOLTIP ─── */
  .tooltip-wrap{position:relative}
  .tooltip{
    position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
    background:rgba(14,20,52,.95);border:1px solid var(--border);border-radius:8px;
    padding:8px 12px;white-space:nowrap;font-size:12px;color:var(--text);
    pointer-events:none;z-index:100;
    opacity:0;transition:opacity .15s;
  }
  .tooltip-wrap:hover .tooltip{opacity:1}

  /* ─── TOAST ─── */
  .toast{
    position:fixed;bottom:24px;right:24px;
    background:var(--surface-2);border:1px solid var(--border);border-radius:10px;
    padding:12px 20px;font-size:13px;color:var(--text);
    display:flex;align-items:center;gap:10px;
    transform:translateY(80px);opacity:0;
    transition:all .35s cubic-bezier(.34,1.56,.64,1);
    z-index:999;
  }
  .toast.show{transform:translateY(0);opacity:1}
  .toast-dot{width:8px;height:8px;border-radius:50%;background:var(--soft-periwinkle);flex-shrink:0}

  /* ─── SELECTED ITEM OVERLAY ─── */
  .item-selected-overlay{
    position:fixed;inset:0;background:rgba(8,12,30,.7);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;z-index:200;
    animation:fadeUp .2s ease;
  }
  .item-detail{
    background:var(--surface);border:1px solid var(--border);border-radius:16px;
    padding:28px;min-width:280px;position:relative;
  }
  .item-detail-close{
    position:absolute;top:14px;right:14px;background:transparent;border:none;
    color:var(--text-muted);cursor:pointer;font-size:18px;
  }
  .item-detail-icon{font-size:52px;margin-bottom:12px}
  .item-detail-name{font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;color:var(--baby-blue);letter-spacing:1px;margin-bottom:4px}
  .item-detail-rarity{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:16px}
  .item-detail-power{font-family:'Rajdhani',sans-serif;font-size:32px;font-weight:700;color:#f4c441}
  .item-detail-power-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px}
  .item-detail-actions{display:flex;gap:8px;margin-top:20px}
  .btn-primary{
    flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
    background:rgba(145,142,244,.2);border:1px solid rgba(145,142,244,.4);
    color:var(--soft-periwinkle);font-family:'Exo 2',sans-serif;font-size:12px;font-weight:600;
    text-transform:uppercase;letter-spacing:1px;transition:all .15s;
  }
  .btn-primary:hover{background:rgba(145,142,244,.3)}
  .btn-secondary{
    flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;
    background:rgba(48,107,172,.15);border:1px solid rgba(48,107,172,.3);
    color:var(--cornflower);font-family:'Exo 2',sans-serif;font-size:12px;font-weight:600;
    text-transform:uppercase;letter-spacing:1px;transition:all .15s;
  }
  .btn-secondary:hover{background:rgba(48,107,172,.25)}
</style>
