# 💅 LindaNails Pro — Firebase Edition

Sistema completo de agendamento online para manicure usando Firebase.

## ✅ Funcionalidades

- Página pública de agendamento
- Agendamento em 4 passos
- Horários disponíveis em tempo real (Firebase)
- Confirmação via WhatsApp
- Painel Admin completo
- Dashboard com KPIs
- Agenda semanal visual
- Gerenciar agendamentos
- Lista de clientes
- Cadastro de serviços
- Financeiro
- Configurações
- PWA instalável

## 🔧 Configuração Firebase

### 1. Criar projeto
- Acesse: https://console.firebase.google.com
- Criar novo projeto

### 2. Ativar Authentication
- Authentication → Sign-in method → E-mail/senha → Ativar
- Criar usuário admin: Authentication → Users → Add user

### 3. Criar Firestore
- Firestore Database → Criar banco → Modo produção

### 4. Colar as regras
- Firestore → Rules → Cole o conteúdo de firestore.rules

### 5. Configurar firebase.js
Substitua os valores em firebase.js:

```js
apiKey:            "SUA_API_KEY",
authDomain:        "SEU_PROJETO.firebaseapp.com",
projectId:         "SEU_PROJECT_ID",
storageBucket:     "SEU_PROJETO.appspot.com",
messagingSenderId: "SEU_MESSAGING_SENDER_ID",
appId:             "SEU_APP_ID"
