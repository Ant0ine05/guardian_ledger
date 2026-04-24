<template>
  <main>
    <h1>Bienvenue sur Guardian Ledger</h1>
    
    <div v-if="estConnecte">
      <p>✅ Authentification Bungie réussie !</p>
      <p>Ton Membership ID : {{ membershipId }}</p>
    </div>
    
    <button @click="lancerConnexion">S'identifier avec Bungie</button>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const estConnecte = ref(false)
const membershipId = ref('')
const token = ref('')


onMounted(() => {

  const urlToken = route.query.token
  const urlMembershipId = route.query.membershipId


  if (urlToken && urlMembershipId) {
  
    token.value = urlToken
    membershipId.value = urlMembershipId
    estConnecte.value = true

  
    localStorage.setItem('bungie_token', urlToken)
    localStorage.setItem('bungie_membership_id', urlMembershipId)

    
    router.replace({ path: '/' })
  } 
 
  else if (localStorage.getItem('bungie_token')) {
    token.value = localStorage.getItem('bungie_token')
    membershipId.value = localStorage.getItem('bungie_membership_id')
    estConnecte.value = true
  }
})


const lancerConnexion = () => {
  
  window.location.href = 'http://localhost:3000/api/auth/login'
  
}
</script>

<style scoped>
main {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  text-align: center;
}

button {
  padding: 10px 20px;
  font-size: 1.2rem;
  cursor: pointer;
  background-color: #1a1a1a;
  color: white;
  border: 1px solid #333;
  border-radius: 5px;
}
button:hover {
  background-color: #333;
}
</style>