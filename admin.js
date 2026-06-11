// ============================================================
// admin.js — Painel administrativo (Firebase Firestore)
// ============================================================

import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── CONFIG ─── */
const MANICURE_ID = "manicure_principal";

/* ─── ESTADO ─── */
const adm = {
  agendamentos: [],
  servicos:     [],
  financeiro:   [],
  clientes:     [],
  semanaOffset: 0
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

/* ─── AUTH ─── */
$("btnLogin").onclick = async () => {
  const email = $("loginEmail").value.trim();
  const pass  = $("loginPass").value;
  const errEl = $("loginError");

  errEl.classList.add("hidden");

  if (!email || !pass) {
    errEl.textContent = "Preencha e-mail e senha.";
    errEl.classList.remove("hidden");
    return;
  }

  showLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged cuida do resto
  } catch (err) {
    showLoading(false);
    errEl.textContent = "E-mail ou senha incorretos.";
    errEl.classList.remove("hidden");
  }
};

$("btnLogout").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  showLoading(false);

  if (user) {
    $("loginScreen").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");
    $("adminEmail").textContent = user.email;
    $("pageDate").textContent   = new Date().toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
    $("cfgLink").value = `${location.origin}/index.html`;

    await carregarTudo();
  } else {
    $("loginScreen").classList.remove("hidden");
    $("adminPanel").classList.add("hidden");
  }
});

/* ─── NAVEGAÇÃO ─── */
document.querySelectorAll(".nav-item[data-page]").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-page").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`page-${btn.dataset.page}`).classList.add("active");
    $("pageTitle").textContent = btn.textContent.trim();
    if (btn.dataset.page === "agenda") renderAgendaSemana();
  };
});

/* ─── CARREGAR TUDO ─── */
async function carregarTudo() {
  showLoading(true);
  await Promise.all([carregarAgendamentos(), carregarServicosAdmin(), carregarFinanceiro()]);
  await carregarConfiguracoes();
  renderDashboard();
  showLoading(false);
}

/* ─── AGENDAMENTOS ─── */
async function carregarAgendamentos() {
  try {
    const q    = query(
      collection(db, "appointments"),
      where("manicureId", "==", MANICURE_ID),
      orderBy("data", "asc"),
      orderBy("horario", "asc")
    );
    const snap = await getDocs(q);
    adm.agendamentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    adm.agendamentos = AGENDAMENTOS_MOCK;
  }

  renderAgendamentos();
  extrairClientes();
}

const AGENDAMENTOS_MOCK = [
  { id: "a1", clienteNome: "Ana Silva",     clienteFone: "(11) 99111-1111", servicoNome: "Esmaltação em Gel",  servicoPreco: 60, data: today(), horario: "09:00", status: "confirmado" },
  { id: "a2", clienteNome: "Maria Santos",  clienteFone: "(11) 99222-2222", servicoNome: "Manicure Completa", servicoPreco: 45, data: today(), horario: "10:30", status: "pendente"   },
  { id: "a3", clienteNome: "Carla Lima",    clienteFone: "(11) 99333-3333", servicoNome: "Pedicure",          servicoPreco: 55, data: today(), horario: "14:00", status: "pendente"   },
  { id: "a4", clienteNome: "Fernanda Costa",clienteFone: "(11) 99444-4444", servicoNome: "Nail Art",          servicoPreco: 80, data: today(), horario: "15:30", status: "concluido"  }
];

