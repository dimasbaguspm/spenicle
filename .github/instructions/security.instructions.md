# Security Instructions - OWASP Top 10 2021 Compliance

This security instruction document follows the OWASP Top 10 2021 vulnerabilities and provides comprehensive security guidelines for AI-assisted development. These instructions ensure code generated follows enterprise-grade security practices.

## OWASP Top 10 2021 Security Controls

### A01:2021 - Broken Access Control
**Critical**: Access control failures can lead to unauthorized information disclosure, modification, or destruction.

- **Implement principle of least privilege** - grant minimum permissions necessary
- Use **Role-Based Access Control (RBAC)** or **Attribute-Based Access Control (ABAC)**
- **Verify authorization server-side** on every request (never trust client-side checks)
- Implement proper **vertical access controls** (privilege escalation prevention)
- Implement proper **horizontal access controls** (user isolation)
- **Deny by default** - explicitly allow rather than explicitly deny
- Log and monitor all access control failures for security analysis
- Use **resource-based permissions** where applicable
- Implement **multi-factor authorization** for sensitive operations

### A02:2021 - Cryptographic Failures
**Critical**: Failures in cryptography lead to exposure of sensitive data.

- **Encrypt sensitive data at rest** using AES-256-GCM or ChaCha20-Poly1305
- **Encrypt data in transit** using TLS 1.3+ with perfect forward secrecy
- Use **strong key derivation functions** (scrypt, Argon2id, bcrypt with work factor ≥12)
- Implement **proper key management** with regular rotation schedules
- **Never store passwords in plaintext** - always hash with salt
- Use **cryptographically secure random number generators** (crypto.randomBytes)
- Implement **data classification** schemes for handling sensitive information
- **Never log sensitive data** (passwords, tokens, PII, financial data)
- Use **authenticated encryption** to ensure data integrity

### A03:2021 - Injection
**Critical**: Injection flaws allow attackers to send malicious data to interpreters.

- **Use parameterized queries** (prepared statements) for all database interactions
- **Validate and sanitize all input** using allowlist validation
- Implement **proper output encoding** for different contexts (HTML, URL, JavaScript, CSS)
- Use **ORMs and query builders** that provide built-in injection protection
- Validate **data types, length, format, and range** for all inputs
- **Escape special characters** in dynamic queries (when parameterization isn't possible)
- Implement **input validation schemas** using libraries like Joi, Yup, or Zod
- **Sanitize file uploads** and restrict file types and sizes

### A04:2021 - Insecure Design
**Critical**: Focus on risks related to design and architectural flaws.

- Implement **secure design patterns** and architectural principles
- Use **threat modeling** during design phase to identify security requirements
- Implement **defense in depth** strategies with multiple security layers
- Design with **security by default** - secure configurations out of the box
- Implement **secure development lifecycle (SDLC)** practices
- Use **security design patterns** (e.g., bulkhead, circuit breaker, rate limiting)
- Implement **secure communication protocols** between services
- Design **resilient error handling** that doesn't leak sensitive information

### A05:2021 - Security Misconfiguration
**Critical**: Secure configurations must be implemented across the entire application stack.

- **Disable unnecessary features** and services to reduce attack surface
- Keep all **software components updated** with latest security patches
- Implement **security headers** for web applications
- **Remove or obfuscate** server version headers and error details
- Use **secure default configurations** and harden all environments
- Implement **proper CORS policies** with specific origins
- **Disable directory listing** and unnecessary HTTP methods
- Use **Content Security Policy (CSP)** to prevent XSS attacks

### A06:2021 - Vulnerable and Outdated Components
**Critical**: Using components with known vulnerabilities compromises application security.

- **Regularly audit dependencies** using automated scanning tools
- **Keep all dependencies updated** to latest stable versions
- **Monitor security advisories** for used components and frameworks
- Implement **Software Bill of Materials (SBOM)** tracking
- **Remove unnecessary dependencies** to reduce attack surface
- **Pin dependency versions** in production environments
- Use **private package registries** for internal components
- **Verify package integrity** using checksums and signatures

### A07:2021 - Identification and Authentication Failures
**Critical**: Failures in authentication mechanisms compromise user identity verification.

- Implement **multi-factor authentication (MFA)** for privileged accounts
- Use **strong password policies** (minimum 12 characters, complexity requirements)
- Implement **account lockout mechanisms** after failed login attempts
- Use **secure session management** with proper timeout and invalidation
- **Generate cryptographically strong session tokens** with sufficient entropy
- Implement **proper logout functionality** that invalidates sessions
- **Protect against credential stuffing** using rate limiting and monitoring
- **Never expose session identifiers** in URLs or logs

### A08:2021 - Software and Data Integrity Failures
**Critical**: Failures in software and data integrity can lead to unauthorized code execution.

- **Verify software integrity** using digital signatures and checksums
- Implement **secure CI/CD pipelines** with integrity checks at each stage
- Use **code signing** for deployments and releases
- Implement **subresource integrity (SRI)** for external scripts and stylesheets
- **Validate data integrity** using checksums, digital signatures, or HMAC
- Implement **secure deserialization** practices to prevent object injection
- Use **trusted repositories** and package managers with verification
- **Monitor for unauthorized changes** in code and configuration


### A09:2021 - Security Logging and Monitoring Failures
**Critical**: Insufficient logging and monitoring can prevent timely detection of security breaches.

- **Log all authentication events** (successes and failures)
- **Monitor for suspicious patterns** and implement alerting
- Implement **centralized logging** with proper log aggregation
- **Never log sensitive information** (passwords, tokens, PII)
- Use **structured logging** with consistent formats and timestamps
- Implement **log integrity protection** to prevent tampering
- Set up **real-time monitoring** and automated incident response
- **Retain logs appropriately** based on compliance requirements


### A10:2021 - Server-Side Request Forgery (SSRF)
**Critical**: SSRF flaws allow attackers to send crafted requests from the server.

- **Validate and sanitize all URLs** before making outbound requests
- Implement **allowlist for trusted domains** and IP ranges
- **Block private IP ranges** and localhost unless explicitly required
- Use **separate network segments** for internal and external services
- Implement **request timeouts** and size limits for outbound requests
- **Validate response content types** and sizes before processing
- Use **proxy servers** for outbound requests when possible
- **Monitor outbound network traffic** for suspicious patterns

## Implementation Guidelines

### Code Review Security Checklist
- [ ] Input validation implemented for all user inputs
- [ ] Authentication and authorization properly implemented
- [ ] Sensitive data encrypted in transit and at rest
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Security headers properly configured
- [ ] Logging captures security events without exposing sensitive data
- [ ] Access controls follow principle of least privilege
- [ ] Cryptographic operations use secure algorithms and implementations
- [ ] External requests protected against SSRF

### Security Testing Requirements
- Implement **automated security testing** in CI/CD pipelines
- Use **Static Application Security Testing (SAST)** tools
- Implement **Dynamic Application Security Testing (DAST)**
- Use **Software Composition Analysis (SCA)** for dependency scanning
- Conduct **regular penetration testing** by qualified professionals
- Implement **security unit tests** for critical security functions

### Incident Response Preparation
- Maintain **incident response procedures** for security events
- Implement **automated alerting** for critical security violations
- **Document security architecture** and data flows
- Maintain **contact information** for security team and stakeholders
- **Regularly test incident response procedures** through tabletop exercises