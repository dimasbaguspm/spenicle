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

## 🚦 Production Deployment (with SSL & Domain)

### Prerequisites
- Docker and Docker Compose
- Domain name with DNS configured
- SSL certificates (see below)

### 1. Prepare SSL Certificates

Use the SSL certificate generator script:
```bash
./scripts/generate-ssl.sh
```

**Options available:**
- **Let's Encrypt (Recommended)**: Free SSL certificates for production
- **Existing Certificates**: Use your own SSL certificates  
- **Self-signed**: For development/testing only

**For production with domain `dimasbaguspm.com`:**
1. Ensure DNS A records point to your VPS:
   - `dimasbaguspm.com` → YOUR_VPS_IP
   - `spenicle.dimasbaguspm.com` → YOUR_VPS_IP  
   - `spenicle-api.dimasbaguspm.com` → YOUR_VPS_IP

2. Run the SSL generator and choose option 1 (Let's Encrypt)

3. Follow the provided commands to set up certificates on your VPS

### 2. Start Production Services
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Access Your Application
- **Landing Page**: https://dimasbaguspm.com
- **Web App**: https://spenicle.dimasbaguspm.com  
- **API Documentation**: https://spenicle-api.dimasbaguspm.com/api/docs

## 🧪 Staging Deployment (for testing)

### Prerequisites
- Docker and Docker Compose
- SSL certificates (self-signed for testing)

### 1. Generate Self-Signed Certificates
```bash
./scripts/generate-ssl.sh
```
Choose option 3 for self-signed certificates (testing only).

### 2. Start Staging Services
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
- Access via your VPS IP with HTTPS (will show security warnings for self-signed certs)

### 3. Other Useful Commands
- Stop services:
  ```bash
  docker-compose -f docker-compose.prod.yml down
  ```
- View logs:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f
  ```

## 📄 License

This project is licensed under the AGPL-3.0 License.

## 👤 Author

Dimas Bagus Prayogo Mukti <dimas.bagus.pm@gmail.com>
