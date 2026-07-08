/* ==========================================================================
   aluno.js
   Lógica da área do aluno: proteção de rota, navegação entre seções,
   carregamento de notas/frequência/disciplinas/horários e edição de perfil.
   ========================================================================== */

let sessaoAluno = null;
let alunoAtual = null;

document.addEventListener("DOMContentLoaded", () => {
  sessaoAluno = sessaoProteger("aluno");
  if (!sessaoAluno) return;

  alunoAtual = usuarioBuscarPorId(sessaoAluno.id);
  if (!alunoAtual) { sessaoEncerrar(); window.location.href = "index.html"; return; }

  configurarSidebar();
  configurarNavbarUsuario();
  configurarLogout();
  configurarNavegacaoSecoes();
  configurarFormularioPerfil();

  carregarInicio();
  carregarPerfil();
  carregarNotas();
  carregarFrequencia();
  carregarDisciplinas();
  carregarHorarios();
  carregarMensagens();
});

/* ------------------------------ Sidebar / navbar --------------------------- */
function configurarSidebar() {
  const sidebar = document.getElementById("sidebar");
  const conteudo = document.getElementById("conteudo");
  document.getElementById("btnRecolherSidebar").addEventListener("click", () => {
    sidebar.classList.toggle("recolhida");
    conteudo.classList.toggle("expandido");
  });
  document.getElementById("btnMenuMobile").addEventListener("click", () => {
    sidebar.classList.toggle("mobile-aberta");
  });
}

function configurarNavbarUsuario() {
  const inicial = alunoAtual.nome.charAt(0).toUpperCase();
  document.getElementById("avatarNavbar").textContent = inicial;
  document.getElementById("nomeNavbar").textContent = alunoAtual.nome;
  document.getElementById("saudacaoNome").textContent = alunoAtual.nome.split(" ")[0];
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
    inicio: "Início", perfil: "Meu Perfil", notas: "Minhas Notas",
    frequencia: "Minha Frequência", disciplinas: "Disciplinas",
    horarios: "Horários", mensagens: "Mensagens", configuracoes: "Configurações"
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

/* --------------------------------- Início ----------------------------------- */
function carregarInicio() {
  const turma = turmaListar().find(t => t.id === alunoAtual.turmaId);
  const curso = cursoListar().find(c => c.id === alunoAtual.cursoId);
  const notas = notaListarPorAluno(alunoAtual.id);
  const percentualFreq = frequenciaCalcularPercentual(alunoAtual.id);

  document.getElementById("cardCurso").textContent = curso ? curso.nome : "-";
  document.getElementById("cardTurma").textContent = turma ? turma.nome : "-";
  document.getElementById("cardFrequencia").textContent = `${percentualFreq}%`;

  const disciplinasUnicas = [...new Set(notas.map(n => n.disciplina))];
  document.getElementById("cardQtdDisciplinas").textContent = disciplinasUnicas.length;

  const media = notas.length
    ? (notas.reduce((soma, n) => soma + Number(n.valor), 0) / notas.length).toFixed(1)
    : "-";
  document.getElementById("cardMedia").textContent = media;

  // Próximas aulas (mock fixo baseado na grade de horários).
  const proximas = [
    { horario: "08:00", disciplina: "Matemática", sala: "Sala 12" },
    { horario: "09:40", disciplina: "Física", sala: "Sala 12" },
    { horario: "13:30", disciplina: "Química", sala: "Laboratório 2" }
  ];
  const container = document.getElementById("listaProximasAulas");
  container.innerHTML = proximas.map(a => `
    <div class="aula-item">
      <div class="aula-item__horario">${a.horario}</div>
      <div class="aula-item__info">
        <strong>${a.disciplina}</strong><br>
        <span>${a.sala}</span>
      </div>
    </div>
  `).join("");

  renderizarTabelaNotas("tabelaNotasInicio", notas);
}

/* ---------------------------------- Perfil ----------------------------------- */
function carregarPerfil() {
  document.getElementById("avatarPerfilGrande").textContent = alunoAtual.nome.charAt(0).toUpperCase();
  document.getElementById("perfilNomeCompleto").textContent = alunoAtual.nome;
  document.getElementById("perfilEmailTexto").textContent = alunoAtual.email;
  document.getElementById("perfilTelefone").value = alunoAtual.telefone || "";
  document.getElementById("perfilCelular").value = alunoAtual.celular || "";
  document.getElementById("perfilEndereco").value = alunoAtual.endereco || "";
}

function configurarFormularioPerfil() {
  document.getElementById("perfilTelefone").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));
  document.getElementById("perfilCelular").addEventListener("input", e => e.target.value = mascararTelefone(e.target.value));

  document.getElementById("formPerfilAluno").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const novaSenha = document.getElementById("perfilSenha").value;

    const dadosAtualizados = {
      telefone: document.getElementById("perfilTelefone").value.trim(),
      celular: document.getElementById("perfilCelular").value.trim(),
      endereco: document.getElementById("perfilEndereco").value.trim()
    };
    if (novaSenha) {
      if (!validarSenha(novaSenha)) {
        uiToast("erro", "Senha inválida", "Use 6+ caracteres, com letra e número.");
        return;
      }
      dadosAtualizados.senha = novaSenha;
    }

    uiLoading(true);
    setTimeout(() => {
      alunoAtual = usuarioEditar(alunoAtual.id, dadosAtualizados);
      uiLoading(false);
      document.getElementById("perfilSenha").value = "";
      uiToast("sucesso", "Perfil atualizado com sucesso!");
    }, 400);
  });
}

