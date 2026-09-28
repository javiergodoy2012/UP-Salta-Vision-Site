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
  let db;
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

  async function authorized(user) {
    const snap = await db.collection('infraestructuraUsuarios').doc(user.uid).get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    const account = String(user.email || '').trim().toLowerCase();
    const listed = String(data.email || '').trim().toLowerCase();
    return data.activo === true &&
      (!data.rol || data.rol === 'infraestructura') &&
      (!listed || listed === account);
  }

  async function evaluate(user) {
    currentUser = user || null;
    locked();

    if (!user) {
      message('Acceso exclusivo para personal habilitado de Infraestructura.');
      login.hidden = false;
      retry.hidden = true;
      return;
    }

    login.hidden = true;
    retry.hidden = true;
    message('Validando autorización…');

    try {
      if (await authorized(user)) {
        message('Acceso autorizado.', 'ok');
        open(user);
      } else {
        message((user.email || 'Esta cuenta') + ' no está habilitada para esta herramienta.', 'denied');
        login.textContent = 'Usar otra cuenta';
        login.hidden = false;
      }
    } catch (error) {
      console.error('[Infraestructura] acceso', error);
      message('No se pudo validar la autorización.', 'denied');
      retry.hidden = false;
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
  db = firebase.app().firestore();

  login.addEventListener('click', signIn);
  retry.addEventListener('click', () => evaluate(currentUser));
  logout.addEventListener('click', async () => {
    await auth.signOut();
    window.location.reload();
  });

  auth.onAuthStateChanged(evaluate);
})();