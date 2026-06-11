// ============================================================
// app.js — Página pública de agendamento (Firebase)
// ============================================================

import {
  db
} from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── CONFIG ─── */
const MANICURE_ID = "manicure_principal"; // ID do documento no Firestore

/* ─── ESTADO ─── */
const state = {
  servicos:           [],
  servicoSelecionado: null,
  dataSelecionada:    null,
  horarioSelecionado: null
};

/* ─── HELPERS ─── */
const $     = (id) => document.getElementById(id);
const today = ()   => new Date().toISOString().split("T")[0];
const money = (v)  => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function showToast(msg, type = "success") {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => (t.className = "toast hidden"), 3500);
}

function showLoading(v) {
  $("loading").classList.toggle("hidden", !v);
}

/* ─── HORÁRIOS BASE ─── */
const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30","18:00"
];

/* ─── INIT ─── */
document.addEventListener("DOMContentLoaded", async () => {
  const minDate = today();
  $("bookingDate").min   = minDate;
  $("bookingDate").value = minDate;
  state.dataSelecionada  = minDate;

  $("bookingDate").addEventListener("change", (e) => {
    state.dataSelecionada = e.target.value;
    carregarHorarios(e.target.value);
  });

  await carregarServicos();
  await carregarConfiguracoes();
});

/* ─── SERVIÇOS ─── */
const SERVICOS_MOCK = [
  { id: "s1", nome: "Esmaltação Simples",   preco: 25,  duracao: 45,  icon: "💅" },
  { id: "s2", nome: "Esmaltação em Gel",    preco: 60,  duracao: 60,  icon: "✨" },
  { id: "s3", nome: "Manicure Completa",    preco: 45,  duracao: 60,  icon: "💎" },
  { id: "s4", nome: "Pedicure Completa",    preco: 55,  duracao: 75,  icon: "🦶" },
  { id: "s5", nome: "Manicure + Pedicure",  preco: 90,  duracao: 120, icon: "👑" },
  { id: "s6", nome: "Nail Art",             preco: 80,  duracao: 90,  icon: "🎨" },
  { id: "s7", nome: "Unhas Acrílicas",      preco: 120, duracao: 120, icon: "💪" },
  { id: "s8", nome: "Blindagem",            preco: 70,  duracao: 90,  icon: "🛡️" }
];

async function carregarServicos() {
  try {
    const q    = query(collection(db, "services"), where("manicureId", "==", MANICURE_ID), where("ativo", "==", true));
    const snap = await getDocs(q);

    if (!snap.empty) {
      state.servicos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      state.servicos = SERVICOS_MOCK;
    }
  } catch {
    state.servicos = SERVICOS_MOCK;
  }

  renderServicos();
  renderServiceSelect();
}

function renderServicos() {
  const el = $("listaServicos");
  el.innerHTML = "";

  state.servicos.forEach((s) => {
    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = `
      <div class="icon">${s.icon || "💅"}</div>
      <h4>${s.nome}</h4>
      <div class="price">${money(s.preco)}</div>
      <div class="duration">⏱ ${s.duracao} min</div>
    `;
    el.appendChild(card);
  });
}

