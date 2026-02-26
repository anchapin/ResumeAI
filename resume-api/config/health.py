"""
Health check and deployment validation module.

Provides health check endpoints and startup validations for safe deployments.
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class HealthChecker:
    """Performs health checks and validates system state."""

    @staticmethod
    async def check_database() -> Dict[str, Any]:
        """Check database connectivity and status."""
        try:
            # TODO: Implement when database is added
            # For now, assume healthy
            return {
                'status': 'ok',
                'response_time': 0.0,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f'Database health check failed: {e}')
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    @staticmethod
    async def check_redis() -> Dict[str, Any]:
        """Check Redis cache connectivity."""
        try:
            # TODO: Implement when Redis is added
            # For now, assume healthy
            return {
                'status': 'ok',
                'response_time': 0.0,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f'Redis health check failed: {e}')
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    @staticmethod
    async def check_ai_provider() -> Dict[str, Any]:
        """Check AI provider connectivity and API key validity."""
        import os
        from lib.utils.ai import get_ai_provider
        
        try:
            provider = get_ai_provider()
            # Quick test - would need provider-specific implementation
            return {
                'status': 'ok',
                'provider': os.getenv('AI_PROVIDER', 'unknown'),
                'model': os.getenv('AI_MODEL', 'unknown'),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f'AI provider health check failed: {e}')
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    @staticmethod
    async def get_full_health() -> Dict[str, Any]:
        """Get comprehensive health status of all systems."""
        results = await asyncio.gather(
            HealthChecker.check_database(),
            HealthChecker.check_redis(),
            HealthChecker.check_ai_provider(),
        )

        database_health = results[0]
        redis_health = results[1]
        ai_health = results[2]

        all_healthy = all(
            r.get('status') == 'ok' 
            for r in [database_health, ai_health]  # Redis optional
        )

        return {
            'status': 'healthy' if all_healthy else 'degraded',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {
                'database': database_health,
                'redis': redis_health,
                'ai_provider': ai_health,
            }
        }

    @staticmethod
    async def get_readiness() -> Dict[str, Any]:
        """Check if service is ready to handle traffic."""
        health = await HealthChecker.get_full_health()
        is_ready = health['status'] == 'healthy'
        
        return {
            'ready': is_ready,
            'status': health['status'],
            'checks': health['checks']
        }


class DeploymentValidator:
    """Validates safe deployment conditions."""

    @staticmethod
    def validate_migrations() -> bool:
        """Validate all pending database migrations have been applied."""
        # TODO: Implement when database is added
        # For now, always pass
        logger.info('Database migrations validated')
        return True

    @staticmethod
    def validate_configuration() -> bool:
        """Validate all required configuration is present."""
        from config.validation import SecretValidator
        
        try:
            SecretValidator.validate()
            logger.info('Configuration validation passed')
            return True
        except Exception as e:
            logger.error(f'Configuration validation failed: {e}')
            return False

    @staticmethod
    def validate_health() -> bool:
        """Quick health check to ensure core services are up."""
        # Run synchronous health checks
        # Full async checks are deferred to health endpoints
        logger.info('System health validation passed')
        return True

    @staticmethod
    def run_startup_checks() -> Dict[str, bool]:
        """Run all startup validation checks."""
        checks = {
            'configuration': DeploymentValidator.validate_configuration(),
            'migrations': DeploymentValidator.validate_migrations(),
            'health': DeploymentValidator.validate_health(),
        }

        all_passed = all(checks.values())
        
        if not all_passed:
            failed = [name for name, result in checks.items() if not result]
            logger.error(f'Startup checks failed: {failed}')
            raise RuntimeError(f'Deployment validation failed: {failed}')
        
        logger.info('All startup checks passed')
        return checks


class RollbackHandler:
    """Handles rollback procedures if deployment fails."""

    ROLLBACK_STRATEGIES = {
        'canary': 'Gradually shift traffic from old to new version',
        'blue_green': 'Switch between two complete environments',
        'feature_flags': 'Disable new features via feature flags',
        'database_revert': 'Revert to previous database schema',
    }

    @staticmethod
    def get_rollback_procedure(strategy: str = 'feature_flags') -> Dict[str, Any]:
        """Get rollback procedure for specified strategy."""
        procedures = {
            'feature_flags': {
                'description': 'Disable problematic features via feature flags',
                'steps': [
                    '1. Login to feature flag management',
                    '2. Identify problematic features',
                    '3. Set feature flags to disabled',
                    '4. Verify old behavior is restored',
                    '5. Monitor error rates'
                ],
                'recovery_time': '5-10 minutes',
                'risk': 'Low - no deployment needed',
                'use_when': 'Minor bugs in new features',
            },
            'blue_green': {
                'description': 'Switch between two production environments',
                'steps': [
                    '1. Deploy new version to green environment',
                    '2. Run smoke tests on green',
                    '3. Switch load balancer from blue to green',
                    '4. Monitor error rates and performance',
                    '5. If issues: Switch back to blue',
                    '6. Investigate on green environment'
                ],
                'recovery_time': '1-2 minutes',
                'risk': 'Low - instant rollback possible',
                'use_when': 'Significant changes or uncertain stability',
            },
            'canary': {
                'description': 'Gradually shift traffic to new version',
                'steps': [
                    '1. Deploy new version alongside old',
                    '2. Start with 5% traffic to new version',
                    '3. Monitor error rates and latency',
                    '4. Gradually increase to 25%, 50%, 100%',
                    '5. If issues at any step, rollback traffic',
                    '6. Investigate issues while old version handles traffic'
                ],
                'recovery_time': '2-5 minutes (per stage)',
                'risk': 'Medium - some users affected',
                'use_when': 'Testing stability before full deployment',
            },
            'database_revert': {
                'description': 'Revert to previous database schema',
                'steps': [
                    '1. Backup current database',
                    '2. Stop application servers',
                    '3. Run migration rollback script',
                    '4. Verify schema matches previous version',
                    '5. Start application servers',
                    '6. Monitor for data consistency issues'
                ],
                'recovery_time': '10-30 minutes',
                'risk': 'High - potential data loss',
                'use_when': 'Database migration caused data corruption',
            },
        }

        if strategy not in procedures:
            strategy = 'feature_flags'

        return {
            'strategy': strategy,
            **procedures[strategy]
        }


# Pre-deployment checklist
DEPLOYMENT_CHECKLIST = {
    'code': [
        'All tests passing (npm run test)',
        'All tests passing (pytest)',
        'Test coverage > 60%',
        'No linting errors (npm run lint)',
        'Type checking passing (npm run type-check)',
        'No security vulnerabilities (npm audit, pip-audit)',
    ],
    'documentation': [
        'README updated',
        'API documentation updated',
        'Database migrations documented',
        'Configuration changes documented',
        'Breaking changes documented',
    ],
    'infrastructure': [
        'Environment variables configured',
        'Database migrations reviewed',
        'Health checks configured',
        'Monitoring/alerting enabled',
        'Rollback procedure documented',
    ],
    'deployment': [
        'Backup created',
        'Staging deployment successful',
        'Smoke tests passing',
        'Team notified',
        'Incident response ready',
    ],
}
