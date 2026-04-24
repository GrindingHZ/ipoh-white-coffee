import { getFuelPrice } from "./api";

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
