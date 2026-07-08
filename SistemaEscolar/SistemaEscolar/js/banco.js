/* ==========================================================================
   banco.js
   Camada de dados do sistema. Simula um banco de dados relacional usando
   o LocalStorage do navegador. Concentra: CRUD de usuários, turmas, cursos,
   notas, frequência, avisos; controle de sessão; validações; máscaras;
   backup/restauração/importação/exportação.
   ========================================================================== */

/* ------------------------------ Chaves ---------------------------------- */
const DB_KEYS = {
  USUARIOS: "se_usuarios",
  TURMAS: "se_turmas",
  CURSOS: "se_cursos",
  NOTAS: "se_notas",
  FREQUENCIA: "se_frequencia",
  AVISOS: "se_avisos",
  SESSAO: "se_sessao",
  SEQ: "se_seq" // controlador de IDs sequenciais por entidade
};

/* ------------------------- Utilidades genéricas -------------------------- */

/** Lê uma coleção do LocalStorage (retorna array vazio se não existir). */
function dbCarregar(chave) {
  try {
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error(`Erro ao carregar "${chave}":`, erro);
    return [];
  }
}

/** Salva (sobrescreve) uma coleção inteira no LocalStorage. */
function dbSalvar(chave, colecao) {
  try {
    localStorage.setItem(chave, JSON.stringify(colecao));
    return true;
  } catch (erro) {
    console.error(`Erro ao salvar "${chave}":`, erro);
    return false;
  }
}

/** Gera o próximo ID sequencial para uma entidade (ex: "usuarios"). */
function dbProximoId(entidade) {
  const seq = dbCarregar(DB_KEYS.SEQ);
  const atual = seq.find(s => s.entidade === entidade);
  let novoId;
  if (atual) {
    atual.valor += 1;
    novoId = atual.valor;
  } else {
    seq.push({ entidade, valor: 1 });
    novoId = 1;
  }
  dbSalvar(DB_KEYS.SEQ, seq);
  return novoId;
}

/** Inicializa o banco com dados de exemplo na primeira execução. */
function dbInicializar() {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  if (usuarios.length > 0) return; // já inicializado

  const cursos = [
    { id: dbProximoId("cursos"), nome: "Ensino Médio", cargaHoraria: 2400 },
    { id: dbProximoId("cursos"), nome: "Técnico em Informática", cargaHoraria: 1600 }
  ];
  dbSalvar(DB_KEYS.CURSOS, cursos);

  const turmas = [
    { id: dbProximoId("turmas"), nome: "3º Ano A", cursoId: cursos[0].id, turno: "Manhã" },
    { id: dbProximoId("turmas"), nome: "2º Info B", cursoId: cursos[1].id, turno: "Noite" }
  ];
  dbSalvar(DB_KEYS.TURMAS, turmas);

  const admin = {
    id: dbProximoId("usuarios"),
    nome: "Administrador Geral",
    cpf: "000.000.000-00",
    rg: "00.000.000-0",
    nascimento: "1990-01-01",
    sexo: "Outro",
    telefone: "(21) 3333-0000",
    celular: "(21) 99999-0000",
    email: "admin@escola.com",
    senha: "admin123",
    endereco: "Rua Principal",
    numero: "100",
    bairro: "Centro",
    cidade: "Niterói",
    estado: "RJ",
    cep: "24000-000",
    tipo: "administrador",
    foto: "",
    dataCadastro: new Date().toISOString()
  };

  const professor = {
    id: dbProximoId("usuarios"),
    nome: "Carlos Mendes",
    cpf: "111.111.111-11",
    rg: "11.111.111-1",
    nascimento: "1985-05-10",
    sexo: "Masculino",
    telefone: "(21) 3333-1111",
    celular: "(21) 99999-1111",
    email: "professor@escola.com",
    senha: "prof123",
    endereco: "Rua das Flores",
    numero: "50",
    bairro: "Icaraí",
    cidade: "Niterói",
    estado: "RJ",
    cep: "24020-000",
    tipo: "professor",
    foto: "",
    disciplinas: ["Matemática", "Física"],
    dataCadastro: new Date().toISOString()
  };

  const aluno = {
    id: dbProximoId("usuarios"),
    nome: "Ana Souza",
    cpf: "222.222.222-22",
    rg: "22.222.222-2",
    nascimento: "2007-08-20",
    sexo: "Feminino",
    telefone: "(21) 3333-2222",
    celular: "(21) 99999-2222",
    email: "aluno@escola.com",
    senha: "aluno123",
    endereco: "Rua da Praia",
    numero: "20",
    bairro: "Piratininga",
    cidade: "Niterói",
    estado: "RJ",
    cep: "24350-000",
    tipo: "aluno",
    foto: "",
    turmaId: turmas[0].id,
    cursoId: cursos[0].id,
    dataCadastro: new Date().toISOString()
  };

  dbSalvar(DB_KEYS.USUARIOS, [admin, professor, aluno]);

  const notas = [
    { id: dbProximoId("notas"), alunoId: aluno.id, disciplina: "Matemática", bimestre: 1, valor: 8.5, professorId: professor.id },
    { id: dbProximoId("notas"), alunoId: aluno.id, disciplina: "Física", bimestre: 1, valor: 7.0, professorId: professor.id }
  ];
  dbSalvar(DB_KEYS.NOTAS, notas);

  const frequencia = [
    { id: dbProximoId("frequencia"), alunoId: aluno.id, disciplina: "Matemática", data: new Date().toISOString().slice(0, 10), presente: true },
    { id: dbProximoId("frequencia"), alunoId: aluno.id, disciplina: "Física", data: new Date().toISOString().slice(0, 10), presente: true }
  ];
  dbSalvar(DB_KEYS.FREQUENCIA, frequencia);

  dbSalvar(DB_KEYS.AVISOS, []);
}

