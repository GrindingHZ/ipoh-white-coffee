# UM Hackathon 2026 - Ipoh White Coffee
# WE ARE COOKED
# Datasets
* `fuelprice.csv` from [data.gov.my](https://data.gov.my/data-catalogue/fuelprice)
* `state-districts.json` from [data.gov.my](https://data.gov.my/data-catalogue/population_district) after processing
* `fish-pricing.csv` parsed from [lkim.gov.my](https://www.lkim.gov.my/laporan-harga-mingguan/)
* `fish-reference.json` parsed from [lkim.gov.my](https://www.lkim.gov.my/wp-content/uploads/2023/01/Buku-Ikan-Ikan-Komersial-Di-Malaysia.pdf)
* `fish_landings.csv` from [data.gov.my](https://data.gov.my/data-catalogue/fish_landings)
* `marine-landings-2024-state-month.csv`, `marine-landings-2024-species-month.csv`, `marine-prices-2024-monthly.csv` and `fishing-effort-2024-state-totals.csv` parsed from [dof.gov.my](https://www.dof.gov.my/sumber/perangkaan-perikanan-i/)
# Project setup
* Create .env file in root of project folder (an example can be found in .env.example)
* Run `docker compose build`
# Deployment
* Run `docker compose up`
* It will start up 3 containers, 1 for the database, 1 for backend and 1 for frontend
* The frontend will be running on port 80, the backend will be running on port 3000 and the database is running on 5432
