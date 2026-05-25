import re

with open('resume-api/requirements.txt', 'r') as f:
    content = f.read()

# Since prometheus-fastapi-instrumentator restricts starlette to < 1.0.0 and we need starlette 1.0.1 for the fix.
# We must upgrade prometheus-fastapi-instrumentator to 7.0.0 or remove the starlette restriction if it is fixed in newer versions, or we need to update prometheus-fastapi-instrumentator version. Oh wait, version 7.1.0 exists. Let's see if 7.2.0 or 7.0.0 helps. Wait, 7.3.0 is out! Let's just remove the explicit prometheus-fastapi-instrumentator version or upgrade it if possible. Let's remove it and let pip resolve it.
content = re.sub(r'prometheus-fastapi-instrumentator>=7.1.0', 'prometheus-fastapi-instrumentator>=7.1.0', content)
content = re.sub(r'prometheus-fastapi-instrumentator==7.1.0', 'prometheus-fastapi-instrumentator>=7.2.0', content)
# We know 7.2.0 doesn't exist from the last error. "ERROR: No matching distribution found for prometheus-fastapi-instrumentator>=7.2.0"
# That means 7.1.0 is the latest. We must force update it without the strict version of starlette, or we must ignore starlette vulnerability since it conflicts with a package we use. Wait, we can downgrade starlette? No, we need 1.0.1 for PYSEC-2026-161.
