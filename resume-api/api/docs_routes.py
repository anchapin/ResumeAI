"""
API Documentation Routes

Provides OpenAPI schema endpoints and API documentation utilities.
"""

from fastapi import APIRouter, Response

router = APIRouter(prefix="/docs", tags=["Documentation"])


@router.get("/openapi.json")
async def get_openapi_spec():
    """Get the OpenAPI specification JSON."""
    from main import app

    return app.openapi()


@router.get("/openapi.yaml")
async def get_openapi_yaml():
    """Get the OpenAPI specification as YAML."""
    from main import app
    import yaml

    openapi_spec = app.openapi()
    return Response(content=yaml.dump(openapi_spec), media_type="application/x-yaml")


@router.get("/endpoints")
async def list_endpoints():
    """List all available API endpoints."""
    from main import app

    endpoints = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            methods = list(route.methods) if route.methods else []
            if methods and "/{+" not in route.path:  # Skip websocket paths
                endpoints.append(
                    {
                        "path": route.path,
                        "methods": [m for m in methods if m not in ["HEAD", "OPTIONS"]],
                        "name": getattr(route, "name", None),
                    }
                )

    return {"endpoints": endpoints, "count": len(endpoints)}