/* ===========================================================================
   CRUD DE USUÁRIOS
   =========================================================================== */

/** Adiciona um novo usuário. Retorna o objeto criado ou lança erro de e-mail duplicado. */
function usuarioAdicionar(dados) {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  const existe = usuarios.some(u => u.email.toLowerCase() === dados.email.toLowerCase());
  if (existe) {
    throw new Error("Já existe um usuário cadastrado com este e-mail.");
  }
  const novo = {
    id: dbProximoId("usuarios"),
    dataCadastro: new Date().toISOString(),
    foto: "",
    ...dados
  };
  usuarios.push(novo);
  dbSalvar(DB_KEYS.USUARIOS, usuarios);
  return novo;
}

/** Edita um usuário existente por ID, mesclando os campos informados. */
function usuarioEditar(id, novosDados) {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  const indice = usuarios.findIndex(u => u.id === Number(id));
  if (indice === -1) throw new Error("Usuário não encontrado.");
  usuarios[indice] = { ...usuarios[indice], ...novosDados };
  dbSalvar(DB_KEYS.USUARIOS, usuarios);
  return usuarios[indice];
}

/** Exclui um usuário por ID. */
function usuarioExcluir(id) {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  const filtrados = usuarios.filter(u => u.id !== Number(id));
  dbSalvar(DB_KEYS.USUARIOS, filtrados);
  return filtrados;
}

/** Busca usuário por ID. */
function usuarioBuscarPorId(id) {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  return usuarios.find(u => u.id === Number(id)) || null;
}

