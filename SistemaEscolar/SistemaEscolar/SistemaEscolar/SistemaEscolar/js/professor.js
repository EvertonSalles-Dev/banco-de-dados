/* ==========================================================================
   professor.js
   Lógica da área do professor: proteção de rota, navegação, CRUD de notas,
   CRUD de frequência, envio de avisos, pesquisa de alunos e edição de perfil.
   ========================================================================== */

let sessaoProfessor = null;
let professorAtual = null;

document.addEventListener("DOMContentLoaded", () => {
  sessaoProfessor = sessaoProteger("professor");
  if (!sessaoProfessor) return;

  professorAtual = usuarioBuscarPorId(sessaoProfessor.id);
  if (!professorAtual) { sessaoEncerrar(); window.location.href = "index.html"; return; }

  configurarSidebar();
  configurarNavbarUsuario();
  configurarLogout();
  configurarNavegacaoSecoes();
  configurarModais();
  configurarFormularioPerfil();
  configurarPesquisaAlunos();

  carregarDashboard();
  carregarAlunos();
  carregarTurmas();
  carregarNotas();
  carregarFrequencia();
  carregarAvisos();
  carregarPerfil();
});

/* ------------------------------ Sidebar / navbar --------------------------- */
function configurarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const conteudo = document.getElementById("conteudo");
  document.getElementById("btnRecolherSidebar").addEventListener("click", () => {
    sidebar.classList.toggle("recolhida");
    conteudo.classList.toggle("expandido");
  });
  document.getElementById("btnMenuMobile").addEventListener("click", () => sidebar.classList.toggle("mobile-aberta"));
}

function configurarNavbarUsuario() {
  document.getElementById("avatarNavbar").textContent = professorAtual.nome.charAt(0).toUpperCase();
  document.getElementById("nomeNavbar").textContent = professorAtual.nome;
  document.getElementById("saudacaoNome").textContent = professorAtual.nome.split(" ")[0];
}

function configurarLogout() {
  const sair = () => uiConfirmar("Deseja realmente sair do sistema?", () => {
    sessaoEncerrar();
    window.location.href = "index.html";
  });
  document.getElementById("btnSair").addEventListener("click", (e) => { e.preventDefault(); sair(); });
  document.getElementById("btnSairConfig").addEventListener("click", sair);
}

/* --------------------------- Navegação entre seções ------------------------- */
function configurarNavegacaoSecoes() {
  const itens = document.querySelectorAll(".sidebar__item[data-secao]");
  const titulos = {
    dashboard: "Dashboard", alunos: "Alunos", turmas: "Turmas", notas: "Notas",
    frequencia: "Frequência", mensagens: "Mensagens", perfil: "Perfil", configuracoes: "Configurações"
  };
  itens.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const chave = item.dataset.secao;
      itens.forEach(i => i.classList.remove("ativo"));
      item.classList.add("ativo");
      document.querySelectorAll(".secao").forEach(s => s.style.display = "none");
      document.getElementById(`secao-${chave}`).style.display = "block";
      document.getElementById("tituloSecao").textContent = titulos[chave];
      document.getElementById("sidebar").classList.remove("mobile-aberta");
    });
  });
}

/* Retorna todos os alunos cadastrados no sistema. */
function listarTodosAlunos() {
  return usuarioPesquisar("", "aluno");
}

