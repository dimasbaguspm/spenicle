# Spenicle

> Simplify Spending, Maximize Savings

A modern expense tracking and financial management application built with TypeScript, Express.js, React, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Running with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd spenicle
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build -d
   ```

3. **Access the applications:**
   - **Web App (React)**: http://localhost:8080
   - **API (Express)**: http://localhost:3000
   - **PostgreSQL**: localhost:5432

4. **Stop the services:**
   ```bash
   docker-compose down
   ```

## 🏗️ What's Included

- **PostgreSQL 16**: Database server
- **Express.js API**: Backend service with TypeScript
- **React Web App**: Frontend with Vite and TypeScript
- **Development Tools**: Hot reloading, migrations, and testing setup

## 🚦 Staging Deployment (with SSL & Nginx)

### Prerequisites
- Docker and Docker Compose
- SSL certificates (see below)

### 1. Prepare SSL Certificates
- Place your SSL certificate and private key in `nginx/ssl/`:
  - `nginx/ssl/fullchain.pem` (certificate + chain)
  - `nginx/ssl/privkey.pem` (private key)
- For testing/staging, you can generate a self-signed certificate:
  ```bash
  mkdir -p nginx/ssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/CN=your-staging-domain.com"
  ```

### 2. Start Staging Services
```bash
./scripts/staging up
```
- Nginx will serve the web app over HTTPS and proxy API requests.
- Access your app at: https://<your-staging-domain> (or your VPS IP)

### 3. Other Useful Commands
- Stop services:
  ```bash
  ./scripts/staging down
  ```
- View logs:
  ```bash
  ./scripts/staging logs
  ```
- Backup database:
  ```bash
  ./scripts/staging backup-db
  ```
- Restore database:
  ```bash
  ./scripts/staging restore-db
  ```

## 📄 License

This project is licensed under the AGPL-3.0 License.

## 👤 Author

Dimas Bagus Prayogo Mukti <dimas.bagus.pm@gmail.com>