/** Busca usuário por e-mail (login). */
function usuarioBuscarPorEmail(email) {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  return usuarios.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

/** Pesquisa usuários por termo (nome, email ou cpf) e/ou tipo. */
function usuarioPesquisar(termo = "", tipo = "todos") {
  const usuarios = dbCarregar(DB_KEYS.USUARIOS);
  const termoBusca = termo.trim().toLowerCase();
  return usuarios.filter(u => {
    const combinaTipo = tipo === "todos" || u.tipo === tipo;
    const combinaTermo =
      !termoBusca ||
      u.nome.toLowerCase().includes(termoBusca) ||
      u.email.toLowerCase().includes(termoBusca) ||
      (u.cpf || "").includes(termoBusca);
    return combinaTipo && combinaTermo;
  });
}

/* ===========================================================================
   CRUD DE TURMAS E CURSOS
   =========================================================================== */

function turmaListar() { return dbCarregar(DB_KEYS.TURMAS); }
function turmaAdicionar(dados) {
  const turmas = turmaListar();
  const nova = { id: dbProximoId("turmas"), ...dados };
  turmas.push(nova);
  dbSalvar(DB_KEYS.TURMAS, turmas);
  return nova;
}
function turmaEditar(id, dados) {
  const turmas = turmaListar();
  const i = turmas.findIndex(t => t.id === Number(id));
  if (i === -1) throw new Error("Turma não encontrada.");
  turmas[i] = { ...turmas[i], ...dados };
  dbSalvar(DB_KEYS.TURMAS, turmas);
  return turmas[i];
}
function turmaExcluir(id) {
  const turmas = turmaListar().filter(t => t.id !== Number(id));
  dbSalvar(DB_KEYS.TURMAS, turmas);
  return turmas;
}

function cursoListar() { return dbCarregar(DB_KEYS.CURSOS); }
function cursoAdicionar(dados) {
  const cursos = cursoListar();
  const novo = { id: dbProximoId("cursos"), ...dados };
  cursos.push(novo);
  dbSalvar(DB_KEYS.CURSOS, cursos);
  return novo;
}
function cursoEditar(id, dados) {
  const cursos = cursoListar();
  const i = cursos.findIndex(c => c.id === Number(id));
  if (i === -1) throw new Error("Curso não encontrado.");
  cursos[i] = { ...cursos[i], ...dados };
  dbSalvar(DB_KEYS.CURSOS, cursos);
  return cursos[i];
}
function cursoExcluir(id) {
  const cursos = cursoListar().filter(c => c.id !== Number(id));
  dbSalvar(DB_KEYS.CURSOS, cursos);
  return cursos;
}

/* ===========================================================================
   CRUD DE NOTAS
   =========================================================================== */

function notaListarPorAluno(alunoId) {
  return dbCarregar(DB_KEYS.NOTAS).filter(n => n.alunoId === Number(alunoId));
}
function notaListarTodas() { return dbCarregar(DB_KEYS.NOTAS); }
function notaAdicionar(dados) {
  const notas = notaListarTodas();
  const nova = { id: dbProximoId("notas"), ...dados };
  notas.push(nova);
  dbSalvar(DB_KEYS.NOTAS, notas);
  return nova;
}
function notaEditar(id, dados) {
  const notas = notaListarTodas();
  const i = notas.findIndex(n => n.id === Number(id));
  if (i === -1) throw new Error("Nota não encontrada.");
  notas[i] = { ...notas[i], ...dados };
  dbSalvar(DB_KEYS.NOTAS, notas);
  return notas[i];
}
function notaExcluir(id) {
  const notas = notaListarTodas().filter(n => n.id !== Number(id));
  dbSalvar(DB_KEYS.NOTAS, notas);
  return notas;
}

/* ===========================================================================
   CRUD DE FREQUÊNCIA
   =========================================================================== */

function frequenciaListarPorAluno(alunoId) {
  return dbCarregar(DB_KEYS.FREQUENCIA).filter(f => f.alunoId === Number(alunoId));
}
function frequenciaListarTodas() { return dbCarregar(DB_KEYS.FREQUENCIA); }
function frequenciaAdicionar(dados) {
  const registros = frequenciaListarTodas();
  const novo = { id: dbProximoId("frequencia"), ...dados };
  registros.push(novo);
  dbSalvar(DB_KEYS.FREQUENCIA, registros);
  return novo;
}
function frequenciaExcluir(id) {
  const registros = frequenciaListarTodas().filter(f => f.id !== Number(id));
  dbSalvar(DB_KEYS.FREQUENCIA, registros);
  return registros;
}

/** Calcula o percentual de frequência de um aluno (0 a 100). */
function frequenciaCalcularPercentual(alunoId) {
  const registros = frequenciaListarPorAluno(alunoId);
  if (registros.length === 0) return 100;
  const presentes = registros.filter(r => r.presente).length;
  return Math.round((presentes / registros.length) * 100);
}

/* ===========================================================================
   AVISOS / MENSAGENS
   =========================================================================== */

function avisoListar() { return dbCarregar(DB_KEYS.AVISOS); }
function avisoAdicionar(dados) {
  const avisos = avisoListar();
  const novo = { id: dbProximoId("avisos"), data: new Date().toISOString(), ...dados };
  avisos.unshift(novo);
  dbSalvar(DB_KEYS.AVISOS, avisos);
  return novo;
}
function avisoExcluir(id) {
  const avisos = avisoListar().filter(a => a.id !== Number(id));
  dbSalvar(DB_KEYS.AVISOS, avisos);
  return avisos;
}

/* ===========================================================================
   CONTROLE DE SESSÃO
   =========================================================================== */

/** Cria a sessão do usuário logado. */
function sessaoCriar(usuario) {
  const dadosSessao = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    login: new Date().toISOString()
  };
  localStorage.setItem(DB_KEYS.SESSAO, JSON.stringify(dadosSessao));
}