function renderAgendamentos(lista = null) {
  const el   = $("listaAgendamentos");
  const data = lista || adm.agendamentos;
  el.innerHTML = "";

  if (!data.length) {
    el.innerHTML = "<p style='color:var(--muted);text-align:center;padding:32px'>Nenhum agendamento encontrado.</p>";
    return;
  }

  data.forEach((a) => {
    const card = document.createElement("div");
    card.className = `agend-card ${a.status}`;
    card.innerHTML = `
      <div class="agend-info">
        <strong>👤 ${a.clienteNome}</strong>
        <small>
          💅 ${a.servicoNome} — ${money(a.servicoPreco)}
          &nbsp;|&nbsp; 📅 ${a.data} às ${a.horario}
          &nbsp;|&nbsp; 📱 ${a.clienteFone}
        </small>
        <br>
        <span class="badge ${a.status}">${a.status}</span>
      </div>
      <div class="agend-actions">
        ${a.status === "pendente"   ? `<button class="btn-sm green"  data-id="${a.id}" data-status="confirmado">✅ Confirmar</button>` : ""}
        ${a.status === "confirmado" ? `<button class="btn-sm purple" data-id="${a.id}" data-status="concluido">⭐ Concluir</button>`   : ""}
        ${a.status !== "cancelado" && a.status !== "concluido"
          ? `<button class="btn-sm red" data-id="${a.id}" data-status="cancelado">❌ Cancelar</button>` : ""}
        <a class="btn-sm gray" href="https://wa.me/55${(a.clienteFone||'').replace(/\D/g,'')}" target="_blank">📱 WhatsApp</a>
      </div>
    `;

    card.querySelectorAll("[data-status]").forEach((btn) => {
      btn.onclick = () => mudarStatus(btn.dataset.id, btn.dataset.status);
    });

    el.appendChild(card);
  });
}

async function mudarStatus(id, novoStatus) {
  showLoading(true);

  try {
    await updateDoc(doc(db, "appointments", id), { status: novoStatus });
  } catch { /* demo */ }

  const idx = adm.agendamentos.findIndex((a) => a.id === id);
  if (idx !== -1) adm.agendamentos[idx].status = novoStatus;

  renderAgendamentos();
  renderDashboard();
  showLoading(false);
  showToast(`✅ Status: ${novoStatus}`);
}

$("searchAgend").oninput  = filtrarAgendamentos;
$("filterStatus").onchange = filtrarAgendamentos;
$("filterData").onchange   = filtrarAgendamentos;

function filtrarAgendamentos() {
  const search = $("searchAgend").value.toLowerCase();
  const status = $("filterStatus").value;
  const data   = $("filterData").value;

  const filtrado = adm.agendamentos.filter((a) => {
    const nome = (a.clienteNome || "").toLowerCase();
    return (
      nome.includes(search) &&
      (!status || a.status === status) &&
      (!data   || a.data   === data)
    );
  });

  renderAgendamentos(filtrado);
}

/* ─── CLIENTES ─── */
function extrairClientes() {
  const map = {};
  adm.agendamentos.forEach((a) => {
    const key = a.clienteFone;
    if (!map[key]) {
      map[key] = { nome: a.clienteNome, fone: a.clienteFone, total: 0, gasto: 0, ultimaVisita: a.data };
    }
    map[key].total++;
    map[key].gasto += Number(a.servicoPreco || 0);
    if (a.data > map[key].ultimaVisita) map[key].ultimaVisita = a.data;
  });

  adm.clientes = Object.values(map);
  renderClientes();
  $("kpiClientes").textContent = adm.clientes.length;
}

function renderClientes(lista = null) {
  const el   = $("listaClientes");
  const data = lista || adm.clientes;
  el.innerHTML = "";

  if (!data.length) {
    el.innerHTML = "<p style='color:var(--muted);text-align:center;padding:32px'>Nenhum cliente encontrado.</p>";
    return;
  }

  data.forEach((c) => {
    const card = document.createElement("div");
    card.className = "cliente-card";
    card.innerHTML = `
      <div class="cliente-info">
        <strong>👤 ${c.nome}</strong>
        <small>
          📱 ${c.fone} &nbsp;|&nbsp;
          🗓 ${c.total} visita(s) &nbsp;|&nbsp;
          💰 ${money(c.gasto)} &nbsp;|&nbsp;
          📅 Última: ${c.ultimaVisita}
        </small>
      </div>
      <a class="btn-sm gray" href="https://wa.me/55${(c.fone||'').replace(/\D/g,'')}" target="_blank">
        📱 WhatsApp
      </a>
    `;
    el.appendChild(card);
  });
}

