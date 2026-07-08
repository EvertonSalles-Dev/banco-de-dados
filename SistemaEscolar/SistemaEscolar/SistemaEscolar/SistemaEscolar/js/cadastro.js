/* ==========================================================================
   cadastro.js
   Lógica da tela de cadastro: máscaras, validações de todos os campos e
   gravação do novo usuário no LocalStorage.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastro");
  const alertaCadastro = document.getElementById("alertaCadastro");

  const campos = {
    nome: document.getElementById("nome"),
    cpf: document.getElementById("cpf"),
    rg: document.getElementById("rg"),
    nascimento: document.getElementById("nascimento"),
    sexo: document.getElementById("sexo"),
    telefone: document.getElementById("telefone"),
    celular: document.getElementById("celular"),
    email: document.getElementById("email"),
    senha: document.getElementById("senha"),
    confirmarSenha: document.getElementById("confirmarSenha"),
    endereco: document.getElementById("endereco"),
    numero: document.getElementById("numero"),
    bairro: document.getElementById("bairro"),
    cidade: document.getElementById("cidade"),
    estado: document.getElementById("estado"),
    cep: document.getElementById("cep")
  };

  /* ------------------------------- Máscaras ------------------------------- */
  campos.cpf.addEventListener("input", (e) => { e.target.value = mascararCPF(e.target.value); });
  campos.rg.addEventListener("input", (e) => { e.target.value = mascararRG(e.target.value); });
  campos.telefone.addEventListener("input", (e) => { e.target.value = mascararTelefone(e.target.value); });
  campos.celular.addEventListener("input", (e) => { e.target.value = mascararTelefone(e.target.value); });
  campos.cep.addEventListener("input", (e) => { e.target.value = mascararCEP(e.target.value); });

  /* --------------------------- Mostrar/ocultar senha ------------------------ */
  document.querySelectorAll(".alternar-senha").forEach(btn => {
    btn.addEventListener("click", () => {
      const alvo = document.getElementById(btn.dataset.alvo);
      const exibindo = alvo.type === "text";
      alvo.type = exibindo ? "password" : "text";
      btn.innerHTML = exibindo ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
    });
  });

  /* --------------------------------- Envio ---------------------------------- */
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    esconderAlerta();
    limparErros();

    const tipoSelecionado = document.querySelector('input[name="tipo"]:checked').value;
    const dados = {
      nome: campos.nome.value.trim(),
      cpf: campos.cpf.value.trim(),
      rg: campos.rg.value.trim(),
      nascimento: campos.nascimento.value,
      sexo: campos.sexo.value,
      telefone: campos.telefone.value.trim(),
      celular: campos.celular.value.trim(),
      email: campos.email.value.trim(),
      senha: campos.senha.value,
      endereco: campos.endereco.value.trim(),
      numero: campos.numero.value.trim(),
      bairro: campos.bairro.value.trim(),
      cidade: campos.cidade.value.trim(),
      estado: campos.estado.value,
      cep: campos.cep.value.trim(),
      tipo: tipoSelecionado
    };

    if (!validarFormulario(dados)) return;

    uiLoading(true);
    setTimeout(() => {
      try {
        usuarioAdicionar(dados);
        uiLoading(false);
        uiToast("sucesso", "Cadastro realizado!", "Agora você já pode fazer login.");
        setTimeout(() => { window.location.href = "index.html"; }, 1200);
      } catch (erro) {
        uiLoading(false);
        mostrarAlerta(erro.message);
      }
    }, 500);
  });

  /* ------------------------------- Validação -------------------------------- */
  function validarFormulario(dados) {
    let valido = true;

    if (!validarCampoObrigatorio(dados.nome) || dados.nome.length < 3) {
      marcarErro("nome", "Informe o nome completo.");
      valido = false;
    }
    if (!validarCPF(dados.cpf)) {
      marcarErro("cpf", "CPF inválido.");
      valido = false;
    }
    if (!validarCampoObrigatorio(dados.rg)) {
      marcarErro("rg", "Informe o RG.");
      valido = false;
    }
    if (!validarCampoObrigatorio(dados.nascimento)) {
      marcarErro("nascimento", "Informe a data de nascimento.");
      valido = false;
    }
    if (!validarCampoObrigatorio(dados.sexo)) {
      marcarErro("sexo", "Selecione o sexo.");
      valido = false;
    }
    if (!validarCampoObrigatorio(dados.celular)) {
      marcarErro("celular", "Informe o celular.");
      valido = false;
    }
    if (!validarEmail(dados.email)) {
      marcarErro("email", "Informe um e-mail válido.");
      valido = false;
    }
    if (!validarSenha(dados.senha)) {
      marcarErro("senha", "A senha deve ter 6+ caracteres, com letra e número.");
      valido = false;
    }
    if (dados.senha !== campos.confirmarSenha.value) {
      marcarErro("confirmarSenha", "As senhas não coincidem.");
      valido = false;
    }
    if (!validarCampoObrigatorio(dados.endereco) || !validarCampoObrigatorio(dados.numero) ||
        !validarCampoObrigatorio(dados.bairro) || !validarCampoObrigatorio(dados.cidade) ||
        !validarCampoObrigatorio(dados.estado) || !validarCampoObrigatorio(dados.cep)) {
      mostrarAlerta("Preencha todos os campos obrigatórios de endereço.");
      valido = false;
    }

    if (!valido && !alertaCadastro.textContent) {
      mostrarAlerta("Corrija os campos destacados em vermelho.");
    }
    return valido;
  }

  function marcarErro(idCampo, mensagem) {
    const campo = campos[idCampo];
    campo.classList.add("campo-erro");
    const span = document.getElementById(`erro-${idCampo}`);
    if (span) span.textContent = mensagem;
  }

  function limparErros() {
    Object.values(campos).forEach(c => c.classList && c.classList.remove("campo-erro"));
    document.querySelectorAll(".mensagem-erro").forEach(s => s.textContent = "");
  }

  function mostrarAlerta(mensagem) {
    alertaCadastro.textContent = mensagem;
    alertaCadastro.style.display = "flex";
  }
  function esconderAlerta() {
    alertaCadastro.style.display = "none";
    alertaCadastro.textContent = "";
  }
});
