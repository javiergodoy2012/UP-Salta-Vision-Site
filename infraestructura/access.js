(() => {
  'use strict';

  const gate = document.getElementById('accessGate');
  const appShell = document.getElementById('infraApp');
  const status = document.getElementById('accessGateStatus');
  const login = document.getElementById('accessLogin');
  const retry = document.getElementById('accessRetry');
  const userBox = document.getElementById('infraUser');
  const userEmail = document.getElementById('infraUserEmail');
  const logout = document.getElementById('infraLogout');

  let auth;
  let currentUser = null;
  let started = false;

  function message(text, kind='') {
    status.textContent = text;
    status.className = 'access-status' + (kind ? ' ' + kind : '');
  }

  function locked() {
    gate.hidden = false;
    appShell.hidden = true;
    userBox.hidden = true;
  }

  function open(user) {
    gate.hidden = true;
    appShell.hidden = false;
    userBox.hidden = false;
    userEmail.textContent = user.email || 'Usuario habilitado';

    if (!started && typeof window.startInfraApp === 'function') {
      started = true;
      window.startInfraApp();
    }
  }

  async function api(user, part) {
    const token = await user.getIdToken();
    const response = await fetch('/infra-api?part=' + encodeURIComponent(part), {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      },
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (response.status === 401 || response.status === 403) {
      const error = new Error('NOT_AUTHORIZED');
      error.code = 'NOT_AUTHORIZED';
      throw error;
    }

    if (!response.ok) {
      throw new Error('API_' + response.status);
    }

    return response.json();
  }

  async function loadProtectedData(user) {
    const [profile, network, cruces, interferencias] = await Promise.all([
      api(user, 'profile'),
      api(user, 'network'),
      api(user, 'cruces'),
      api(user, 'interferencias')
    ]);

    window.INFRA_NETWORK = network;
    window.CRUCES_HABILITADOS = Object.freeze(cruces);
    window.INTERFERENCIAS_UP_SALTA = Object.freeze(interferencias);

    return profile;
  }

  async function evaluate(user) {
    currentUser = user || null;
    locked();

    if (!user) {
      message('Acceso exclusivo para personal habilitado de Infraestructura.');
      login.hidden = false;
      retry.hidden = true;
      login.textContent = 'Ingresar con Google';
      return;
    }

    login.hidden = true;
    retry.hidden = true;
    message('Validando autorización y cargando datos…');

    try {
      const profile = await loadProtectedData(user);
      message('Acceso autorizado.', 'ok');
      if (profile && profile.nombre) {
        userEmail.textContent = profile.nombre + ' · ' + (user.email || '');
      }
      open(user);
    } catch (error) {
      console.error('[Infraestructura] acceso', error);

      if (error && error.code === 'NOT_AUTHORIZED') {
        message((user.email || 'Esta cuenta') + ' no está habilitada para esta herramienta.', 'denied');
        login.textContent = 'Usar otra cuenta';
        login.hidden = false;
      } else {
        message('No se pudo validar el acceso o cargar los datos.', 'denied');
        retry.hidden = false;
      }
    }
  }

  async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});

    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      if (error && error.code === 'auth/popup-blocked') {
        await auth.signInWithRedirect(provider);
      } else {
        message('No se pudo iniciar sesión.', 'denied');
      }
    }
  }

  locked();

  if (!window.firebase || !firebase.apps.length) {
    message('No se pudo iniciar el servicio de acceso.', 'denied');
    return;
  }

  auth = firebase.app().auth();

  login.addEventListener('click', signIn);
  retry.addEventListener('click', () => evaluate(currentUser));
  logout.addEventListener('click', async () => {
    await auth.signOut();
    window.location.reload();
  });

  auth.onAuthStateChanged(evaluate);
})();