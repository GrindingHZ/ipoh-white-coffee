-- CreateTable
CREATE TABLE "fish_prices" (
    "id" UUID NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "approxWeekStart" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "monthAbbr" TEXT NOT NULL,
    "weekInMonth" INTEGER NOT NULL,
    "speciesMalay" TEXT NOT NULL,
    "speciesEnglish" TEXT NOT NULL,
    "wholesaleRmKg" DECIMAL NOT NULL,
    "retailRmKg" DECIMAL NOT NULL,
    "reportSource" TEXT NOT NULL,

    CONSTRAINT "fish_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marine_prices" (
    "id" UUID NOT NULL,
    "priceType" TEXT NOT NULL,
    "speciesMalay" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "monthNameMs" TEXT NOT NULL,
    "priceRmPerKg" DECIMAL NOT NULL,
    "annualAverageRmPerKg" DECIMAL NOT NULL,

    CONSTRAINT "marine_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marine_landings_state_monthly" (
    "id" UUID NOT NULL,
    "coast" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "monthNameMs" TEXT NOT NULL,
    "landingsTonnes" DECIMAL NOT NULL,

    CONSTRAINT "marine_landings_state_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marine_landings_species_monthly" (
    "id" UUID NOT NULL,
    "speciesMalay" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "monthNameMs" TEXT NOT NULL,
    "landingsTonnes" DECIMAL NOT NULL,

    CONSTRAINT "marine_landings_species_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_effort_state_totals" (
    "id" UUID NOT NULL,
    "coast" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "effortMetric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "fishing_effort_state_totals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fish_prices_weekLabel_speciesMalay_key" ON "fish_prices"("weekLabel", "speciesMalay");

-- CreateIndex
CREATE UNIQUE INDEX "marine_prices_priceType_speciesMalay_month_key" ON "marine_prices"("priceType", "speciesMalay", "month");

-- CreateIndex
CREATE UNIQUE INDEX "marine_landings_state_monthly_coast_state_month_key" ON "marine_landings_state_monthly"("coast", "state", "month");

-- CreateIndex
CREATE UNIQUE INDEX "marine_landings_species_monthly_speciesMalay_month_key" ON "marine_landings_species_monthly"("speciesMalay", "month");

-- CreateIndex
CREATE UNIQUE INDEX "fishing_effort_state_totals_coast_state_effortMetric_key" ON "fishing_effort_state_totals"("coast", "state", "effortMetric");