$("searchCliente").oninput = () => {
  const s = $("searchCliente").value.toLowerCase();
  renderClientes(adm.clientes.filter((c) =>
    c.nome.toLowerCase().includes(s) || c.fone.includes(s)
  ));
};

/* ─── SERVIÇOS ─── */
const SERVICOS_MOCK_ADMIN = [
  { id: "sv1", nome: "Esmaltação Simples",   preco: 25,  duracao: 45,  icon: "💅", ativo: true },
  { id: "sv2", nome: "Esmaltação em Gel",    preco: 60,  duracao: 60,  icon: "✨", ativo: true },
  { id: "sv3", nome: "Manicure Completa",    preco: 45,  duracao: 60,  icon: "💎", ativo: true },
  { id: "sv4", nome: "Pedicure Completa",    preco: 55,  duracao: 75,  icon: "🦶", ativo: true },
  { id: "sv5", nome: "Manicure + Pedicure",  preco: 90,  duracao: 120, icon: "👑", ativo: true },
  { id: "sv6", nome: "Nail Art",             preco: 80,  duracao: 90,  icon: "🎨", ativo: true }
];

async function carregarServicosAdmin() {
  try {
    const q    = query(collection(db, "services"), where("manicureId", "==", MANICURE_ID));
    const snap = await getDocs(q);
    adm.servicos = snap.empty
      ? SERVICOS_MOCK_ADMIN
      : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    adm.servicos = SERVICOS_MOCK_ADMIN;
  }

  renderServicosAdmin();
}

function renderServicosAdmin() {
  const el = $("listaServicosAdmin");
  el.innerHTML = "";

  adm.servicos.forEach((s) => {
    const card = document.createElement("div");
    card.className = "svc-card";
    card.innerHTML = `
      <div>
        <strong>${s.icon || "💅"} ${s.nome}</strong><br>
        <small>
          💰 ${money(s.preco)} &nbsp;|&nbsp; ⏱ ${s.duracao} min &nbsp;|&nbsp;
          <span class="badge ${s.ativo ? "confirmado" : "cancelado"}">${s.ativo ? "Ativo" : "Inativo"}</span>
        </small>
      </div>
      <button class="btn-sm ${s.ativo ? "red" : "green"}" data-id="${s.id}" data-ativo="${!s.ativo}">
        ${s.ativo ? "Desativar" : "Ativar"}
      </button>
    `;

    card.querySelector("[data-id]").onclick = async (e) => {
      const ativo = e.target.dataset.ativo === "true";
      await toggleServico(s.id, ativo);
    };

    el.appendChild(card);
  });
}

$("btnSalvarServico").onclick = async () => {
  const nome    = $("svcNome").value.trim();
  const preco   = Number($("svcPreco").value || 0);
  const duracao = Number($("svcDuracao").value || 60);
  const icon    = $("svcIcon").value.trim() || "💅";

  if (!nome || preco <= 0) { showToast("⚠️ Informe nome e preço", "error"); return; }

  showLoading(true);

  const novo = { manicureId: MANICURE_ID, nome, preco, duracao, icon, ativo: true, criadoEm: serverTimestamp() };

  try {
    const ref = await addDoc(collection(db, "services"), novo);
    adm.servicos.push({ id: ref.id, ...novo });
  } catch {
    adm.servicos.push({ id: Date.now().toString(), ...novo });
  }

  $("svcNome").value    = "";
  $("svcPreco").value   = "";
  $("svcDuracao").value = "";
  $("svcIcon").value    = "";

  renderServicosAdmin();
  showLoading(false);
  showToast("✅ Serviço adicionado!");
};

