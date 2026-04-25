/**
 * Frontend UI tests — QATD TC-M-001 to TC-M-016.
 *
 * These tests exercise the same behaviours described as manual test cases in
 * the QATD document but run automatically through React Testing Library.
 *
 * The backend is fully mocked at the services/api boundary so no network
 * traffic occurs.
 */

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import {
  REVEAL_BURST_MS,
  REVEAL_MAP_MS,
  REVEAL_METRICS_MS,
  REVEAL_SEE_MORE_MS,
  STORAGE_USER_KEY,
} from "./constants";
import {
  getFuelPrice,
  getLocationCoast,
  getMe,
  getRecommendation,
  loginWithIc,
  logoutUser,
  registerWithIc,
} from "./services/api";

jest.mock("./services/api");
jest.mock("./assets/fisheriq-hero.png", () => "hero-bg-stub");

const mockedGetFuelPrice = getFuelPrice as jest.MockedFunction<typeof getFuelPrice>;
const mockedGetLocationCoast = getLocationCoast as jest.MockedFunction<typeof getLocationCoast>;
const mockedGetMe = getMe as jest.MockedFunction<typeof getMe>;
const mockedGetRecommendation = getRecommendation as jest.MockedFunction<typeof getRecommendation>;
const mockedLoginWithIc = loginWithIc as jest.MockedFunction<typeof loginWithIc>;
const mockedLogoutUser = logoutUser as jest.MockedFunction<typeof logoutUser>;
const mockedRegisterWithIc = registerWithIc as jest.MockedFunction<typeof registerWithIc>;

const TEST_USER = {
  id: "user-1",
  name: "Ahmad Ismail",
  locality: "Lumut",
};

const GO_RECOMMENDATION = {
  verdict: "GO" as const,
  reason: "Conditions are favourable for fishing today.",
  analysis: {
    shouldFishToday: true,
    profitConfidence: 0.78,
    riskLevel: "low" as const,
    reasoning: "Stable weather, low tide pressure, fuel price acceptable.",
    estimatedFuelCostRm: 32.5,
    keySignals: ["Calm sea state", "Low tide window aligned with departure"],
    indicators: [
      {
        indicator: "weather",
        score: 0.82,
        confidence: 0.9,
        riskLevel: "low" as const,
        summary: "Clear skies, light winds",
      },
      {
        indicator: "tide",
        score: 0.75,
        confidence: 0.8,
        riskLevel: "low" as const,
        summary: "Favourable tide window",
      },
    ],
  },
};

const NO_GO_RECOMMENDATION = {
  verdict: "NO_GO" as const,
  reason: "Strong winds expected — not worth the trip today.",
  analysis: {
    shouldFishToday: false,
    profitConfidence: 0.32,
    riskLevel: "high" as const,
    reasoning: "Heavy weather warning issued.",
    estimatedFuelCostRm: 38.0,
    keySignals: ["Strong wind warning"],
    indicators: [
      {
        indicator: "weather",
        score: 0.2,
        confidence: 0.85,
        riskLevel: "high" as const,
        summary: "Strong wind warning",
      },
    ],
  },
};

const FUEL_PRICE = {
  effectiveDate: "2026-04-22",
  dieselPrice: 2.15,
  ron95Price: 2.05,
};

const LOCATION = {
  coords: { lat: 4.23, lng: 100.62 },
  coast: { name: "Pantai Remis", lat: 4.23, lng: 100.62, distance_km: 1.4 },
};

function loginViaStorage() {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(TEST_USER));
}

/** Render <App /> and flush the initial async effects (useFuelPrice / getMe)
 *  so React act() warnings do not leak into the test output. */