/* ----------------------------------- Notas ------------------------------------ */
function carregarNotas() {
  const notas = notaListarPorAluno(alunoAtual.id);
  renderizarTabelaNotas("tabelaNotasCompleta", notas);
}

function renderizarTabelaNotas(idTabela, notas) {
  const tbody = document.getElementById(idTabela);
  if (notas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="estado-vazio"><i class="fa-solid fa-star"></i><p>Nenhuma nota lançada ainda.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = notas.map(n => `
    <tr>
      <td>${n.disciplina}</td>
      <td>${n.bimestre}º Bimestre</td>
      <td>${Number(n.valor).toFixed(1)}</td>
      <td><span class="badge ${n.valor >= 6 ? 'presente' : 'falta'}">${n.valor >= 6 ? 'Aprovado' : 'Recuperação'}</span></td>
    </tr>
  `).join("");
}

/* --------------------------------- Frequência ---------------------------------- */
function carregarFrequencia() {
  const registros = frequenciaListarPorAluno(alunoAtual.id);
  const percentual = frequenciaCalcularPercentual(alunoAtual.id);

  document.getElementById("frequenciaPercentualGrande").textContent = `${percentual}%`;
  document.getElementById("barraFrequencia").style.width = `${percentual}%`;

  const tbody = document.getElementById("tabelaFrequencia");
  if (registros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="estado-vazio"><i class="fa-solid fa-calendar-check"></i><p>Nenhum registro de frequência.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = registros.map(r => `
    <tr>
      <td>${formatarData(r.data)}</td>
      <td>${r.disciplina}</td>
      <td><span class="badge ${r.presente ? 'presente' : 'falta'}">${r.presente ? 'Presente' : 'Falta'}</span></td>
    </tr>
  `).join("");
}

/* -------------------------------- Disciplinas ----------------------------------- */
function carregarDisciplinas() {
  const notas = notaListarPorAluno(alunoAtual.id);
  const disciplinas = [...new Set(notas.map(n => n.disciplina))];
  const container = document.getElementById("listaDisciplinas");

  if (disciplinas.length === 0) {
    container.innerHTML = `<div class="estado-vazio"><i class="fa-solid fa-book"></i><p>Nenhuma disciplina vinculada ainda.</p></div>`;
    return;
  }
  container.innerHTML = disciplinas.map(d => `<span class="disciplina-tag"><i class="fa-solid fa-book"></i> ${d}</span>`).join("");
}

/* --------------------------------- Horários -------------------------------------- */
function carregarHorarios() {
  const grade = [
    { dia: "Segunda-feira", h1: "Matemática", h2: "Física", h3: "Química" },
    { dia: "Terça-feira", h1: "Português", h2: "História", h3: "Geografia" },
    { dia: "Quarta-feira", h1: "Matemática", h2: "Biologia", h3: "Inglês" },
    { dia: "Quinta-feira", h1: "Física", h2: "Química", h3: "Educação Física" },
    { dia: "Sexta-feira", h1: "Português", h2: "Artes", h3: "Redação" }
  ];
  document.getElementById("tabelaHorarios").innerHTML = grade.map(g => `
    <tr><td>${g.dia}</td><td>${g.h1}</td><td>${g.h2}</td><td>${g.h3}</td></tr>
  `).join("");
}

/* --------------------------------- Mensagens -------------------------------------- */
function carregarMensagens() {
  const avisos = avisoListar();
  const container = document.getElementById("listaAvisosAluno");
  if (avisos.length === 0) {
    container.innerHTML = `<div class="estado-vazio"><i class="fa-solid fa-envelope"></i><p>Nenhum aviso no momento.</p></div>`;
    return;
  }
  container.innerHTML = avisos.map(a => `
    <div class="aula-item">
      <div class="aula-item__info" style="flex:1;">
        <strong>${a.titulo}</strong><br>
        <span>${a.mensagem}</span><br>
        <span style="font-size:0.72rem;">${formatarDataHora(a.data)}</span>
      </div>
    </div>
  `).join("");
}

/* ---------------------------------- Utilidades ------------------------------------- */
function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}
function formatarDataHora(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString("pt-BR") + " às " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
