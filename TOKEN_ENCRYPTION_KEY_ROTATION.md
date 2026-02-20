# Token Encryption Key Rotation Guide

This document describes how to rotate the token encryption key for OAuth tokens stored at rest.

## Overview

Token encryption keys should be rotated periodically to maintain security. This guide covers:
- Why key rotation is important
- How to rotate the encryption key
- How to re-encrypt existing encrypted tokens
- Best practices for key management

## Why Rotate Keys?

Key rotation is important for:
- **Security best practices**: Regular rotation limits the impact of a compromised key
- **Compliance**: Many security standards require periodic key rotation
- **Risk mitigation**: If a key is leaked, rotating limits the exposure window

## Key Generation

To generate a new encryption key:

```bash
cd resume-api
python -c "from lib.token_encryption import generate_encryption_key; print(generate_encryption_key())"
```

Or use the command line:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Key Rotation Procedure

### 1. Prepare the New Key

Generate a new encryption key as shown above. Store it securely and do not commit to version control.

### 2. Update Environment Configuration

Update your environment variables to use the new key:

```bash
# In your .env file (production: use secret management system)
TOKEN_ENCRYPTION_KEY=<new_key_here>
```

### 3. Re-encrypt Existing Tokens

Since the library uses symmetric encryption, you need to re-encrypt all existing tokens with the new key.

**Important**: During rotation, you must have access to both the old and new keys.

Create a migration script:

```python
"""
Script to re-encrypt OAuth tokens with a new encryption key.

Usage:
    python rotate_encryption_keys.py --old-key <old_key> --new-key <new_key>
"""
import sys
import os
from lib.token_encryption import TokenEncryption
from sqlalchemy import create_engine, text

def rotate_tokens(old_key: str, new_key: str, database_url: str):
    """
    Re-encrypt all OAuth tokens with the new key.

    Args:
        old_key: Current encryption key
        new_key: New encryption key
        database_url: Database connection URL
    """
    # Create encryption instances
    old_crypto = TokenEncryption(old_key)
    new_crypto = TokenEncryption(new_key)

    # Connect to database
    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Get all OAuth tokens from the database
        # Adjust this query based on your actual schema
        result = conn.execute(
            text("SELECT id, encrypted_token FROM oauth_tokens WHERE encrypted_token IS NOT NULL")
        )

        updated_count = 0
        for row in result:
            token_id = row[0]
            encrypted_token = row[1]

            try:
                # Decrypt with old key
                plaintext = old_crypto.decrypt(encrypted_token)

                # Encrypt with new key
                new_encrypted = new_crypto.encrypt(plaintext)

                # Update database
                conn.execute(
                    text("UPDATE oauth_tokens SET encrypted_token = :new_token WHERE id = :id"),
                    {"new_token": new_encrypted, "id": token_id}
                )
                updated_count += 1

                print(f"Rotated token ID {token_id}")

            except Exception as e:
                print(f"ERROR: Failed to rotate token ID {token_id}: {e}")
                # Continue with other tokens

        conn.commit()
        print(f"\nRotation complete. Updated {updated_count} tokens.")


if __name__ == "__main__":
    # Parse command line arguments
    import argparse

    parser = argparse.ArgumentParser(description="Rotate token encryption keys")
    parser.add_argument("--old-key", required=True, help="Current encryption key")
    parser.add_argument("--new-key", required=True, help="New encryption key")
    parser.add_argument("--db-url", required=True, help="Database connection URL")

    args = parser.parse_args()

    # Perform rotation
    rotate_tokens(args.old_key, args.new_key, args.db_url)
```

### 4. Deploy the New Key

1. Update the `TOKEN_ENCRYPTION_KEY` in your production environment
2. Run the migration script to re-encrypt existing tokens
3. Verify that the migration completed successfully
4. Monitor application logs for any decryption errors

### 5. Retire the Old Key

After successful rotation and verification:
1. Securely delete the old encryption key
2. Remove any backups of the old key after an appropriate retention period
3. Document the rotation in your security audit log

## Rotation Frequency

Recommended rotation frequencies:
- **Standard**: Every 90 days
- **High-security**: Every 30 days
- **After incident**: Immediately if key compromise is suspected

## Emergency Key Rotation

If you suspect the current key has been compromised:

1. Immediately generate a new key
2. Update the environment variable
3. Re-encrypt all tokens as quickly as possible
4. Rotate any other secrets that may have been exposed
5. Conduct a security audit to determine the breach scope
6. Notify stakeholders according to your incident response plan

## Best Practices

1. **Never commit keys to version control**: Store keys in secret management systems (AWS Secrets Manager, Azure Key Vault, etc.)

2. **Use different keys per environment**: Development, staging, and production should have different keys

3. **Rotate during low-traffic periods**: Rotate keys during maintenance windows to minimize disruption

4. **Back up before rotation**: Always backup your database before running the rotation script

5. **Test in staging first**: Always test the rotation procedure in a non-production environment

6. **Document rotations**: Keep a log of when keys were rotated for audit purposes

7. **Monitor for errors**: After rotation, monitor application logs for decryption failures

8. **Automate where possible**: Consider automating key rotation with your CI/CD pipeline or secret management system

## Key Storage Recommendations

### Development Environment
```bash
# .env file (gitignored)
TOKEN_ENCRYPTION_KEY=<your_dev_key>
```

### Staging Environment
Use environment-specific secret management or encrypted configuration files.

### Production Environment
Use a proper secret management system:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault
- Kubernetes Secrets (with RBAC)

## Troubleshooting

### "Decryption failed" errors after rotation

**Cause**: Tokens not successfully re-encrypted with new key

**Solution**:
1. Check the rotation script logs
2. Verify database was successfully updated
3. You may need to restore from backup and retry rotation

### Migration script fails partway through

**Cause**: Database connection issue or token corruption

**Solution**:
1. The script is designed to continue on individual token failures
2. Check logs for failed token IDs
3. Manually investigate and fix problematic tokens
4. Re-run the migration if needed

### Can't decrypt tokens after deployment

**Cause**: New key not properly deployed to all instances

**Solution**:
1. Verify environment variable is set on all instances
2. Restart affected services
3. Check secret management system replication

## Additional Resources

- [Cryptography Documentation](https://cryptography.io/en/latest/)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
