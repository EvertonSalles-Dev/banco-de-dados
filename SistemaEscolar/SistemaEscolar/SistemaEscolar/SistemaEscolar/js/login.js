/* ==========================================================================
   login.js
   Lógica da tela de login: validação de campos, autenticação, "lembrar
   usuário", mostrar/ocultar senha e redirecionamento por tipo de perfil.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Se já existe uma sessão ativa, redireciona direto para a área correspondente.
  const sessaoAtual = sessaoObter();
  if (sessaoAtual) {
    redirecionarPorTipo(sessaoAtual.tipo);
    return;
  }

  const form = document.getElementById("formLogin");
  const campoEmail = document.getElementById("email");
  const campoSenha = document.getElementById("senha");
  const btnAlternarSenha = document.getElementById("btnAlternarSenha");
  const checkboxLembrar = document.getElementById("lembrarUsuario");
  const alertaLogin = document.getElementById("alertaLogin");
  const alertaLoginTexto = document.getElementById("alertaLoginTexto");
  const loginCard = document.querySelector(".login-card");

  /* --------------------- Lembrar usuário (preenche e-mail) -------------------- */
  const emailLembrado = localStorage.getItem("se_email_lembrado");
  if (emailLembrado) {
    campoEmail.value = emailLembrado;
    checkboxLembrar.checked = true;
  }

  /* --------------------------- Mostrar/ocultar senha --------------------------- */
  btnAlternarSenha.addEventListener("click", () => {
    const exibindo = campoSenha.type === "text";
    campoSenha.type = exibindo ? "password" : "text";
    btnAlternarSenha.innerHTML = exibindo
      ? '<i class="fa-regular fa-eye"></i>'
      : '<i class="fa-regular fa-eye-slash"></i>';
    btnAlternarSenha.setAttribute("aria-label", exibindo ? "Mostrar senha" : "Ocultar senha");
  });

  /* -------------------------------- Envio do login ------------------------------ */
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    esconderAlertaLogin();
    limparErros();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;
    let valido = true;

    if (!validarCampoObrigatorio(email) || !validarEmail(email)) {
      marcarErro(campoEmail, "erroEmail", "Informe um e-mail válido.");
      valido = false;
    }
    if (!validarCampoObrigatorio(senha)) {
      marcarErro(campoSenha, "erroSenha", "Informe sua senha.");
      valido = false;
    }
    if (!valido) return;

    uiLoading(true);

    // Pequeno atraso simulando requisição, para dar feedback visual do loading.
    setTimeout(() => {
      const usuario = usuarioBuscarPorEmail(email);

      if (!usuario || usuario.senha !== senha) {
        uiLoading(false);
        mostrarAlertaLogin("Usuário ou senha inválidos.");
        loginCard.classList.add("shake");
        setTimeout(() => loginCard.classList.remove("shake"), 400);
        return;
      }

      // "Lembrar usuário": guarda apenas o e-mail, nunca a senha.
      if (checkboxLembrar.checked) {
        localStorage.setItem("se_email_lembrado", email);
      } else {
        localStorage.removeItem("se_email_lembrado");
      }

      sessaoCriar(usuario);
      uiToast("sucesso", `Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`, "Redirecionando...");

      setTimeout(() => {
        uiLoading(false);
        redirecionarPorTipo(usuario.tipo);
      }, 700);
    }, 500);
  });

  document.getElementById("linkEsqueciSenha").addEventListener("click", (e) => {
    e.preventDefault();
    uiToast("alerta", "Recuperação de senha", "Entre em contato com a secretaria da escola.");
  });

  /* --------------------------------- Auxiliares --------------------------------- */
  function redirecionarPorTipo(tipo) {
    const rotas = {
      aluno: "aluno.html",
      professor: "professor.html",
      administrador: "administrador.html"
    };
    window.location.href = rotas[tipo] || "index.html";
  }

  function mostrarAlertaLogin(mensagem) {
    alertaLoginTexto.textContent = mensagem;
    alertaLogin.style.display = "flex";
  }
  function esconderAlertaLogin() {
    alertaLogin.style.display = "none";
  }

  function marcarErro(campo, idSpanErro, mensagem) {
    campo.classList.add("campo-erro");
    const span = document.getElementById(idSpanErro);
    if (span) span.textContent = mensagem;
  }

  function limparErros() {
    [campoEmail, campoSenha].forEach(c => c.classList.remove("campo-erro"));
    ["erroEmail", "erroSenha"].forEach(id => {
      const span = document.getElementById(id);
      if (span) span.textContent = "";
    });
  }
});