/* --------------------------------- Dashboard --------------------------------- */
function carregarDashboard() {
  const alunos = listarTodosAlunos();
  const turmas = turmaListar();
  const notas = notaListarTodas();
  const disciplinas = [...new Set(notas.map(n => n.disciplina))];

  document.getElementById("cardTotalAlunos").textContent = alunos.length;
  document.getElementById("cardTotalTurmas").textContent = turmas.length;
  document.getElementById("cardTotalDisciplinas").textContent = disciplinas.length;
  document.getElementById("cardTotalNotas").textContent = notas.length;

  const tbody = document.getElementById("tabelaResumoAlunos");
  if (alunos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-user-graduate"></i><p>Nenhum aluno cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = alunos.map(a => {
    const turma = turmas.find(t => t.id === a.turmaId);
    const notasAluno = notaListarPorAluno(a.id);
    const media = notasAluno.length ? (notasAluno.reduce((s, n) => s + Number(n.valor), 0) / notasAluno.length).toFixed(1) : "-";
    const freq = frequenciaCalcularPercentual(a.id);
    return `<tr><td>${a.nome}</td><td>${turma ? turma.nome : "-"}</td><td>${media}</td><td>${freq}%</td></tr>`;
  }).join("");
}

/* ---------------------------------- Alunos ----------------------------------- */
function carregarAlunos(termo = "") {
  const alunos = usuarioPesquisar(termo, "aluno");
  const turmas = turmaListar();
  const tbody = document.getElementById("tabelaAlunos");

  if (alunos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-magnifying-glass"></i><p>Nenhum aluno encontrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = alunos.map(a => {
    const turma = turmas.find(t => t.id === a.turmaId);
    return `
      <tr>
        <td>${a.nome}</td>
        <td>${a.email}</td>
        <td>${turma ? turma.nome : "-"}</td>
        <td class="acoes-tabela">
          <button class="acao-btn" title="Ver notas" onclick="verNotasDoAluno(${a.id})"><i class="fa-solid fa-star"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function configurarPesquisaAlunos() {
  document.getElementById("pesquisaAlunos").addEventListener("input", (e) => carregarAlunos(e.target.value));
}

function verNotasDoAluno(alunoId) {
  document.querySelector('.sidebar__item[data-secao="notas"]').click();
  uiToast("alerta", "Filtro aplicado", "Exibindo referência do aluno selecionado.");
  const linhas = document.querySelectorAll("#tabelaNotasProfessor tr[data-aluno]");
  linhas.forEach(l => {
    l.style.background = Number(l.dataset.aluno) === alunoId ? "#E4EEFF" : "";
  });
}

/* ---------------------------------- Turmas ------------------------------------ */
function carregarTurmas() {
  const turmas = turmaListar();
  const cursos = cursoListar();
  const alunos = listarTodosAlunos();
  const tbody = document.getElementById("tabelaTurmasProfessor");

  if (turmas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-people-group"></i><p>Nenhuma turma cadastrada.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = turmas.map(t => {
    const curso = cursos.find(c => c.id === t.cursoId);
    const qtdAlunos = alunos.filter(a => a.turmaId === t.id).length;
    return `<tr><td>${t.nome}</td><td>${curso ? curso.nome : "-"}</td><td>${t.turno}</td><td>${qtdAlunos}</td></tr>`;
  }).join("");
}

/* ----------------------------------- Notas ------------------------------------- */
function carregarNotas() {
  const notas = notaListarTodas().filter(n => n.professorId === professorAtual.id || !n.professorId);
  const alunos = listarTodosAlunos();
  const tbody = document.getElementById("tabelaNotasProfessor");

  if (notas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="estado-vazio"><i class="fa-solid fa-star"></i><p>Nenhuma nota lançada.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = notas.map(n => {
    const aluno = alunos.find(a => a.id === n.alunoId);
    return `
      <tr data-aluno="${n.alunoId}">
        <td>${aluno ? aluno.nome : "Aluno removido"}</td>
        <td>${n.disciplina}</td>
        <td>${n.bimestre}º Bim.</td>
        <td>${Number(n.valor).toFixed(1)}</td>
        <td class="acoes-tabela">
          <button class="acao-btn" onclick="abrirModalNota(${n.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="acao-btn excluir" onclick="excluirNota(${n.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function preencherSelectAlunos(idSelect) {
  const alunos = listarTodosAlunos();
  const select = document.getElementById(idSelect);
  select.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join("");
}

function abrirModalNota(id = null) {
  preencherSelectAlunos("notaAluno");
  document.getElementById("formNota").reset();
  document.getElementById("notaId").value = "";
  document.getElementById("tituloModalNota").textContent = id ? "Editar nota" : "Lançar nota";

  if (id) {
    const nota = notaListarTodas().find(n => n.id === id);
    if (nota) {
      document.getElementById("notaId").value = nota.id;
      document.getElementById("notaAluno").value = nota.alunoId;
      document.getElementById("notaDisciplina").value = nota.disciplina;
      document.getElementById("notaBimestre").value = nota.bimestre;
      document.getElementById("notaValor").value = nota.valor;
    }
  }
  abrirModal("modalNota");
}

function excluirNota(id) {
  uiConfirmar("Deseja realmente excluir esta nota?", () => {
    notaExcluir(id);
    carregarNotas();
    carregarDashboard();
    uiToast("sucesso", "Nota excluída com sucesso.");
  });
}

/* -------------------------------- Frequência ------------------------------------ */
function carregarFrequencia() {
  const registros = frequenciaListarTodas();
  const alunos = listarTodosAlunos();
  const tbody = document.getElementById("tabelaFrequenciaProfessor");

  if (registros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="estado-vazio"><i class="fa-solid fa-calendar-check"></i><p>Nenhuma frequência lançada.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = registros.map(r => {
    const aluno = alunos.find(a => a.id === r.alunoId);
    return `
      <tr>
        <td>${aluno ? aluno.nome : "Aluno removido"}</td>
        <td>${r.disciplina}</td>
        <td>${formatarDataBR(r.data)}</td>
        <td><span class="badge ${r.presente ? 'presente' : 'falta'}">${r.presente ? 'Presente' : 'Falta'}</span></td>
        <td class="acoes-tabela">
          <button class="acao-btn excluir" onclick="excluirFrequencia(${r.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function excluirFrequencia(id) {
  uiConfirmar("Deseja realmente excluir este registro de frequência?", () => {
    frequenciaExcluir(id);
    carregarFrequencia();
    uiToast("sucesso", "Registro excluído com sucesso.");
  });
}

/* ---------------------------------- Avisos --------------------------------------- */
function carregarAvisos() {
  const avisos = avisoListar();
  const container = document.getElementById("listaAvisosProfessor");
  if (avisos.length === 0) {
    container.innerHTML = `<div class="estado-vazio"><i class="fa-solid fa-envelope"></i><p>Nenhum aviso enviado ainda.</p></div>`;
    return;
  }
  container.innerHTML = avisos.map(a => `
    <div class="aviso-item">
      <div class="aviso-item__titulo">${a.titulo}</div>
      <div class="aviso-item__texto">${a.mensagem}</div>
      <span class="aviso-item__data">${formatarDataHoraBR(a.data)} — por ${a.autor || "Professor"}</span>
    </div>
  `).join("");
}

/* ----------------------------------- Perfil --------------------------------------- */
function carregarPerfil() {
  document.getElementById("perfilTelefone").value = professorAtual.telefone || "";
  document.getElementById("perfilCelular").value = professorAtual.celular || "";
  document.getElementById("perfilEndereco").value = professorAtual.endereco || "";
}

function configurarFormularioPerfil() {
  document.getElementById("perfilTelefone").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));
  document.getElementById("perfilCelular").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));

  document.getElementById("formPerfilProfessor").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const novaSenha = document.getElementById("perfilSenha").value;
    const dados = {
      telefone: document.getElementById("perfilTelefone").value.trim(),
      celular: document.getElementById("perfilCelular").value.trim(),
      endereco: document.getElementById("perfilEndereco").value.trim()
    };
    if (novaSenha) {
      if (!validarSenha(novaSenha)) {
        uiToast("erro", "Senha inválida", "Use 6+ caracteres, com letra e número.");
        return;
      }
      dados.senha = novaSenha;
    }
    professorAtual = usuarioEditar(professorAtual.id, dados);
    document.getElementById("perfilSenha").value = "";
    uiToast("sucesso", "Perfil atualizado com sucesso!");
  });
}

/* ------------------------------------ Modais ---------------------------------------- */
function configurarModais() {
  document.querySelectorAll("[data-fechar]").forEach(el => {
    el.addEventListener("click", () => fecharModal(el.dataset.fechar));
  });
  document.querySelectorAll(".modal-fundo").forEach(fundo => {
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fundo.classList.remove("ativo"); });
  });

  document.getElementById("btnNovaNota").addEventListener("click", () => abrirModalNota());
  document.getElementById("btnNovaFrequencia").addEventListener("click", () => {
    preencherSelectAlunos("freqAluno");
    document.getElementById("formFrequencia").reset();
    document.getElementById("freqData").value = new Date().toISOString().slice(0, 10);
    abrirModal("modalFrequencia");
  });
  document.getElementById("btnNovoAviso").addEventListener("click", () => {
    document.getElementById("formAviso").reset();
    abrirModal("modalAviso");
  });

  document.getElementById("btnSalvarNota").addEventListener("click", salvarNota);
  document.getElementById("btnSalvarFrequencia").addEventListener("click", salvarFrequencia);
  document.getElementById("btnSalvarAviso").addEventListener("click", salvarAviso);
}

function abrirModal(id) { document.getElementById(id).classList.add("ativo"); }
function fecharModal(id) { document.getElementById(id).classList.remove("ativo"); }

function salvarNota() {
  const id = document.getElementById("notaId").value;
  const alunoId = Number(document.getElementById("notaAluno").value);
  const disciplina = document.getElementById("notaDisciplina").value.trim();
  const bimestre = Number(document.getElementById("notaBimestre").value);
  const valor = Number(document.getElementById("notaValor").value);

  if (!disciplina || isNaN(valor) || valor < 0 || valor > 10) {
    uiToast("erro", "Dados inválidos", "Verifique a disciplina e a nota (0 a 10).");
    return;
  }

  if (id) {
    notaEditar(id, { alunoId, disciplina, bimestre, valor });
    uiToast("sucesso", "Nota atualizada com sucesso!");
  } else {
    notaAdicionar({ alunoId, disciplina, bimestre, valor, professorId: professorAtual.id });
    uiToast("sucesso", "Nota lançada com sucesso!");
  }
  fecharModal("modalNota");
  carregarNotas();
  carregarDashboard();
}

function salvarFrequencia() {
  const alunoId = Number(document.getElementById("freqAluno").value);
  const disciplina = document.getElementById("freqDisciplina").value.trim();
  const data = document.getElementById("freqData").value;
  const presente = document.getElementById("freqSituacao").value === "true";

  if (!disciplina || !data) {
    uiToast("erro", "Dados inválidos", "Preencha disciplina e data.");
    return;
  }

  frequenciaAdicionar({ alunoId, disciplina, data, presente });
  uiToast("sucesso", "Frequência lançada com sucesso!");
  fecharModal("modalFrequencia");
  carregarFrequencia();
}

function salvarAviso() {
  const titulo = document.getElementById("avisoTitulo").value.trim();
  const mensagem = document.getElementById("avisoMensagem").value.trim();

  if (!titulo || !mensagem) {
    uiToast("erro", "Dados inválidos", "Preencha título e mensagem.");
    return;
  }

  avisoAdicionar({ titulo, mensagem, autor: professorAtual.nome });
  uiToast("sucesso", "Aviso enviado com sucesso!");
  fecharModal("modalAviso");
  carregarAvisos();
}

/* ----------------------------------- Utilidades ---------------------------------------- */
function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}
function formatarDataHoraBR(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString("pt-BR") + " às " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
