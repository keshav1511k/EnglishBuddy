import * as localStore from "./store.local.js";
import * as mongoStore from "./store.mongo.js";

let providerPromise;
let activeProviderKey;

function resolveProviderKey() {
  return process.env.MONGODB_URI ? "mongodb" : "local-json";
}

function getProviderModule(providerKey) {
  return providerKey === "mongodb" ? mongoStore : localStore;
}

async function getProvider() {
  const nextProviderKey = resolveProviderKey();

  if (!providerPromise || activeProviderKey !== nextProviderKey) {
    activeProviderKey = nextProviderKey;
    providerPromise = (async () => {
      const provider = getProviderModule(nextProviderKey);

      if (provider.initialize) {
        await provider.initialize();
      }

      return provider;
    })();
  }

  return providerPromise;
}

export function getStoreProviderName() {
  return resolveProviderKey();
}

export async function initializeStore() {
  await getProvider();
}

export async function createUser(payload) {
  const provider = await getProvider();
  return provider.createUser(payload);
}

export async function loginUser(payload) {
  const provider = await getProvider();
  return provider.loginUser(payload);
}

export async function getUserByToken(token) {
  const provider = await getProvider();
  return provider.getUserByToken(token);
}

export async function logoutUser(token) {
  const provider = await getProvider();
  return provider.logoutUser(token);
}

export async function createPracticeSession(userId, payload) {
  const provider = await getProvider();
  return provider.createPracticeSession(userId, payload);
}

export async function getSessionsForUser(userId) {
  const provider = await getProvider();
  return provider.getSessionsForUser(userId);
}

export async function getDashboardForUser(userId) {
  const provider = await getProvider();
  return provider.getDashboardForUser(userId);
}
