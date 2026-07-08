/* ==========================================================================
   administrador.js
   Lógica do painel administrativo: proteção de rota, navegação, dashboard
   com gráfico, CRUD completo de usuários/turmas/cursos, relatórios e
   backup/restauração/importação/exportação/limpeza do LocalStorage.
   ========================================================================== */

let sessaoAdmin = null;
let adminAtual = null;

document.addEventListener("DOMContentLoaded", () => {
  sessaoAdmin = sessaoProteger("administrador");
  if (!sessaoAdmin) return;

  adminAtual = usuarioBuscarPorId(sessaoAdmin.id);
  if (!adminAtual) { sessaoEncerrar(); window.location.href = "index.html"; return; }

  configurarSidebar();
  configurarNavbarUsuario();
  configurarLogout();
  configurarNavegacaoSecoes();
  configurarModais();
  configurarFiltrosUsuarios();
  configurarFormularioPerfil();
  configurarBackup();

  carregarDashboard();
  carregarUsuarios();
  carregarAlunosAdm();
  carregarProfessoresAdm();
  carregarAdminsAdm();
  carregarTurmasAdm();
  carregarCursosAdm();
  carregarRelatorios();
  carregarPerfil();

  configurarBotoesRelatorios();
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
  document.getElementById("avatarNavbar").textContent = adminAtual.nome.charAt(0).toUpperCase();
  document.getElementById("nomeNavbar").textContent = adminAtual.nome;
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
    dashboard: "Dashboard", usuarios: "Usuários", alunos: "Alunos", professores: "Professores",
    administradores: "Administradores", turmas: "Turmas", cursos: "Cursos",
    relatorios: "Relatórios", configuracoes: "Configurações", backup: "Backup"
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

      if (chave === "dashboard") carregarDashboard();
      if (chave === "relatorios") carregarRelatorios();
    });
  });
}

