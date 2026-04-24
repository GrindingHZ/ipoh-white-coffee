# UM Hackathon 2026 - Ipoh White Coffee
# WE ARE COOKED
# Datasets
* Fuel data from [data.gov.my](https://data.gov.my/data-catalogue/fuelprice)
* District mapping data is from [data.gov.my](https://data.gov.my/data-catalogue/population_district) but processed
to extract the district to state mapping
* Fish pricing data is from [lkim.gov.my](https://www.lkim.gov.my/laporan-harga-mingguan/)
* Fish reference data is from [lkim.gov.my](https://www.lkim.gov.my/wp-content/uploads/2023/01/Buku-Ikan-Ikan-Komersial-Di-Malaysia.pdf)
# Project setup
* Create .env file in root of project folder (an example can be found in .env.example)
* Run `docker compose build`
# Deployment
* Run `docker compose up`
* It will start up 3 containers, 1 for the database, 1 for backend and 1 for frontend
* The frontend will be running on port 80, the backend will be running on port 3000 and the database is running on 5432