/** Retorna os dados da sessão ativa (ou null). */
function sessaoObter() {
  try {
    const dados = localStorage.getItem(DB_KEYS.SESSAO);
    return dados ? JSON.parse(dados) : null;
  } catch {
    return null;
  }
}

/** Encerra a sessão atual. */
function sessaoEncerrar() {
  localStorage.removeItem(DB_KEYS.SESSAO);
}

/**
 * Protege uma página exigindo um tipo de usuário específico.
 * Se não houver sessão -> volta para o login.
 * Se o tipo da sessão não bater -> bloqueia e volta para o login.
 */
function sessaoProteger(tipoEsperado) {
  const sessao = sessaoObter();
  if (!sessao) {
    window.location.href = "index.html";
    return null;
  }
  if (sessao.tipo !== tipoEsperado) {
    alert("Acesso não autorizado para o seu perfil de usuário.");
    window.location.href = "index.html";
    return null;
  }
  return sessao;
}

/* ===========================================================================
   VALIDAÇÕES
   =========================================================================== */

/** Valida CPF utilizando o algoritmo oficial dos dígitos verificadores. */
function validarCPF(cpf) {
  const limpo = String(cpf).replace(/\D/g, "");
  if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(limpo[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(limpo[10])) return false;

  return true;
}

/** Valida formato de e-mail. */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).trim());
}

