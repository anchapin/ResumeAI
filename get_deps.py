from importlib.metadata import requires
print("fastapi 0.136.0 requires:")
for req in requires('fastapi'):
    if 'starlette' in req:
        print(req)
print("\nprometheus-fastapi-instrumentator 7.1.0 requires:")
for req in requires('prometheus-fastapi-instrumentator'):
    if 'starlette' in req:
        print(req)
