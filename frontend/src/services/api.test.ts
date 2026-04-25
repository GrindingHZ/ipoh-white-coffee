import { getFuelPrice, getRecommendation, loginWithIc, registerWithIc } from "./api";

const fuelResponse = {
  effectiveDate: "2026-04-16",
  ron95Price: 1.99,
  dieselPrice: 2.15,
};

describe("getFuelPrice", () => {
  const originalApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = "http://api.test";
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(fuelResponse),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.REACT_APP_API_BASE_URL = originalApiBaseUrl;
    jest.restoreAllMocks();
  });

  it("fetches latest fuel price without locality", async () => {
    await expect(getFuelPrice()).resolves.toEqual(fuelResponse);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/fuel/latest");
  });

  it("encodes locality query when provided", async () => {
    await getFuelPrice("Kuching, Sarawak");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/fuel/latest?locality=Kuching%2C+Sarawak",
    );
  });

  it("throws when latest fuel price request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: jest.fn(),
    });

    await expect(getFuelPrice()).rejects.toThrow("Fuel price request failed: 404");
  });
});

describe("getRecommendation", () => {
  const originalApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  let fetchMock: jest.Mock;
  const recommendationResponse = {
    verdict: "GO",
    reason: "Today is a reasonable fishing day.",
    analysis: {
      shouldFishToday: true,
      profitConfidence: 0.58,
      riskLevel: "medium",
      reasoning: "Estimated profit confidence is 58%.",
      estimatedFuelCostRm: null,
      keySignals: ["Weather is acceptable."],
      indicators: [
        {
          indicator: "weather",
          score: 0.68,
          confidence: 0.5,
          riskLevel: "low",
          summary: "Weather is acceptable.",
        },
      ],
    },
  };

  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = "http://api.test";
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(recommendationResponse),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.REACT_APP_API_BASE_URL = originalApiBaseUrl;
    jest.restoreAllMocks();
  });

  it("posts to recommendation with session credentials", async () => {
    await expect(getRecommendation()).resolves.toEqual(recommendationResponse);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/recommendation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({}),
    });
  });

  it("throws when recommendation request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn(),
    });

    await expect(getRecommendation()).rejects.toThrow("Recommendation request failed: 500");
  });
});

describe("backend auth", () => {
  const originalApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = "http://api.test";
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "user-id",
        name: "Test User",
        locality: "Mersing",
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.REACT_APP_API_BASE_URL = originalApiBaseUrl;
    jest.restoreAllMocks();
  });

  it("logs in by IC and keeps the backend session cookie", async () => {
    await loginWithIc("900101015555");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ icNumber: "900101015555" }),
    });
  });

  it("registers by IC and keeps the backend session cookie", async () => {
    await registerWithIc({
      icNumber: "900101015555",
      name: "Test User",
      locality: "Mersing",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        icNumber: "900101015555",
        name: "Test User",
        locality: "Mersing",
      }),
    });
  });
});
