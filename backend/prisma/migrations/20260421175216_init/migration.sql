-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "homeJetty" TEXT,
    "fuelCapacity" DECIMAL,
    "targetSpecies" TEXT[],
    "typicalDepartureTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tide_entries" (
    "id" UUID NOT NULL,
    "district" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "highTime" TEXT,
    "highHeight" DECIMAL,
    "lowTime" TEXT,
    "lowHeight" DECIMAL,

    CONSTRAINT "tide_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_prices" (
    "id" UUID NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "ron95Price" DECIMAL NOT NULL,
    "ron95UnsubsidisedPrice" DECIMAL,
    "dieselPrice" DECIMAL NOT NULL,
    "dieselEastMsiaPrice" DECIMAL,

    CONSTRAINT "fuel_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_patterns" (
    "id" UUID NOT NULL,
    "species" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "district" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "seasonal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_landings" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "coast" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "landingsKg" INTEGER NOT NULL,

    CONSTRAINT "fish_landings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" UUID NOT NULL,
    "district" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tide_entries_district_date_key" ON "tide_entries"("district", "date");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_prices_effectiveDate_key" ON "fuel_prices"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_patterns_species_month_district_key" ON "seasonal_patterns"("species", "month", "district");

-- CreateIndex
CREATE UNIQUE INDEX "fish_landings_date_coast_state_key" ON "fish_landings"("date", "coast", "state");

-- CreateIndex
CREATE UNIQUE INDEX "weather_cache_type_district_key" ON "weather_cache"("type", "district");
