-- CreateTable
CREATE TABLE "seed_runs" (
    "key" TEXT NOT NULL,
    "seededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_runs_pkey" PRIMARY KEY ("key")
);
