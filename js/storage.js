// Local, browser-only data store for the ReAttempt demonstration.
(function initializeReAttemptStore() {
  const keys = {
    profile: "reattempt_profile",
    credentials: "reattempt_credentials",
    session: "reattempt_session",
    backlogs: "reattempt_backlogs",
    tasks: "reattempt_tasks",
    materials: "reattempt_materials",
    preferences: "reattempt_preferences"
  };

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.warn(`Could not read ReAttempt data "${key}".`, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save ReAttempt data "${key}".`, error);
      return false;
    }
  }

  function getArray(key) {
    const value = read(key, []);
    if (Array.isArray(value)) return value;
    console.warn(`ReAttempt data "${key}" was not a list. Using an empty list.`);
    return [];
  }

  function makeId(prefix) {
    const randomPart = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${randomPart}`;
  }

  function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function createSalt() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("Secure browser password hashing is unavailable. Use a modern browser through VS Code Live Server.");
    }
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    return bytesToHex(salt);
  }

  async function hashPassword(password, saltHex) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Secure browser password hashing is unavailable. Use a modern browser through VS Code Live Server.");
    }
    if (typeof saltHex !== "string" || !/^[a-f0-9]{32}$/i.test(saltHex)) {
      throw new Error("The saved demo credential is invalid. Clear the demo data and create an account again.");
    }
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((part) => parseInt(part, 16)));
    const keyMaterial = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, keyMaterial, 256);
    return bytesToHex(bits);
  }

  function getProfile() {
    const value = read(keys.profile, null);
    if (value === null) return null;
    if (value && typeof value === "object" && !Array.isArray(value)
      && typeof value.id === "string" && typeof value.email === "string" && typeof value.fullName === "string") return value;
    console.warn("ReAttempt profile data is invalid. The local demo account needs to be registered again.");
    return null;
  }

  function getSession() {
    const value = read(keys.session, null);
    if (value === null) return null;
    if (value && typeof value === "object" && !Array.isArray(value) && typeof value.profileId === "string") return value;
    console.warn("ReAttempt session data is invalid. The user must sign in again.");
    return null;
  }

  function getCurrentProfile() {
    const session = getSession();
    const profile = getProfile();
    return session && profile && session.profileId === profile.id ? profile : null;
  }

  function saveProfile(profile) {
    const saved = write(keys.profile, profile);
    if (saved) {
      const session = getSession();
      if (session) write(keys.session, { ...session, profileId: profile.id });
    }
    return saved;
  }

  function saveCredentials(credentials) {
    return write(keys.credentials, credentials);
  }

  function getCredentials() {
    const value = read(keys.credentials, null);
    if (value === null) return null;
    if (value && typeof value === "object" && !Array.isArray(value)
      && typeof value.email === "string" && typeof value.salt === "string" && typeof value.passwordHash === "string") return value;
    console.warn("ReAttempt credential data is invalid. The user must recreate the local demo account.");
    return null;
  }

  function saveSession(profileId) {
    return write(keys.session, { profileId, signedInAt: new Date().toISOString() });
  }

  function logout() {
    try {
      localStorage.removeItem(keys.session);
    } catch (error) {
      console.error("Could not clear the ReAttempt demo session.", error);
    }
  }

  function getList(name) {
    return getArray(keys[name]);
  }

  function saveList(name, values) {
    return write(keys[name], values);
  }

  function getPreferences() {
    const defaults = { theme: "light", studyReminders: true, weeklyRecap: true };
    const value = read(keys.preferences, defaults);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      console.warn("ReAttempt preferences are invalid. Default preferences are being used.");
      return defaults;
    }
    return {
      theme: value.theme === "dark" ? "dark" : "light",
      studyReminders: typeof value.studyReminders === "boolean" ? value.studyReminders : defaults.studyReminders,
      weeklyRecap: typeof value.weeklyRecap === "boolean" ? value.weeklyRecap : defaults.weeklyRecap
    };
  }

  function savePreferences(preferences) {
    return write(keys.preferences, preferences);
  }

  function clearDemoData() {
    try {
      Object.values(keys).forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error("Could not clear ReAttempt demo data.", error);
      return false;
    }
  }

  function getStorageStatus() {
    try {
      const probe = "reattempt_storage_probe";
      localStorage.setItem(probe, "ok");
      localStorage.removeItem(probe);
      return { available: true };
    } catch (error) {
      return { available: false, error };
    }
  }

  window.ReAttemptStore = Object.freeze({
    makeId,
    createSalt,
    hashPassword,
    getProfile,
    getSession,
    getCurrentProfile,
    saveProfile,
    saveCredentials,
    getCredentials,
    saveSession,
    logout,
    getList,
    saveList,
    getPreferences,
    savePreferences,
    clearDemoData,
    getStorageStatus
  });
})();
