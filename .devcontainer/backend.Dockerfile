{
  "name": "ResumeAI Backend (Python/FastAPI)",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/node:20": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.black-formatter",
        "ms-python.flake8",
        "ms-azuretools.vscode-docker",
        "ms-vscode.vscode-typescript-next",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "python.linting.enabled": true,
        "python.linting.flake8Enabled": true,
        "python.formatting.provider": "black",
        "python.testing.pytestEnabled": true,
        "python.testing.pytestArgs": ["."],
        "editor.defaultFormatter": "ms-python.black-formatter",
        "editor.formatOnSave": true,
        "files.exclude": {
          "**/__pycache__": true,
          "**/.pytest_cache": true,
          "**/node_modules": true
        }
      }
    }
  },
  "postCreateCommand": "cd resume-api && pip install -r requirements.txt",
  "portsAttributes": {
    "8000": {
      "label": "FastAPI Backend",
      "onAutoForward": "notify"
    }
  },
  "remoteUser": "vscode",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/${localWorkspaceFolderBasename},type=bind"
}
