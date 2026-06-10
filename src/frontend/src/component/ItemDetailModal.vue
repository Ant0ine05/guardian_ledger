<template>
  <Teleport to="body">
    <div class="idm-overlay" @click.self="$emit('close')">
      <div class="idm-card">

        <!-- ══ HEADER ══ -->
        <div class="idm-header" :class="`rc-${item.rarity}`">
          <button class="idm-close" @click="$emit('close')"><Icon icon="line-md:close" /></button>

          <div class="idm-icon-wrap" :class="`rc-${item.rarity}`">
            <img v-if="item.icon" :src="item.icon" :alt="item.name" class="idm-icon-img" />
            <span v-else class="idm-icon-fb">?</span>
          </div>

          <div class="idm-header-info">
            <div class="idm-type-line">
              {{ item.type }}<span v-if="item.guardianClass && item.guardianClass !== 'Universel'"> · {{ item.guardianClass }}</span>
            </div>
            <div class="idm-name">{{ item.name }}</div>
            <div style="font-size:10px;color:#f9a825;font-family:monospace;margin-bottom:3px">itemHash: {{ item.itemHash ?? detail?.itemHash ?? '…' }}</div>
            <div class="idm-source" v-if="detail?.source">Source&nbsp;: {{ detail.source }}</div>
            <div class="idm-flavor"  v-if="detail?.flavorText">"{{ detail.flavorText }}"</div>
          </div>

          <div class="idm-power-badge">
            <Icon icon="line-md:star" class="idm-power-star" />
            <span class="idm-power-num">{{ item.power }}</span>
          </div>
        </div>

        <!-- ══ BARRE DE TRANSFERT ══ -->
        <div class="idm-transfer-bar" v-if="item.instanced && characters.length">
          <span class="idm-transfer-label"><Icon icon="line-md:arrows-horizontal" class="idm-transfer-icon" /> Transférer vers</span>
          <button
            class="idm-transfer-btn vault"
            @click="doTransfer(true, characters[0].id)"
            title="Envoyer dans le coffre"
          ><Icon icon="line-md:home-twotone" class="idm-btn-icon" /> Coffre</button>
          <button
            v-for="char in characters" :key="char.id"
            class="idm-transfer-btn char"
            @click="doTransfer(false, char.id)"
            :title="`${char.class} \u2022 ${char.power} \u2656`"
          >
            <Icon :icon="classIcon(char.class)" class="idm-transfer-class-icon" />
            {{ char.class }}
          </button>
        </div>

        <!-- ══ SPINNER ══ -->
        <div class="idm-loading" v-if="loading">
          <div class="idm-spinner"></div>
        </div>

        <!-- ══ CORPS ══ -->
        <div class="idm-body" v-else-if="detail">

          <!-- ── Colonne Stats ── -->
          <div class="idm-col-stats">
            <div class="idm-section-label">Statistiques</div>

            <div
              v-for="stat in detail.stats"
              :key="stat.name"
              class="idm-stat-row"
              :class="{ 'is-no-bar': stat.noBar }"
            >
              <span class="idm-sname">{{ stat.name }}</span>
              <span class="idm-sval">{{ stat.value }}</span>
              <div v-if="!stat.noBar" class="idm-bar-track">
                <div class="idm-bar-fill" :style="{ width: pct(stat) + '%' }"></div>
              </div>
            </div>

            <!-- Total armure -->
            <div class="idm-armor-total" v-if="isArmor && armorTotal > 0">
              <span class="idm-at-label">Total</span>
              <div class="idm-at-right">
                <span class="idm-at-val">{{ armorTotal }}</span>
                <span class="idm-at-tier" :class="tierClass(armorTotal)">{{ tierLabel(armorTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- ── Séparateur ── -->
          <div class="idm-col-div"></div>

          <!-- ── Colonne Perks ── -->
          <div class="idm-col-perks">
            <div class="idm-section-label">Aptitudes</div>

            <!-- Cadre intrinseque -->
            <template v-if="intrinsicSocket">
              <div
                class="idm-intrinsic"
                @mouseenter="onHover(intrinsicSocket.plugs[0], $event)"
                @mouseleave="onLeave"
              >
                <div class="idm-intr-icon">
                  <img v-if="intrinsicSocket.plugs[0]?.icon" :src="intrinsicSocket.plugs[0].icon" class="idm-intr-img" />
                  <Icon v-else icon="line-md:close-circle" class="idm-plug-fb" />
                </div>
                <div class="idm-intr-text">
                  <div class="idm-intr-name">{{ intrinsicSocket.plugs[0]?.name }}</div>
                  <div class="idm-intr-desc">{{ intrinsicSocket.plugs[0]?.description }}</div>
                </div>
              </div>
              <div class="idm-intr-sep"></div>
            </template>

            <!-- ── Tirage actuel ── -->
            <div class="idm-section-label" v-if="nonIntrinsicSockets.length">Tirage actuel</div>
            <div class="idm-socket-grid idm-current-row" v-if="nonIntrinsicSockets.length">
              <div
                class="idm-sock-col"
                v-for="sock in nonIntrinsicSockets"
                :key="'cur-' + sock.index"
              >
                <div
                  v-if="currentPlug(sock)"
                  class="idm-plug active idm-plug-lg"
                  @mouseenter="onHover(currentPlug(sock), $event)"
                  @mouseleave="onLeave"
                >
                  <img v-if="currentPlug(sock)?.icon" :src="currentPlug(sock).icon" class="idm-plug-img" />
                  <Icon v-else icon="line-md:close-circle" class="idm-plug-fb" />
                </div>
              </div>
            </div>

            <!-- Séparateur -->
            <div class="idm-rolls-sep" v-if="nonIntrinsicSockets.length"></div>

            <!-- ── Tous les rolls possibles ── -->
            <div class="idm-section-label" v-if="nonIntrinsicSockets.length">Rolls possibles</div>
            <div class="idm-socket-grid" v-if="nonIntrinsicSockets.length">
              <div
                class="idm-sock-col"
                v-for="sock in nonIntrinsicSockets"
                :key="'all-' + sock.index"
              >
                <div
                  v-for="plug in sock.plugs"
                  :key="plug.hash"
                  class="idm-plug"
                  :class="{ active: plug.isActive }"
                  @mouseenter="onHover(plug, $event)"
                  @mouseleave="onLeave"
                >
                  <img v-if="plug.icon" :src="plug.icon" class="idm-plug-img" />
                  <Icon v-else icon="line-md:close-circle" class="idm-plug-fb" />
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Non instancié -->
        <div class="idm-empty" v-else-if="!item.instanced">
          Pas de statistiques disponibles pour cet item.
        </div>

      </div>
    </div>

    <!-- ══ TOOLTIP PERK (fixe dans le body) ══ -->
    <Transition name="tip-fade">
      <div
        v-if="tip"
        class="idm-tip"
        :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
      >
        <div class="idm-tip-name">{{ tip.name }}</div>
        <div class="idm-tip-desc" v-if="tip.desc">{{ tip.desc }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  item:       { type: Object,  required: true },
  detail:     { type: Object,  default: null  },
  loading:    { type: Boolean, default: false },
  characters: { type: Array,   default: () => [] }
})

const emit = defineEmits(['close', 'transfer'])

/* ── Transfert ── */
function doTransfer(transferToVault, characterId) {
  emit('transfer', {
    instanceId:     props.item.id,
    itemHash:       props.item.itemHash,
    transferToVault,
    characterId,
  })
}

const CLASS_ICONS = { 'Titan': 'line-md:person-twotone', 'Chasseur': 'line-md:compass', 'Arcaniste': 'line-md:star' }
function classIcon(cls) { return CLASS_ICONS[cls] ?? 'line-md:account-small' }

/* ── Tooltip ── */
const tip = ref(null)

function onHover(plug, e) {
  if (!plug?.name) return
  const r  = e.currentTarget.getBoundingClientRect()
  const ww = window.innerWidth
  const tx = r.right + 10
  tip.value = {
    name: plug.name,
    desc: plug.description || '',
    x: tx + 260 > ww ? r.left - 268 : tx,
    y: Math.min(r.top, window.innerHeight - 130),
  }
}
function onLeave() { tip.value = null }

/* ── Sockets ── */
const intrinsicSocket     = computed(() => props.detail?.sockets?.find(s => s.category === 'intrinsic') ?? null)
const nonIntrinsicSockets = computed(() => props.detail?.sockets?.filter(s => s.category !== 'intrinsic') ?? [])

/* ── Armure ── */
const ARMOR_KW = ['Casque', 'Gantelets', 'Torse', 'Jambes', 'Classe']
const isArmor = computed(() => ARMOR_KW.some(k => props.item.type?.includes(k)))
const armorTotal = computed(() => {
  if (!props.detail?.stats) return 0
  return props.detail.stats.filter(s => !s.noBar).reduce((a, s) => a + (s.value || 0), 0)
})

/* ── Tier armure ── */
const tierLabel = (t) => t >= 68 ? 'S' : t >= 64 ? 'A' : t >= 58 ? 'B' : t >= 48 ? 'C' : 'D'
const tierClass = (t) => t >= 68 ? 'ts' : t >= 64 ? 'ta' : t >= 58 ? 'tb' : t >= 48 ? 'tc' : 'td'

/* ── Barre ── */
function pct(stat) {
  if (!stat.max) return 0
  return Math.min(100, Math.round((stat.value / stat.max) * 100))
}

/* ── Plug actif du socket (tirage actuel) ── */
function currentPlug(sock) {
  return sock.plugs.find(p => p.isActive) ?? sock.plugs[0] ?? null
}
</script>

<style scoped>
/* ══ OVERLAY ══ */
.idm-overlay {
  position: fixed; inset: 0;
  background: rgba(4, 5, 14, 0.88);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: idm-fadein 0.18s ease;
}
@keyframes idm-fadein { from { opacity: 0 } to { opacity: 1 } }

/* ══ CARTE ══ */
.idm-card {
  position: relative;
  width: min(880px, 96vw);
  max-height: 90vh;
  overflow-y: auto;
  background: #090a0f;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9);
  animation: idm-slideup 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.idm-card::-webkit-scrollbar { width: 4px }
.idm-card::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px }
@keyframes idm-slideup {
  from { opacity: 0; transform: translateY(14px) scale(0.98) }
  to   { opacity: 1; transform: translateY(0) scale(1) }
}

/* ══ FERMETURE ══ */
.idm-close {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 26px; height: 26px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.idm-close svg { width: 14px; height: 14px }
.idm-close:hover { background: rgba(255, 255, 255, 0.12); color: #fff }

/* ══ HEADER ══ */
.idm-header {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 20px 52px 20px 20px;
  border-bottom: 2px solid var(--rc, rgba(255, 255, 255, 0.08));
  background: linear-gradient(135deg, var(--rbg, rgba(255, 255, 255, 0.02)) 0%, transparent 60%);
  position: relative;
}
/* ── Couleurs par rareté ── */
.rc-exotic    { --rc: #ceae33; --rbg: rgba(206, 174, 51,  0.12) }
.rc-legendary { --rc: #7040a0; --rbg: rgba(112, 64,  160, 0.20) }
.rc-rare      { --rc: #4b78c8; --rbg: rgba(75,  120, 200, 0.15) }
.rc-uncommon  { --rc: #3a7a46; --rbg: rgba(58,  122, 70,  0.15) }
.rc-common    { --rc: #888;    --rbg: transparent }

/* ── Icône item ── */
.idm-icon-wrap {
  width: 84px; height: 84px; flex-shrink: 0;
  border: 2px solid var(--rc, rgba(255, 255, 255, 0.12));
  overflow: hidden; background: #060710;
}
.idm-icon-img { width: 100%; height: 100%; object-fit: cover; display: block }
.idm-icon-fb  { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(255, 255, 255, 0.2); font-size: 24px }

/* ── Infos header ── */
.idm-header-info { flex: 1; min-width: 0 }
.idm-type-line {
  font-size: 10px; color: rgba(255, 255, 255, 0.38);
  text-transform: uppercase; letter-spacing: 0.12em;
  margin-bottom: 4px; white-space: nowrap;
}
.idm-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 22px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: #f0ece4; line-height: 1.1; margin-bottom: 6px;
}
.idm-source {
  font-size: 10.5px; color: rgba(200, 196, 188, 0.45);
  font-style: italic; margin-bottom: 4px;
}
.idm-flavor {
  font-size: 11px; color: rgba(200, 196, 188, 0.32);
  font-style: italic; line-height: 1.5;
}

/* ── Badge puissance ── */
.idm-power-badge {
  position: absolute; top: 16px; right: 44px;
  display: flex; align-items: baseline; gap: 3px;
}
.idm-power-star { color: var(--rc, #ceae33); width: 12px; height: 12px; flex-shrink: 0 }
.idm-power-num  { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; color: #f0ece4; line-height: 1 }

/* ══ BARRE DE TRANSFERT ══ */
.idm-transfer-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
}
.idm-transfer-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.28);
  margin-right: 4px;
  white-space: nowrap;
  display: flex; align-items: center; gap: 5px;
}
.idm-transfer-icon { width: 13px; height: 13px; flex-shrink: 0 }
.idm-btn-icon { width: 13px; height: 13px; flex-shrink: 0 }
.idm-transfer-class-icon { width: 13px; height: 13px; flex-shrink: 0 }
.idm-transfer-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: 11px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.idm-transfer-btn.vault {
  color: #c8c5be;
  border-color: rgba(200, 197, 190, 0.25);
  background: rgba(200, 197, 190, 0.06);
}
.idm-transfer-btn.vault:hover {
  background: rgba(200, 197, 190, 0.14);
  color: #fff;
}
.idm-transfer-btn.char {
  color: #7ec8e3;
  border-color: rgba(126, 200, 227, 0.25);
  background: rgba(126, 200, 227, 0.06);
}
.idm-transfer-btn.char:hover {
  background: rgba(126, 200, 227, 0.16);
  color: #fff;
}

/* ══ SPINNER ══ */
.idm-loading { display: flex; align-items: center; justify-content: center; padding: 44px }
.idm-spinner {
  width: 28px; height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.07);
  border-top-color: rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* ══ CORPS 2 COLONNES ══ */
.idm-body {
  display: grid;
  grid-template-columns: 240px 1px 1fr;
  align-items: start;
  min-height: 260px;
}
@media (max-width: 600px) {
  .idm-body { grid-template-columns: 1fr }
  .idm-col-div { display: none }
}
.idm-col-stats  { padding: 20px 16px 24px 22px }
.idm-col-perks  { padding: 20px 22px 24px 18px }
.idm-col-div    { background: rgba(255, 255, 255, 0.06); align-self: stretch }

/* ══ LABEL DE SECTION ══ */
.idm-section-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.30);
  margin-bottom: 14px;
  display: flex; align-items: center; gap: 8px;
}
.idm-section-label::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

/* ══ STATS — layout exact D2 : [NOM droite] [VALEUR] [══BARRE══] ══ */
.idm-stat-row {
  display: grid;
  grid-template-columns: 130px 30px 1fr;
  align-items: center;
  gap: 8px;
  height: 24px;
  margin-bottom: 4px;
}
/* Stat sans barre (RPM, Chargeur…) : 2 colonnes seulement */
.idm-stat-row.is-no-bar {
  grid-template-columns: 130px 30px;
}

.idm-sname {
  text-align: right;
  font-size: 12px;
  color: rgba(195, 190, 182, 0.70);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.02em;
}
.idm-sval {
  text-align: right;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #eae6de;
  line-height: 1;
}

/* ── Barre de stat — 6px, blanc opaque bien visible ── */
.idm-bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.10);
  overflow: hidden;
  border-radius: 1px;
}
.idm-bar-fill {
  height: 100%;
  background: #c8c5be;
  transition: width 0.5s ease;
  border-radius: 1px;
}

/* ── Total armure ── */
.idm-armor-total {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.idm-at-label { font-size: 10px; color: rgba(255, 255, 255, 0.28); text-transform: uppercase; letter-spacing: 0.1em }
.idm-at-right { display: flex; align-items: center; gap: 8px }
.idm-at-val   { font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; color: #dedad2 }
.idm-at-tier  { font-size: 10px; font-weight: 700; padding: 1px 6px; border: 1px solid; text-transform: uppercase }
.ts { color: #ceae33; border-color: rgba(206,174,51,0.5); background: rgba(206,174,51,0.1) }
.ta { color: #7fbfff; border-color: rgba(127,191,255,0.5); background: rgba(127,191,255,0.08) }
.tb { color: #8ac78a; border-color: rgba(138,199,138,0.5); background: rgba(138,199,138,0.08) }
.tc { color: #a0a0a0; border-color: rgba(160,160,160,0.4) }
.td { color: #706e68; border-color: rgba(112,110,104,0.3) }

/* ══ INTRINSÉQUE (cadre / archétype) ══ */
.idm-intrinsic {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 10px 0; cursor: default;
}
.idm-intr-sep  { height: 1px; background: rgba(255,255,255,0.07); margin-bottom: 16px }
.idm-intr-icon {
  width: 52px; height: 52px; flex-shrink: 0;
  border: 1px solid rgba(206, 174, 51, 0.40);
  background: rgba(206, 174, 51, 0.06);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.idm-intr-img  { width: 100%; height: 100%; object-fit: cover }
.idm-intr-text { flex: 1; min-width: 0 }
.idm-intr-name {
  font-size: 13px; font-weight: 700; text-transform: uppercase;
  color: #ceae33; letter-spacing: 0.05em; margin-bottom: 4px;
}
.idm-intr-desc {
  font-size: 11px; color: rgba(200, 196, 188, 0.45); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

/* ══ GRILLE DE SOCKETS (colonnes de perks) ══ */
.idm-socket-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.idm-sock-col {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

/* ── Séparateur entre tirage actuel et rolls possibles ── */
.idm-rolls-sep {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 16px 0;
}

/* ── Tirage actuel : ligne unique de grands plugs ── */
.idm-current-row {
  margin-bottom: 0;
}

/* ── Icône de perk ── */
.idm-plug {
  width: 36px; height: 36px;
  border-radius: 50%;
  /* Inactif : bordure en pointillés bien visible comme D2 */
  border: 1.5px dashed rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s, opacity 0.12s;
  position: relative;
}
/* Grands plugs pour le tirage actuel */
.idm-plug-lg {
  width: 44px; height: 44px;
}
/* Actif → bleu D2, pas de pointillés */
.idm-plug.active {
  border: 2px solid #4d9bce;
  background: rgba(77, 155, 206, 0.22);
  box-shadow: 0 0 14px rgba(77, 155, 206, 0.45);
}
/* Inactif : icône légèrement assombrie */
.idm-plug:not(.active) .idm-plug-img {
  opacity: 0.55;
  filter: grayscale(20%);
}
.idm-plug:not(.active):hover {
  border-color: rgba(255, 255, 255, 0.65);
  border-style: solid;
  background: rgba(255, 255, 255, 0.08);
}
.idm-plug:not(.active):hover .idm-plug-img {
  opacity: 0.85;
  filter: none;
}
.idm-plug-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50% }
.idm-plug-fb  { color: rgba(255, 255, 255, 0.25); width: 18px; height: 18px }

/* ══ VIDE ══ */
.idm-empty {
  padding: 32px 20px; text-align: center;
  font-size: 12px; color: rgba(255, 255, 255, 0.28);
  text-transform: uppercase; letter-spacing: 0.08em;
}

/* ══ TOOLTIP PERK (position: fixed dans le body) ══ */
.idm-tip {
  position: fixed; z-index: 10000;
  width: 260px; max-width: 92vw;
  background: #0e0f17;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75);
  padding: 13px 16px;
  pointer-events: none;
}
.idm-tip-name {
  font-size: 13px; font-weight: 700; text-transform: uppercase;
  color: #d8d4cc; letter-spacing: 0.05em; margin-bottom: 7px;
}
.idm-tip-desc {
  font-size: 11.5px; color: rgba(200, 196, 188, 0.55); line-height: 1.6;
}
.tip-fade-enter-active { transition: opacity 0.1s }
.tip-fade-leave-active { transition: opacity 0.08s }
.tip-fade-enter-from, .tip-fade-leave-to { opacity: 0 }
</style>