async function toggleServico(id, ativo) {
  try {
    await updateDoc(doc(db, "services", id), { ativo });
  } catch { /* demo */ }

  const idx = adm.servicos.findIndex((s) => s.id === id);
  if (idx !== -1) adm.servicos[idx].ativo = ativo;

  renderServicosAdmin();
  showToast(`✅ Serviço ${ativo ? "ativado" : "desativado"}`);
}

/* ─── FINANCEIRO ─── */
const FIN_MOCK = [
  { id: "f1", tipo: "entrada", descricao: "Esmaltação em Gel",   valor: 60, categoria: "Serviço",  data: today() },
  { id: "f2", tipo: "entrada", descricao: "Manicure Completa",   valor: 45, categoria: "Serviço",  data: today() },
  { id: "f3", tipo: "saida",   descricao: "Compra de esmaltes",  valor: 80, categoria: "Material", data: today() }
];

async function carregarFinanceiro() {
  try {
    const q    = query(
      collection(db, "finance"),
      where("manicureId", "==", MANICURE_ID),
      orderBy("data", "desc")
    );
    const snap = await getDocs(q);
    adm.financeiro = snap.empty
      ? FIN_MOCK
      : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    adm.financeiro = FIN_MOCK;
  }

  renderFinanceiro();
}

function renderFinanceiro() {
  const mes      = today().slice(0, 7);
  const entradas = adm.financeiro.filter((f) => f.tipo === "entrada" && f.data.startsWith(mes)).reduce((s, f) => s + Number(f.valor), 0);
  const saidas   = adm.financeiro.filter((f) => f.tipo === "saida"   && f.data.startsWith(mes)).reduce((s, f) => s + Number(f.valor), 0);

  $("finEntradas").textContent    = money(entradas);
  $("finSaidas").textContent      = money(saidas);
  $("finSaldo").textContent       = money(entradas - saidas);
  $("kpiFaturamento").textContent = money(entradas);

  const el = $("listaFinanceiro");
  el.innerHTML = "";

  adm.financeiro.slice(0, 50).forEach((f) => {
    const item = document.createElement("div");
    item.className = `fin-item ${f.tipo}`;
    item.innerHTML = `
      <div class="fin-info">
        <strong>${f.descricao}</strong>
        <small>${f.categoria} &nbsp;|&nbsp; 📅 ${f.data}</small>
      </div>
      <div class="fin-valor">${f.tipo === "entrada" ? "+" : "-"}${money(f.valor)}</div>
    `;
    el.appendChild(item);
  });
}

$("btnSalvarFinanceiro").onclick = async () => {
  const tipo      = $("finTipo").value;
  const descricao = $("finDesc").value.trim();
  const valor     = Number($("finValor").value || 0);
  const categoria = $("finCateg").value;
  const data      = $("finData").value || today();

  if (!descricao || valor <= 0) { showToast("⚠️ Informe descrição e valor", "error"); return; }

  showLoading(true);

  const novo = { manicureId: MANICURE_ID, tipo, descricao, valor, categoria, data, criadoEm: serverTimestamp() };

  try {
    const ref = await addDoc(collection(db, "finance"), novo);
    adm.financeiro.unshift({ id: ref.id, ...novo });
  } catch {
    adm.financeiro.unshift({ id: Date.now().toString(), ...novo });
  }

  $("finDesc").value  = "";
  $("finValor").value = "";

  renderFinanceiro();
  showLoading(false);
  showToast("✅ Lançamento salvo!");
};