async function renderApp() {
  const result = render(<App />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockedGetFuelPrice.mockResolvedValue(FUEL_PRICE);
  mockedGetMe.mockResolvedValue(TEST_USER);
  mockedGetLocationCoast.mockResolvedValue(LOCATION);
  mockedGetRecommendation.mockResolvedValue(GO_RECOMMENDATION);
  mockedLoginWithIc.mockResolvedValue(TEST_USER);
  mockedRegisterWithIc.mockResolvedValue(TEST_USER);
  mockedLogoutUser.mockResolvedValue(undefined);

  // Re-establish the prototype mocks because clearAllMocks resets
  // implementations created in setupTests via jest.fn(impl).
  (Element.prototype.animate as jest.Mock).mockReturnValue({
    onfinish: null,
    cancel: jest.fn(),
  });
  (HTMLCanvasElement.prototype.getContext as jest.Mock).mockReturnValue({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-001 — First-time user registration
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-001 First-time user registration", () => {
  it("opens auth modal, completes registration, and shows the user name", async () => {
    const user = userEvent.setup();
    await renderApp();

    expect(screen.getByRole("dialog", { name: /sign in to fisheriq/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /no, i'm new here/i }));

    await user.type(screen.getByLabelText(/ic number/i), "900101015555");
    await user.type(screen.getByLabelText(/full name/i), "Ahmad Ismail");
    await user.type(screen.getByLabelText(/fishing locality/i), "Lumut");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockedRegisterWithIc).toHaveBeenCalledWith({
      icNumber: "900101015555",
      name: "Ahmad Ismail",
      locality: "Lumut",
    });

    await waitFor(() => {
      const profileButton = screen.getByRole("button", { name: /ahmad/i });
      expect(profileButton).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-002 — Login with existing IC
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-002 Login with existing IC", () => {
  it("logs in via IC and dismisses the auth modal", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole("button", { name: /yes, log me in/i }));
    await user.type(screen.getByLabelText(/ic number/i), "900101015555");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    expect(mockedLoginWithIc).toHaveBeenCalledWith("900101015555");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /sign in to fisheriq/i })).not.toBeInTheDocument();
    });

    expect(await screen.findByRole("button", { name: /ahmad/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-003 — Check button — full reveal sequence (verdict, map, metrics, see more)
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-003 Check button — full reveal sequence", () => {
  it("reveals verdict, map, metrics, and the See more button in order", async () => {
    loginViaStorage();
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });

    await act(async () => {
      checkButton.click();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedGetRecommendation).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(REVEAL_BURST_MS);
    });
    expect(screen.getByText(/go fish/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(REVEAL_MAP_MS - REVEAL_BURST_MS);
    });
    expect(screen.getByTitle(/pantai remis/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(REVEAL_METRICS_MS - REVEAL_MAP_MS);
    });
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("Risk")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(REVEAL_SEE_MORE_MS - REVEAL_METRICS_MS);
    });
    expect(screen.getByRole("button", { name: /see more/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-004 — Verdict badge — GO state
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-004 Verdict badge — GO state", () => {
  it("renders GO FISH badge with reason text and check icon", async () => {
    loginViaStorage();
    mockedGetRecommendation.mockResolvedValue(GO_RECOMMENDATION);
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });
    await act(async () => {
      checkButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(REVEAL_BURST_MS);
    });

    expect(screen.getByText("GO FISH")).toBeInTheDocument();
    expect(screen.getByText(GO_RECOMMENDATION.reason)).toBeInTheDocument();
    expect(document.querySelector(".verdict-badge--go")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-005 — Verdict badge — NO GO state
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-005 Verdict badge — NO GO state", () => {
  it("renders STAY HOME badge with the warning reason", async () => {
    loginViaStorage();
    mockedGetRecommendation.mockResolvedValue(NO_GO_RECOMMENDATION);
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });
    await act(async () => {
      checkButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(REVEAL_BURST_MS);
    });

    expect(screen.getByText("STAY HOME")).toBeInTheDocument();
    expect(screen.getByText(NO_GO_RECOMMENDATION.reason)).toBeInTheDocument();
    expect(document.querySelector(".verdict-badge--stay")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-006 — See more — expand and collapse
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-006 See more — expand and collapse", () => {
  it("toggles the detailed analysis panel", async () => {
    loginViaStorage();
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });
    await act(async () => {
      checkButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(REVEAL_SEE_MORE_MS);
    });

    const seeMore = screen.getByRole("button", { name: /see more/i });
    jest.useRealTimers();

    fireEvent.click(seeMore);
    expect(screen.getByText(/recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/key signals/i)).toBeInTheDocument();
    expect(screen.getByText(/signal scores/i)).toBeInTheDocument();
    expect(screen.getByText(GO_RECOMMENDATION.analysis!.reasoning)).toBeInTheDocument();

    const hideButton = screen.getByRole("button", { name: /hide more/i });
    fireEvent.click(hideButton);
    expect(screen.queryByText(GO_RECOMMENDATION.analysis!.reasoning)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-007 — Navigation bar — condition chips present
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-007 Navigation bar — condition chips", () => {
  it("renders four chips covering Tide, Weather, Diesel, and RON95", async () => {
    loginViaStorage();
    await renderApp();

    const conditionsRegion = await screen.findByLabelText(/current conditions/i);
    const chips = conditionsRegion.querySelectorAll<HTMLDivElement>(".nav-condition-chip");
    expect(chips.length).toBe(4);

    const emojis = Array.from(chips, (chip) =>
      chip.querySelector(".nav-condition-emoji")?.textContent,
    );
    expect(emojis).toEqual(["🌊", "🌤", "⛽", "⛽"]);

    await waitFor(() => {
      const expandedTexts = Array.from(
        conditionsRegion.querySelectorAll(".nav-condition-expanded strong"),
        (el) => el.textContent ?? "",
      );
      expect(expandedTexts.some((t) => t.includes("Diesel"))).toBe(true);
      expect(expandedTexts.some((t) => t.includes("RON95"))).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-008 — Chip expand on focus/hover (verifies focusable chips exist)
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-008 Navigation bar — chip expand on hover/focus", () => {
  it("each chip is focusable and has both collapsed and expanded markup", async () => {
    loginViaStorage();
    await renderApp();

    const conditionsRegion = await screen.findByLabelText(/current conditions/i);
    const chips = conditionsRegion.querySelectorAll<HTMLDivElement>(".nav-condition-chip");

    chips.forEach((chip) => {
      expect(chip.getAttribute("tabindex")).toBe("0");
      expect(chip.querySelector(".nav-condition-collapsed")).toBeInTheDocument();
      expect(chip.querySelector(".nav-condition-expanded")).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-009 — Mobile view — emoji-only chips (verifies CSS-keyed structure)
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-009 Mobile view — emoji-only chips", () => {
  it("each chip exposes nav-condition-emoji and nav-condition-text spans", async () => {
    loginViaStorage();
    await renderApp();

    const conditionsRegion = await screen.findByLabelText(/current conditions/i);
    const chips = conditionsRegion.querySelectorAll<HTMLDivElement>(".nav-condition-chip");

    chips.forEach((chip) => {
      expect(chip.querySelector(".nav-condition-emoji")).toBeInTheDocument();
      expect(chip.querySelector(".nav-condition-text")).toBeInTheDocument();
    });

    expect(document.querySelector(".brand-logo")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-010 — Mobile view — scrollable result panel
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-010 Mobile view — scrollable result screen", () => {
  it("decision panel and result stage classes are present after a check", async () => {
    loginViaStorage();
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });
    await act(async () => {
      checkButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(REVEAL_BURST_MS);
    });

    expect(document.querySelector(".decision-panel")).toBeInTheDocument();
    expect(document.querySelector(".signal-stage--result")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-011 — Custom cursor — desktop glow element exists
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-011 Custom cursor — desktop glow", () => {
  it("renders the .cursor-glow element in the DOM", async () => {
    loginViaStorage();
    await renderApp();
    expect(document.querySelector(".cursor-glow")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-012 — Cursor adds hover class when over interactive elements
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-012 Custom cursor — sparkle / hover state", () => {
  it("adds cursor-glow--hover class when mouse is over the Check button", async () => {
    loginViaStorage();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });

    await act(async () => {
      fireEvent.mouseMove(checkButton, { clientX: 200, clientY: 200, bubbles: true });
    });

    const glow = document.querySelector(".cursor-glow") as HTMLElement;
    await waitFor(() => {
      expect(glow.classList.contains("cursor-glow--hover")).toBe(true);
    });

    expect(Element.prototype.animate).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-013 — Check button glow — pulse-button class is rendered
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-013 Check button — glow animation", () => {
  it("renders the .pulse-button element with the breathing glow base class", async () => {
    loginViaStorage();
    await renderApp();
    const button = await screen.findByRole("button", { name: /check/i });
    expect(button.classList.contains("pulse-button")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-014 — Session persistence
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-014 Session persistence", () => {
  it("does not show the auth modal when a stored user exists", async () => {
    loginViaStorage();
    await renderApp();

    expect(
      screen.queryByRole("dialog", { name: /sign in to fisheriq/i }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /ahmad/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-015 — Logout
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-015 Logout", () => {
  it("clears stored user and reopens the auth modal", async () => {
    const user = userEvent.setup();
    loginViaStorage();
    await renderApp();

    const profileButton = await screen.findByRole("button", { name: /ahmad/i });
    await user.click(profileButton);

    const logoutButton = screen.getByRole("menuitem", { name: /log out/i });
    await user.click(logoutButton);

    expect(mockedLogoutUser).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /sign in to fisheriq/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-M-016 — ERROR verdict display
// ─────────────────────────────────────────────────────────────────────────────

describe("TC-M-016 ERROR verdict display", () => {
  it("shows TRY AGAIN when the API returns an ERROR verdict", async () => {
    loginViaStorage();
    mockedGetRecommendation.mockResolvedValue({
      verdict: "ERROR",
      reason: "Unable to make an assessment right now. Please try again.",
      errorDetail: "rate limit",
      analysis: null,
    });
    jest.useFakeTimers();
    await renderApp();

    const checkButton = await screen.findByRole("button", { name: /check/i });
    await act(async () => {
      checkButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(REVEAL_BURST_MS);
    });

    expect(screen.getByText("TRY AGAIN")).toBeInTheDocument();
    expect(screen.getByText(/unable to make an assessment/i)).toBeInTheDocument();
  });
});