/** Valida senha: mínimo 6 caracteres, com letra e número. */
function validarSenha(senha) {
  return String(senha).length >= 6 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

/** Valida se um campo obrigatório foi preenchido. */
function validarCampoObrigatorio(valor) {
  return valor !== undefined && valor !== null && String(valor).trim().length > 0;
}

/* ===========================================================================
   MÁSCARAS DE ENTRADA
   =========================================================================== */

/** Aplica máscara de CPF: 000.000.000-00 */
function mascararCPF(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Aplica máscara de telefone/celular: (00) 0000-0000 ou (00) 00000-0000 */
function mascararTelefone(valor) {
  const limpo = valor.replace(/\D/g, "").slice(0, 11);
  if (limpo.length <= 10) {
    return limpo
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return limpo
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/** Aplica máscara de CEP: 00000-000 */
function mascararCEP(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/** Aplica máscara de RG: 00.000.000-0 */
function mascararRG(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 9)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1})$/, "$1-$2");
}

/* ===========================================================================
   BACKUP / RESTAURAÇÃO / IMPORTAÇÃO / EXPORTAÇÃO
   =========================================================================== */

/** Gera um objeto único com todo o "banco de dados" atual. */
function dbExportarTudo() {
  return {
    usuarios: dbCarregar(DB_KEYS.USUARIOS),
    turmas: dbCarregar(DB_KEYS.TURMAS),
    cursos: dbCarregar(DB_KEYS.CURSOS),
    notas: dbCarregar(DB_KEYS.NOTAS),
    frequencia: dbCarregar(DB_KEYS.FREQUENCIA),
    avisos: dbCarregar(DB_KEYS.AVISOS),
    seq: dbCarregar(DB_KEYS.SEQ),
    exportadoEm: new Date().toISOString()
  };
}

/** Faz o download de um arquivo .json com todo o banco (backup completo). */
function dbFazerBackup() {
  const tudo = dbExportarTudo();
  const blob = new Blob([JSON.stringify(tudo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-si-escolar-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Restaura o banco a partir de um objeto de backup previamente exportado. */
function dbRestaurarBackup(objeto) {
  if (!objeto || typeof objeto !== "object") throw new Error("Arquivo de backup inválido.");
  dbSalvar(DB_KEYS.USUARIOS, objeto.usuarios || []);
  dbSalvar(DB_KEYS.TURMAS, objeto.turmas || []);
  dbSalvar(DB_KEYS.CURSOS, objeto.cursos || []);
  dbSalvar(DB_KEYS.NOTAS, objeto.notas || []);
  dbSalvar(DB_KEYS.FREQUENCIA, objeto.frequencia || []);
  dbSalvar(DB_KEYS.AVISOS, objeto.avisos || []);
  dbSalvar(DB_KEYS.SEQ, objeto.seq || []);
  return true;
}

/** Apaga completamente todos os dados do sistema (mantém a sessão fora). */
function dbLimparTudo() {
  Object.values(DB_KEYS).forEach(chave => {
    if (chave !== DB_KEYS.SESSAO) localStorage.removeItem(chave);
  });
}

/* ===========================================================================
   COMPONENTES DE INTERFACE COMPARTILHADOS (Toast / Loading / Modal confirmação)
   Estas funções são usadas por todas as páginas internas e pela tela de login.
   =========================================================================== */

/** Exibe uma notificação toast temporária no canto da tela. */
function uiToast(tipo, titulo, texto = "", duracaoMs = 3800) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icones = {
    sucesso: "fa-solid fa-circle-check",
    erro: "fa-solid fa-circle-exclamation",
    alerta: "fa-solid fa-triangle-exclamation"
  };

  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <i class="toast__icone ${icones[tipo] || icones.alerta}"></i>
    <div>
      <div class="toast__titulo">${titulo}</div>
      ${texto ? `<div class="toast__texto">${texto}</div>` : ""}
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, duracaoMs);
}

/** Mostra/oculta o overlay de carregamento global. */
function uiLoading(mostrar) {
  const el = document.getElementById("loadingGlobal");
  if (!el) return;
  el.classList.toggle("ativo", mostrar);
}

/**
 * Abre um modal de confirmação genérico (usado para exclusões).
 * Recebe um texto e uma função de callback executada apenas se o usuário confirmar.
 */
function uiConfirmar(mensagem, aoConfirmar) {
  let modalExistente = document.getElementById("modalConfirmacaoGlobal");
  if (modalExistente) modalExistente.remove();

  const modalHTML = `
    <div class="modal-fundo ativo" id="modalConfirmacaoGlobal">
      <div class="modal modal--confirmacao">
        <div class="modal__corpo">
          <div class="icone-alerta"><i class="fa-solid fa-trash"></i></div>
          <h3 style="margin-bottom:8px;">Confirmar ação</h3>
          <p style="color:var(--cor-texto-suave); font-size:0.9rem;">${mensagem}</p>
        </div>
        <div class="modal__rodape" style="justify-content:center;">
          <button class="btn btn-secundario" id="btnCancelarConfirmacao">Cancelar</button>
          <button class="btn btn-perigo" id="btnConfirmarAcao">Sim, confirmar</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("modalConfirmacaoGlobal");
  document.getElementById("btnCancelarConfirmacao").onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById("btnConfirmarAcao").onclick = () => {
    modal.remove();
    aoConfirmar();
  };
}

/* Inicializa o banco assim que o script é carregado em qualquer página. */
dbInicializar();
