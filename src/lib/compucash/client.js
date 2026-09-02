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

  async getInvoicesByPeriod({ periodStart, periodEnd, pageSize = 100 } = {}) {
    const results = [];
    let pageNumber = 1;
    let hasNext = true;
    while (hasNext) {
      const query = new URLSearchParams({
        PeriodStart: periodStart,
        PeriodEnd: periodEnd,
        PageNumber: String(pageNumber),
        PageSize: String(pageSize),
      });
      const page = await this.get(`/Invoice/ByPeriod?${query}`);
      results.push(...(page.results ?? []));
      hasNext = Boolean(page.hasNext);
      pageNumber += 1;
      if (pageNumber > 500) throw new Error("Compucash invoice paging exceeded the safety limit.");
    }
    return results;
  }

  async getDeliveryNotes({ periodStart, periodEnd, deliveryNoteTypes, pageSize = 100 } = {}) {
    const results = [];
    let pageNumber = 1;
    let hasNext = true;
    while (hasNext) {
      const page = await this.post("/DeliveryNotes/Filter", {
        periodStart,
        periodEnd,
        deliveryNoteTypes,
        pageNumber,
        pageSize,
      });
      results.push(...(page.results ?? []));
      hasNext = Boolean(page.hasNext);
      pageNumber += 1;
      if (pageNumber > 500) throw new Error("Compucash delivery-note paging exceeded the safety limit.");
    }
    return results;
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

  async post(path, body) {
    if (!this.token) throw new Error("Authenticate before calling Compucash.");
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "accept-language": "et",
        "content-type": "application/json",
        "x-api-version": "1.0",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await readResponse(response, `POST ${path}`);
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
    const reason = [payload?.error, payload?.error_description]
      .filter((value) => typeof value === "string" && value.trim())
      .join(": ");
    throw new Error(`${label} failed (${response.status})${reason ? `: ${reason}` : "."}`);
  }
  return payload;
}
