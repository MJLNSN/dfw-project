# Security Policy

## 🔒 Security Incident - January 30, 2026

### What Happened
Sensitive credentials were accidentally committed to the Git repository in `docker-compose.yml`:
- Database password
- Mapbox API token
- AWS Cognito credentials

### Actions Taken
✅ **Immediate Response** (Completed):
1. Removed hardcoded secrets from `docker-compose.yml`
2. Used `git filter-repo` to purge all secrets from Git history
3. Force-pushed cleaned history to GitHub
4. Updated `.gitignore` to prevent future incidents
5. Created this security policy document

### Required Actions for Repository Users

⚠️ **IMPORTANT**: If you cloned this repository before January 30, 2026 17:30 EST:

1. **Delete your local clone**:
   ```bash
   rm -rf dfw-project
   ```

2. **Clone fresh copy**:
   ```bash
   git clone https://github.com/MJLNSN/dfw-project.git
   ```

3. **DO NOT push from old clones** - they contain compromised history

### Credentials That Need to Be Rotated

🔄 **Action Required** - Rotate these credentials:

1. **Database Password** ❌
   - Old password was exposed
   - Contact database administrator to change password
   - Update `backend/.env` with new password

2. **Mapbox Token** ❌
   - Revoke old token at: https://account.mapbox.com/access-tokens/
   - Create new token with same permissions
   - Update `frontend/.env.local` with new token

3. **AWS Cognito** ⚠️
   - User Pool ID and Client ID are not secret (they're public identifiers)
   - No action needed unless you want to create new pool

## Best Practices Going Forward

### ✅ DO:
1. **Always use environment files** (`.env`, `.env.local`)
2. **Keep `.env` files in `.gitignore`**
3. **Use `env.example` files** with placeholder values
4. **Use environment variables** in Docker Compose via `env_file:`
5. **Review commits** before pushing
6. **Use pre-commit hooks** to scan for secrets

### ❌ DON'T:
1. **Never hardcode credentials** in any file
2. **Never commit `.env` files**
3. **Never commit API keys or tokens**
4. **Never commit passwords**
5. **Never commit `docker-compose.override.yml`** (if it contains secrets)

## Environment File Structure

### Correct Setup:

```
project/
├── .gitignore              # Contains: .env, .env.local, *.env
├── docker-compose.yml      # Uses: env_file: backend/.env
├── backend/
│   ├── .env               # NEVER COMMIT - Contains real secrets
│   └── env.example        # COMMIT - Contains placeholders
└── frontend/
    ├── .env.local         # NEVER COMMIT - Contains real secrets
    └── env.example        # COMMIT - Contains placeholders
```

### docker-compose.yml (Secure):
```yaml
services:
  backend:
    env_file:
      - backend/.env      # ✅ References file, doesn't expose secrets
```

### docker-compose.yml (INSECURE):
```yaml
services:
  backend:
    environment:
      - DATABASE_URL=postgresql://user:PASSWORD@host/db  # ❌ NEVER DO THIS
```

## Checking for Secrets

Before committing, run:
```bash
# Check for common secret patterns
git diff --cached | grep -E "(password|secret|token|key|api_key)" -i

# Use git-secrets (recommended)
git secrets --scan
```

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **DO NOT** commit the fix publicly
3. **Contact**: neversaynever333@outlook.com
4. **Include**: Description, impact, and steps to reproduce

## Git History Cleanup (Reference)

Commands used to clean this repository:

```bash
# 1. Create list of secrets to remove
cat > /tmp/secrets.txt << EOF
actual-secret-1
actual-secret-2
EOF

# 2. Run git filter-repo
git filter-repo --replace-text /tmp/secrets.txt --force

# 3. Re-add remote
git remote add origin https://github.com/MJLNSN/dfw-project.git

# 4. Force push
git push --force origin main
```

## Prevention Tools

### Pre-commit Hook
Install git-secrets:
```bash
# Install
brew install git-secrets  # macOS
# or
pip install git-secrets   # Python

# Setup
git secrets --install
git secrets --register-aws
```

### GitHub Secret Scanning
- GitHub automatically scans for known secret patterns
- Enable "Secret scanning" in repository settings
- Review and fix any alerts immediately

## Compliance

This project handles:
- User authentication data (AWS Cognito)
- Geographic property data (public information)
- User preferences (non-sensitive)

**No PII or financial data** is stored or processed.

## Security Checklist

Before every commit:
- [ ] No `.env` files staged
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No tokens in code
- [ ] Reviewed `git diff --cached`
- [ ] All secrets in environment files
- [ ] Environment files in `.gitignore`

## Updates

| Date | Action | Status |
|------|--------|--------|
| 2026-01-30 | Initial security incident | ✅ Resolved |
| 2026-01-30 | Git history cleaned | ✅ Complete |
| 2026-01-30 | Security policy created | ✅ Complete |
| TBD | Rotate database password | ⏳ Pending |
| TBD | Rotate Mapbox token | ⏳ Pending |

---

**Last Updated**: January 30, 2026
**Status**: Active - Credentials need rotation