/* ─── DASHBOARD ─── */
function renderDashboard() {
  const hoje = today();
  const mes  = hoje.slice(0, 7);

  $("kpiHoje").textContent = adm.agendamentos.filter((a) => a.data === hoje).length;
  $("kpiMes").textContent  = adm.agendamentos.filter((a) => a.data.startsWith(mes)).length;

  const contagem = {};
  adm.agendamentos.forEach((a) => {
    contagem[a.servicoNome] = (contagem[a.servicoNome] || 0) + 1;
  });

  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);

  $("topServicos").innerHTML = top.length
    ? top.map(([n, q]) => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <span>💅 ${n}</span><strong>${q}x</strong>
        </div>`).join("")
    : "<p style='color:var(--muted)'>Nenhum dado ainda.</p>";

  const proximos = [...adm.agendamentos]
    .filter((a) => a.data >= hoje && a.status !== "cancelado")
    .slice(0, 6);

  $("proximosAgend").innerHTML = proximos.length
    ? proximos.map((a) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <strong>${a.clienteNome}</strong><br>
            <small>${a.servicoNome} — ${a.data} às ${a.horario}</small>
          </div>
          <span class="badge ${a.status}">${a.status}</span>
        </div>`).join("")
    : "<p style='color:var(--muted)'>Nenhum agendamento próximo.</p>";
}

/* ─── AGENDA SEMANAL ─── */
function getSemana() {
  const days = [];
  const base = new Date();
  base.setDate(base.getDate() + adm.semanaOffset * 7);
  const dow    = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function renderAgendaSemana() {
  const dias  = getSemana();
  const el    = $("agendaSemana");
  const nomes = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  el.innerHTML = "";

  dias.forEach((data, i) => {
    const ags    = adm.agendamentos.filter((a) => a.data === data && a.status !== "cancelado");
    const isHoje = data === today();

    const col = document.createElement("div");
    col.className = `agenda-day${isHoje ? " today" : ""}`;
    col.innerHTML = `
      <div class="agenda-day-header">
        ${nomes[i]}<br>
        <strong>${data.slice(8)}</strong>
      </div>
      ${ags.map((a) => `
        <div class="agenda-appoint" title="${a.clienteNome} — ${a.servicoNome}">
          ${a.horario} ${a.clienteNome.split(" ")[0]}
        </div>
      `).join("")}
    `;
    el.appendChild(col);
  });

  const d1 = dias[0], d2 = dias[6];
  $("semanaTitle").textContent = `${d1.slice(8)}/${d1.slice(5,7)} — ${d2.slice(8)}/${d2.slice(5,7)}`;
}

$("btnSemanaAnterior").onclick = () => { adm.semanaOffset--; renderAgendaSemana(); };
$("btnProximaSemana").onclick  = () => { adm.semanaOffset++; renderAgendaSemana(); };

/* ─── CONFIGURAÇÕES ─── */
async function carregarConfiguracoes() {
  try {
    const snap = await getDoc(doc(db, "manicures", MANICURE_ID));
    if (snap.exists()) {
      const d = snap.data();
      if (d.nome)      $("cfgNome").value     = d.nome;
      if (d.whatsapp)  $("cfgWhats").value    = d.whatsapp;
      if (d.endereco)  $("cfgEndereco").value = d.endereco;
      if (d.instagram) $("cfgInsta").value    = d.instagram;
    }
  } catch { /* usa padrão */ }
}

$("btnSalvarConfig").onclick = async () => {
  showLoading(true);

  const cfg = {
    nome:      $("cfgNome").value.trim(),
    whatsapp:  $("cfgWhats").value.trim(),
    endereco:  $("cfgEndereco").value.trim(),
    instagram: $("cfgInsta").value.trim().replace("@", ""),
    atualizadoEm: serverTimestamp()
  };

  try {
    await setDoc(doc(db, "manicures", MANICURE_ID), cfg, { merge: true });
  } catch { /* demo */ }

  showLoading(false);
  showToast("✅ Configurações salvas!");
};

$("btnCopiarLink").onclick = () => {
  const link = $("cfgLink").value;
  navigator.clipboard.writeText(link)
    .then(() => showToast("📋 Link copiado!"))
    .catch(() => showToast("Link: " + link));
};
