import * as localStore from "./store.local.js";
import * as mongoStore from "./store.mongo.js";

let providerPromise;
let activeProviderKey;

function isVercelRuntime() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function resolveProviderKey() {
  if (process.env.MONGODB_URI) {
    return "mongodb";
  }

  return isVercelRuntime() ? "vercel-requires-mongodb" : "local-json";
}

function getProviderModule(providerKey) {
  if (providerKey === "mongodb") {
    return mongoStore;
  }

  if (providerKey === "local-json") {
    return localStore;
  }

  const error = new Error(
    "MONGODB_URI is required on Vercel because Vercel Functions do not provide durable writable storage for the local JSON store.",
  );
  error.statusCode = 503;
  error.code = "MONGODB_REQUIRED_ON_VERCEL";
  throw error;
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