function renderServiceSelect() {
  const el = $("serviceSelect");
  el.innerHTML = "";

  state.servicos.forEach((s) => {
    const opt = document.createElement("div");
    opt.className = "service-option";
    opt.dataset.id = s.id;
    opt.innerHTML = `
      <div class="s-icon">${s.icon || "💅"}</div>
      <div class="s-name">${s.nome}</div>
      <div class="s-price">${money(s.preco)}</div>
      <div class="s-dur">⏱ ${s.duracao} min</div>
    `;
    opt.onclick = () => {
      document.querySelectorAll(".service-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      state.servicoSelecionado = s;
    };
    el.appendChild(opt);
  });
}

/* ─── HORÁRIOS ─── */
async function carregarHorarios(data) {
  const el = $("timeSlots");
  el.innerHTML = "<p>Carregando horários...</p>";
  state.horarioSelecionado = null;

  let ocupados = [];

  try {
    const q    = query(
      collection(db, "appointments"),
      where("manicureId", "==", MANICURE_ID),
      where("data",       "==", data),
      where("status",     "in", ["pendente","confirmado"])
    );
    const snap = await getDocs(q);
    ocupados   = snap.docs.map((d) => d.data().horario);
  } catch { /* usa lista vazia */ }

  el.innerHTML = "";

  HORARIOS.forEach((h) => {
    const slot = document.createElement("div");
    const busy = ocupados.includes(h);
    slot.className = `time-slot${busy ? " busy" : ""}`;
    slot.textContent = h;

    if (!busy) {
      slot.onclick = () => {
        document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        slot.classList.add("selected");
        state.horarioSelecionado = h;
      };
    }

    el.appendChild(slot);
  });
}

/* ─── NAVEGAÇÃO ─── */
function goStep(n) {
  if (n === 2 && !state.servicoSelecionado) {
    showToast("⚠️ Selecione um serviço!", "error");
    return;
  }
  if (n === 3 && !state.horarioSelecionado) {
    showToast("⚠️ Selecione um horário!", "error");
    return;
  }

  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  $(`step${n}`).classList.add("active");

  if (n === 2) carregarHorarios(state.dataSelecionada);
}

window.goStep = goStep;

/* ─── CONFIRMAR AGENDAMENTO ─── */
async function confirmarAgendamento() {
  const nome  = $("clientName").value.trim();
  const fone  = $("clientPhone").value.trim();
  const email = $("clientEmail").value.trim();
  const obs   = $("clientObs").value.trim();

  if (!nome || !fone) {
    showToast("⚠️ Preencha nome e WhatsApp!", "error");
    return;
  }

  const btn = $("btnConfirmar");
  btn.disabled    = true;
  btn.textContent = "Salvando...";
  showLoading(true);

  try {
    await addDoc(collection(db, "appointments"), {
      manicureId:   MANICURE_ID,
      servicoId:    state.servicoSelecionado.id,
      servicoNome:  state.servicoSelecionado.nome,
      servicoPreco: state.servicoSelecionado.preco,
      data:         state.dataSelecionada,
      horario:      state.horarioSelecionado,
      clienteNome:  nome,
      clienteFone:  fone,
      clienteEmail: email,
      observacoes:  obs,
      status:       "pendente",
      criadoEm:     serverTimestamp()
    });
  } catch (err) {
    console.error("Erro ao salvar:", err);
  }

  showLoading(false);
  btn.disabled    = false;
  btn.textContent = "✅ Confirmar Agendamento";

  mostrarConfirmacao({ nome, fone });
}

window.confirmarAgendamento = confirmarAgendamento;

function mostrarConfirmacao({ nome, fone }) {
  const s = state.servicoSelecionado;

  $("confirmationBox").innerHTML = `
    <p>👤 <strong>Cliente:</strong> ${nome}</p>
    <p>💅 <strong>Serviço:</strong> ${s.nome}</p>
    <p>💰 <strong>Valor:</strong> ${money(s.preco)}</p>
    <p>📅 <strong>Data:</strong> ${state.dataSelecionada}</p>
    <p>🕐 <strong>Horário:</strong> ${state.horarioSelecionado}</p>
    <p>📌 <strong>Status:</strong> Aguardando confirmação</p>
  `;

  const tel = fone.replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Olá! Gostaria de confirmar meu agendamento:\n\n` +
    `👤 *${nome}*\n` +
    `💅 Serviço: ${s.nome}\n` +
    `📅 Data: ${state.dataSelecionada}\n` +
    `🕐 Horário: ${state.horarioSelecionado}\n` +
    `💰 Valor: ${money(s.preco)}\n\n` +
    `Aguardo confirmação! 🌸`
  );

  $("whatsappLink").href = `https://wa.me/55${tel}?text=${msg}`;

  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  $("step4").classList.add("active");
  showToast("✅ Agendamento realizado com sucesso!");
}

function novoAgendamento() {
  state.servicoSelecionado  = null;
  state.horarioSelecionado  = null;

  $("clientName").value  = "";
  $("clientPhone").value = "";
  $("clientEmail").value = "";
  $("clientObs").value   = "";

  document.querySelectorAll(".service-option").forEach((o) => o.classList.remove("selected"));
  document.querySelectorAll(".step").forEach((el) => el.classList.remove("active"));
  $("step1").classList.add("active");
}

window.novoAgendamento = novoAgendamento;

/* ─── CONFIGURAÇÕES ─── */
async function carregarConfiguracoes() {
  try {
    const snap = await getDoc(doc(db, "manicures", MANICURE_ID));
    if (snap.exists()) {
      const d = snap.data();
      if (d.whatsapp)  $("contatoWhats").textContent    = d.whatsapp;
      if (d.endereco)  $("contatoEndereco").textContent = d.endereco;
      if (d.instagram) $("contatoInsta").textContent    = `@${d.instagram}`;
    }
  } catch { /* usa padrão */ }
}

/* ─── SERVICE WORKER ─── */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {});
}