/* ==================================== DASHBOARD ============================== */
function carregarDashboard() {
  const alunos = usuarioPesquisar("", "aluno");
  const professores = usuarioPesquisar("", "professor");
  const admins = usuarioPesquisar("", "administrador");
  const todos = usuarioPesquisar("", "todos");
  const cursos = cursoListar();
  const turmas = turmaListar();

  document.getElementById("cardTotalAlunos").textContent = alunos.length;
  document.getElementById("cardTotalProfessores").textContent = professores.length;
  document.getElementById("cardTotalAdmins").textContent = admins.length;
  document.getElementById("cardTotalUsuarios").textContent = todos.length;
  document.getElementById("cardTotalCursos").textContent = cursos.length;
  document.getElementById("cardTotalTurmas").textContent = turmas.length;

  const maiorValor = Math.max(alunos.length, professores.length, admins.length, 1);
  const grafico = document.getElementById("graficoUsuarios");
  const grupos = [
    { label: "Alunos", valor: alunos.length },
    { label: "Professores", valor: professores.length },
    { label: "Administradores", valor: admins.length }
  ];
  grafico.innerHTML = grupos.map(g => `
    <div class="grafico-barras__coluna">
      <span class="grafico-barras__valor">${g.valor}</span>
      <div class="grafico-barras__barra" style="height:${Math.max((g.valor / maiorValor) * 100, 4)}%;"></div>
      <span class="grafico-barras__label">${g.label}</span>
    </div>
  `).join("");

  const ultimos = [...todos]
    .sort((a, b) => new Date(b.dataCadastro || 0) - new Date(a.dataCadastro || 0))
    .slice(0, 6);

  const tbody = document.getElementById("tabelaUltimosCadastros");
  if (ultimos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-users"></i><p>Nenhum usuário cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = ultimos.map(u => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td><span class="badge ${u.tipo}">${u.tipo}</span></td>
      <td>${u.dataCadastro ? new Date(u.dataCadastro).toLocaleDateString("pt-BR") : "-"}</td>
    </tr>
  `).join("");
}

/* ================================= CRUD USUÁRIOS ============================== */
function configurarFiltrosUsuarios() {
  document.getElementById("pesquisaUsuarios").addEventListener("input", carregarUsuarios);
  document.getElementById("filtroTipoUsuario").addEventListener("change", carregarUsuarios);
  document.getElementById("ordenarUsuarios").addEventListener("change", carregarUsuarios);

  document.getElementById("pesquisaAlunosAdm").addEventListener("input", (e) => carregarAlunosAdm(e.target.value));
  document.getElementById("pesquisaProfessoresAdm").addEventListener("input", (e) => carregarProfessoresAdm(e.target.value));
}

function carregarUsuarios() {
  const termo = document.getElementById("pesquisaUsuarios").value;
  const tipo = document.getElementById("filtroTipoUsuario").value;
  const ordenacao = document.getElementById("ordenarUsuarios").value;

  let usuarios = usuarioPesquisar(termo, tipo);
  usuarios = ordenacao === "recentes"
    ? usuarios.sort((a, b) => new Date(b.dataCadastro || 0) - new Date(a.dataCadastro || 0))
    : usuarios.sort((a, b) => a.nome.localeCompare(b.nome));

  const tbody = document.getElementById("tabelaUsuarios");
  if (usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="estado-vazio"><i class="fa-solid fa-magnifying-glass"></i><p>Nenhum usuário encontrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = usuarios.map(u => linhaUsuario(u)).join("");
}

function linhaUsuario(u) {
  return `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td><span class="badge ${u.tipo}">${u.tipo}</span></td>
      <td>${u.cidade || "-"}</td>
      <td class="acoes-tabela">
        <button class="acao-btn" title="Editar" onclick="abrirModalUsuario(${u.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="acao-btn excluir" title="Excluir" onclick="excluirUsuario(${u.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
}

function carregarAlunosAdm(termo = "") {
  const alunos = usuarioPesquisar(termo, "aluno");
  const turmas = turmaListar();
  const tbody = document.getElementById("tabelaAlunosAdm");
  if (alunos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-user-graduate"></i><p>Nenhum aluno cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = alunos.map(a => {
    const turma = turmas.find(t => t.id === a.turmaId);
    return `
      <tr>
        <td>${a.nome}</td><td>${a.email}</td><td>${turma ? turma.nome : "-"}</td>
        <td class="acoes-tabela">
          <button class="acao-btn" onclick="abrirModalUsuario(${a.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="acao-btn excluir" onclick="excluirUsuario(${a.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function carregarProfessoresAdm(termo = "") {
  const professores = usuarioPesquisar(termo, "professor");
  const tbody = document.getElementById("tabelaProfessoresAdm");
  if (professores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-chalkboard-user"></i><p>Nenhum professor cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = professores.map(p => `
    <tr>
      <td>${p.nome}</td><td>${p.email}</td><td>${p.celular || "-"}</td>
      <td class="acoes-tabela">
        <button class="acao-btn" onclick="abrirModalUsuario(${p.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="acao-btn excluir" onclick="excluirUsuario(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("");
}

function carregarAdminsAdm() {
  const admins = usuarioPesquisar("", "administrador");
  const tbody = document.getElementById("tabelaAdminsAdm");
  if (admins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-user-shield"></i><p>Nenhum administrador cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = admins.map(a => `
    <tr>
      <td>${a.nome}</td><td>${a.email}</td><td>${a.celular || "-"}</td>
      <td class="acoes-tabela">
        <button class="acao-btn" onclick="abrirModalUsuario(${a.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="acao-btn excluir" onclick="excluirUsuario(${a.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("");
}

function excluirUsuario(id) {
  if (id === adminAtual.id) {
    uiToast("erro", "Ação não permitida", "Você não pode excluir seu próprio usuário logado.");
    return;
  }
  uiConfirmar("Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.", () => {
    usuarioExcluir(id);
    atualizarTudo();
    uiToast("sucesso", "Usuário excluído com sucesso.");
  });
}

/* --------------------------- Modal de usuário (add/edit) --------------------- */
function preencherSelectTurmasModal() {
  const turmas = turmaListar();
  const select = document.getElementById("usuarioTurma");
  select.innerHTML = `<option value="">Nenhuma</option>` + turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
}

function abrirModalUsuario(id = null, tipoPadrao = "aluno") {
  preencherSelectTurmasModal();
  document.getElementById("formUsuario").reset();
  document.getElementById("usuarioId").value = "";
  document.getElementById("labelSenhaUsuario").textContent = "Senha *";
  document.getElementById("usuarioSenha").required = true;

  if (id) {
    const usuario = usuarioBuscarPorId(id);
    document.getElementById("tituloModalUsuario").textContent = "Editar usuário";
    document.getElementById("usuarioId").value = usuario.id;
    document.getElementById("usuarioTipo").value = usuario.tipo;
    document.getElementById("usuarioNome").value = usuario.nome;
    document.getElementById("usuarioCpf").value = usuario.cpf || "";
    document.getElementById("usuarioRg").value = usuario.rg || "";
    document.getElementById("usuarioEmail").value = usuario.email;
    document.getElementById("usuarioCelular").value = usuario.celular || "";
    document.getElementById("usuarioTurma").value = usuario.turmaId || "";
    document.getElementById("usuarioCidade").value = usuario.cidade || "";
    document.getElementById("usuarioEstado").value = usuario.estado || "";
    document.getElementById("labelSenhaUsuario").textContent = "Nova senha (opcional)";
    document.getElementById("usuarioSenha").required = false;
  } else {
    document.getElementById("tituloModalUsuario").textContent = "Novo usuário";
    document.getElementById("usuarioTipo").value = tipoPadrao === "todos" ? "aluno" : tipoPadrao;
  }
  abrirModal("modalUsuario");
}

function salvarUsuario() {
  const id = document.getElementById("usuarioId").value;
  const dados = {
    tipo: document.getElementById("usuarioTipo").value,
    nome: document.getElementById("usuarioNome").value.trim(),
    cpf: document.getElementById("usuarioCpf").value.trim(),
    rg: document.getElementById("usuarioRg").value.trim(),
    email: document.getElementById("usuarioEmail").value.trim(),
    celular: document.getElementById("usuarioCelular").value.trim(),
    turmaId: document.getElementById("usuarioTurma").value ? Number(document.getElementById("usuarioTurma").value) : undefined,
    cidade: document.getElementById("usuarioCidade").value.trim(),
    estado: document.getElementById("usuarioEstado").value.trim()
  };
  const senha = document.getElementById("usuarioSenha").value;

  if (!validarCampoObrigatorio(dados.nome)) return uiToast("erro", "Nome obrigatório");
  if (!validarCPF(dados.cpf)) return uiToast("erro", "CPF inválido");
  if (!validarEmail(dados.email)) return uiToast("erro", "E-mail inválido");
  if (!id && !validarSenha(senha)) return uiToast("erro", "Senha inválida", "Use 6+ caracteres, com letra e número.");
  if (senha) dados.senha = senha;

  try {
    if (id) {
      usuarioEditar(id, dados);
      uiToast("sucesso", "Usuário atualizado com sucesso!");
    } else {
      usuarioAdicionar(dados);
      uiToast("sucesso", "Usuário cadastrado com sucesso!");
    }
    fecharModal("modalUsuario");
    atualizarTudo();
  } catch (erro) {
    uiToast("erro", "Erro ao salvar", erro.message);
  }
}

/* ================================= CRUD TURMAS ================================= */
function carregarTurmasAdm() {
  const turmas = turmaListar();
  const cursos = cursoListar();
  const alunos = usuarioPesquisar("", "aluno");
  const tbody = document.getElementById("tabelaTurmasAdm");

  if (turmas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="estado-vazio"><i class="fa-solid fa-people-group"></i><p>Nenhuma turma cadastrada.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = turmas.map(t => {
    const curso = cursos.find(c => c.id === t.cursoId);
    const qtd = alunos.filter(a => a.turmaId === t.id).length;
    return `
      <tr>
        <td>${t.nome}</td><td>${curso ? curso.nome : "-"}</td><td>${t.turno}</td><td>${qtd}</td>
        <td class="acoes-tabela">
          <button class="acao-btn" onclick="abrirModalTurma(${t.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="acao-btn excluir" onclick="excluirTurma(${t.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function preencherSelectCursosModal() {
  const cursos = cursoListar();
  document.getElementById("turmaCurso").innerHTML = cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
}

function abrirModalTurma(id = null) {
  preencherSelectCursosModal();
  document.getElementById("formTurma").reset();
  document.getElementById("turmaId").value = "";
  document.getElementById("tituloModalTurma").textContent = id ? "Editar turma" : "Cadastrar turma";

  if (id) {
    const turma = turmaListar().find(t => t.id === id);
    document.getElementById("turmaId").value = turma.id;
    document.getElementById("turmaNome").value = turma.nome;
    document.getElementById("turmaCurso").value = turma.cursoId;
    document.getElementById("turmaTurno").value = turma.turno;
  }
  abrirModal("modalTurma");
}

function salvarTurma() {
  const id = document.getElementById("turmaId").value;
  const dados = {
    nome: document.getElementById("turmaNome").value.trim(),
    cursoId: Number(document.getElementById("turmaCurso").value),
    turno: document.getElementById("turmaTurno").value
  };
  if (!validarCampoObrigatorio(dados.nome)) return uiToast("erro", "Informe o nome da turma.");

  if (id) { turmaEditar(id, dados); uiToast("sucesso", "Turma atualizada com sucesso!"); }
  else { turmaAdicionar(dados); uiToast("sucesso", "Turma cadastrada com sucesso!"); }

  fecharModal("modalTurma");
  atualizarTudo();
}

function excluirTurma(id) {
  uiConfirmar("Deseja realmente excluir esta turma?", () => {
    turmaExcluir(id);
    atualizarTudo();
    uiToast("sucesso", "Turma excluída com sucesso.");
  });
}

/* ================================= CRUD CURSOS ================================== */
function carregarCursosAdm() {
  const cursos = cursoListar();
  const turmas = turmaListar();
  const tbody = document.getElementById("tabelaCursosAdm");

  if (cursos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-graduation-cap"></i><p>Nenhum curso cadastrado.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = cursos.map(c => {
    const qtdTurmas = turmas.filter(t => t.cursoId === c.id).length;
    return `
      <tr>
        <td>${c.nome}</td><td>${c.cargaHoraria}h</td><td>${qtdTurmas}</td>
        <td class="acoes-tabela">
          <button class="acao-btn" onclick="abrirModalCurso(${c.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="acao-btn excluir" onclick="excluirCurso(${c.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }).join("");
}

function abrirModalCurso(id = null) {
  document.getElementById("formCurso").reset();
  document.getElementById("cursoId").value = "";
  document.getElementById("tituloModalCurso").textContent = id ? "Editar curso" : "Cadastrar curso";
  if (id) {
    const curso = cursoListar().find(c => c.id === id);
    document.getElementById("cursoId").value = curso.id;
    document.getElementById("cursoNome").value = curso.nome;
    document.getElementById("cursoCarga").value = curso.cargaHoraria;
  }
  abrirModal("modalCurso");
}

function salvarCurso() {
  const id = document.getElementById("cursoId").value;
  const dados = {
    nome: document.getElementById("cursoNome").value.trim(),
    cargaHoraria: Number(document.getElementById("cursoCarga").value)
  };
  if (!validarCampoObrigatorio(dados.nome) || !dados.cargaHoraria) return uiToast("erro", "Preencha todos os campos do curso.");

  if (id) { cursoEditar(id, dados); uiToast("sucesso", "Curso atualizado com sucesso!"); }
  else { cursoAdicionar(dados); uiToast("sucesso", "Curso cadastrado com sucesso!"); }

  fecharModal("modalCurso");
  atualizarTudo();
}

function excluirCurso(id) {
  uiConfirmar("Deseja realmente excluir este curso?", () => {
    cursoExcluir(id);
    atualizarTudo();
    uiToast("sucesso", "Curso excluído com sucesso.");
  });
}

/* ================================== RELATÓRIOS =================================== */
function configurarBotoesRelatorios() {
  const btn = document.getElementById("btnRemoverAvisos");
  if (!btn) return;

  btn.addEventListener("click", () => {
    uiConfirmar("Deseja realmente apagar TODOS os avisos? Esta ação não pode ser desfeita.", () => {
      const avisos = avisoListar();
      avisos.forEach(a => avisoExcluir(a.id));
      uiToast("sucesso", "Avisos apagados com sucesso.");
      atualizarTudo();
    });
  });
}

function carregarRelatorios() {
  const notas = notaListarTodas();
  const alunos = usuarioPesquisar("", "aluno");
  const avisos = avisoListar();

  document.getElementById("relTotalNotas").textContent = notas.length;
  document.getElementById("relTotalAvisos").textContent = avisos.length;

  const mediaGeral = notas.length ? (notas.reduce((s, n) => s + Number(n.valor), 0) / notas.length).toFixed(1) : "0";
  document.getElementById("relMediaGeral").textContent = mediaGeral;

  const mediaFreq = alunos.length
    ? Math.round(alunos.reduce((s, a) => s + frequenciaCalcularPercentual(a.id), 0) / alunos.length)
    : 0;
  document.getElementById("relMediaFreq").textContent = `${mediaFreq}%`;

  const container = document.getElementById("listaAvisosRelatorio");
  if (avisos.length === 0) {
    container.innerHTML = `<div class="estado-vazio"><i class="fa-solid fa-envelope"></i><p>Nenhum aviso enviado.</p></div>`;
    return;
  }
  container.innerHTML = avisos.slice(0, 8).map(a => `
    <div class="aviso-item">
      <div class="aviso-item__titulo">${a.titulo}</div>
      <div class="aviso-item__texto">${a.mensagem}</div>
      <span class="aviso-item__data">${new Date(a.data).toLocaleDateString("pt-BR")} — por ${a.autor || "Sistema"}</span>
    </div>
  `).join("");
}

/* ==================================== PERFIL ====================================== */
function carregarPerfil() {
  document.getElementById("perfilTelefone").value = adminAtual.telefone || "";
  document.getElementById("perfilCelular").value = adminAtual.celular || "";
}

function configurarFormularioPerfil() {
  document.getElementById("perfilTelefone").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));
  document.getElementById("perfilCelular").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));

  document.getElementById("formPerfilAdmin").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const novaSenha = document.getElementById("perfilSenha").value;
    const dados = {
      telefone: document.getElementById("perfilTelefone").value.trim(),
      celular: document.getElementById("perfilCelular").value.trim()
    };
    if (novaSenha) {
      if (!validarSenha(novaSenha)) return uiToast("erro", "Senha inválida", "Use 6+ caracteres, com letra e número.");
      dados.senha = novaSenha;
    }
    adminAtual = usuarioEditar(adminAtual.id, dados);
    document.getElementById("perfilSenha").value = "";
    uiToast("sucesso", "Perfil atualizado com sucesso!");
  });
}

/* ============================== BACKUP / RESTAURAÇÃO =============================== */
function configurarBackup() {
  document.getElementById("btnFazerBackup").addEventListener("click", () => {
    dbFazerBackup();
    uiToast("sucesso", "Backup gerado!", "O download foi iniciado.");
  });

  document.getElementById("btnExportarJson").addEventListener("click", () => {
    dbFazerBackup();
    uiToast("sucesso", "Dados exportados!", "Arquivo JSON baixado com sucesso.");
  });

  document.getElementById("btnRestaurarBackup").addEventListener("click", () => document.getElementById("inputRestaurarBackup").click());
  document.getElementById("inputImportarJson").parentElement; // no-op guard
  document.getElementById("btnImportarJson").addEventListener("click", () => document.getElementById("inputImportarJson").click());

  document.getElementById("inputRestaurarBackup").addEventListener("change", (e) => processarArquivoImportado(e, "Backup restaurado com sucesso!"));
  document.getElementById("inputImportarJson").addEventListener("change", (e) => processarArquivoImportado(e, "Dados importados com sucesso!"));

  document.getElementById("btnLimparBanco").addEventListener("click", () => {
    uiConfirmar("Isto apagará TODOS os dados do sistema permanentemente. Deseja continuar?", () => {
      dbLimparTudo();
      uiToast("sucesso", "Banco de dados limpo.", "A página será recarregada.");
      setTimeout(() => { sessaoEncerrar(); window.location.href = "index.html"; }, 1500);
    });
  });
}

function processarArquivoImportado(evento, mensagemSucesso) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = (e) => {
    try {
      const objeto = JSON.parse(e.target.result);
      dbRestaurarBackup(objeto);
      uiToast("sucesso", mensagemSucesso);
      atualizarTudo();
      carregarDashboard();
    } catch (erro) {
      uiToast("erro", "Arquivo inválido", "Não foi possível ler o arquivo JSON selecionado.");
    }
  };
  leitor.readAsText(arquivo);
  evento.target.value = "";
}

/* =================================== MODAIS GERAIS =================================== */
function configurarModais() {
  document.querySelectorAll("[data-fechar]").forEach(el => {
    el.addEventListener("click", () => fecharModal(el.dataset.fechar));
  });
  document.querySelectorAll(".modal-fundo").forEach(fundo => {
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fundo.classList.remove("ativo"); });
  });

  document.getElementById("usuarioCpf").addEventListener("input", e => e.target.value = mascararCPF(e.target.value));
  document.getElementById("usuarioRg").addEventListener("input", e => e.target.value = mascararRG(e.target.value));
  document.getElementById("usuarioCelular").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));

  document.getElementById("btnNovaTurma").addEventListener("click", () => abrirModalTurma());
  document.getElementById("btnNovoCurso").addEventListener("click", () => abrirModalCurso());

  document.getElementById("btnSalvarUsuario").addEventListener("click", salvarUsuario);
  document.getElementById("btnSalvarTurma").addEventListener("click", salvarTurma);
  document.getElementById("btnSalvarCurso").addEventListener("click", salvarCurso);
}

function abrirModal(id) { document.getElementById(id).classList.add("ativo"); }
function fecharModal(id) { document.getElementById(id).classList.remove("ativo"); }

/* =================================== ATUALIZAÇÃO GERAL ================================= */
function atualizarTudo() {
  carregarDashboard();
  carregarUsuarios();
  carregarAlunosAdm();
  carregarProfessoresAdm();
  carregarAdminsAdm();
  carregarTurmasAdm();
  carregarCursosAdm();
  carregarRelatorios();
}
