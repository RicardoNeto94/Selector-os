import "server-only";

export class CompuCashClient {
  constructor({ baseUrl, tokenUrl, clientId, clientSecret, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.tokenUrl = tokenUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetch = fetchImpl;
    this.token = null;
  }

  async authenticate() {
    const response = await this.fetch(this.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "cc5api",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      cache: "no-store",
    });
    const payload = await readResponse(response, "OAuth token");
    if (!payload.access_token) {
      throw new Error("Compucash token response has no access_token.");
    }
    this.token = payload.access_token;
  }

  getStores() {
    return this.get("/Store");
  }

  getProducts({ storeIds = [], lastUpdated = null } = {}) {
    const query = new URLSearchParams({
      IsActive: "1",
      AllowBron: "-1",
      ProductsWithoutPrices: "true",
      LanguageCode: "et",
    });
    if (storeIds.length) query.set("StoreIds", storeIds.join(","));
    if (lastUpdated) query.set("LastUpdated", lastUpdated);
    return this.get(`/Products?${query}`);
  }

  async get(path) {
    if (!this.token) throw new Error("Authenticate before calling Compucash.");
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${this.token}`,
        "accept-language": "et",
        "x-api-version": "1.0",
      },
      cache: "no-store",
    });
    const payload = await readResponse(response, `GET ${path}`);
    if (payload.error?.code) {
      throw new Error(`Compucash API error ${payload.error.code}.`);
    }
    return payload.data ?? [];
  }
}

async function readResponse(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}).`);
  }
  return payload;
}
