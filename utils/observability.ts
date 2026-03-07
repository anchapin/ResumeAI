/**
 * Deployment Observability Infrastructure
 * Tracks deployment status, health, and runtime metrics
 */

/**
 * Deployment environment types
 */
export type DeploymentEnvironment = 'development' | 'staging' | 'production';

/**
 * Service status
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Runtime information
 */
export interface RuntimeInfo {
  environment: DeploymentEnvironment;
  version: string;
  startTime: string;
  uptime: number; // seconds
  nodeVersion?: string;
  region?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: ServiceStatus;
  checks: {
    [key: string]: {
      status: ServiceStatus;
      message?: string;
      latency?: number; // milliseconds
      timestamp: string;
    };
  };
  timestamp: string;
  version: string;
  environment: DeploymentEnvironment;
}

/**
 * Metrics data point
 */
export interface MetricDataPoint {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

/**
 * Deployment observability configuration
 */
export interface ObservabilityConfig {
  enabled: boolean;
  environment: DeploymentEnvironment;
  version: string;
  region?: string;
  healthCheckEndpoint: string;
  metricsEndpoint: string;
}

/**
 * Get environment from various sources
 */
function getEnvironment(): DeploymentEnvironment {
  // Check Vite env
  if (import.meta?.env?.MODE) {
    const mode = import.meta.env.MODE.toLowerCase();
    if (mode.includes('prod')) return 'production';
    if (mode.includes('staging') || mode.includes('stage')) return 'staging';
    if (mode.includes('dev')) return 'development';
  }

  // Check Node env
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV.toLowerCase();
    if (nodeEnv.includes('prod')) return 'production';
    if (nodeEnv.includes('staging') || nodeEnv.includes('stage')) return 'staging';
    if (nodeEnv.includes('dev')) return 'development';
  }

  // Default to development
  return 'development';
}

/**
 * Get app version
 */
function getVersion(): string {
  if (import.meta?.env?.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION;
  }
  return '0.0.0';
}

/**
 * Default configuration
 */
const defaultConfig: ObservabilityConfig = {
  enabled: true,
  environment: getEnvironment(),
  version: getVersion(),
  healthCheckEndpoint: '/api/v1/health',
  metricsEndpoint: '/api/v1/metrics',
};

/**
 * Deployment Observability class
 */
class DeploymentObservability {
  private config: ObservabilityConfig;
  private startTime: Date;
  private customChecks: Map<string, () => Promise<{ status: ServiceStatus; message?: string }>> = new Map();

  constructor(config: Partial<ObservabilityConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startTime = new Date();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ObservabilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register a custom health check
   */
  public registerHealthCheck(name: string, check: () => Promise<{ status: ServiceStatus; message?: string }>): void {
    this.customChecks.set(name, check);
  }

  /**
   * Get runtime information
   */
  public getRuntimeInfo(): RuntimeInfo {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    return {
      environment: this.config.environment,
      version: this.config.version,
      startTime: this.startTime.toISOString(),
      uptime,
      nodeVersion: typeof navigator !== 'undefined' ? undefined : process.version,
      region: this.config.region,
    };
  }

  /**
   * Perform health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    const timestamp = new Date().toISOString();

    // Run custom checks
    for (const [name, checkFn] of this.customChecks.entries()) {
      const startTime = Date.now();
      try {
        const result = await checkFn();
        checks[name] = {
          status: result.status,
          message: result.message,
          latency: Date.now() - startTime,
          timestamp,
        };
      } catch (error) {
        checks[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          latency: Date.now() - startTime,
          timestamp,
        };
      }
    }

    // Determine overall status
    let overallStatus: ServiceStatus = 'healthy';

    for (const check of Object.values(checks)) {
      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy';
        break;
      }
      if (check.status === 'degraded') {
        overallStatus = 'degraded';
      }
    }

    // If no custom checks, default to healthy
    if (Object.keys(checks).length === 0) {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      checks,
      timestamp,
      version: this.config.version,
      environment: this.config.environment,
    };
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if running in staging
   */
  public isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Get deployment info for error reporting
   */
  public getDeploymentInfo(): Record<string, unknown> {
    return {
      environment: this.config.environment,
      version: this.config.version,
      region: this.config.region,
      timestamp: new Date().toISOString(),
      runtime: this.getRuntimeInfo(),
    };
  }

  /**
   * Log deployment event
   */
  public logDeployment(event: 'deploy' | 'rollback' | 'config_change', metadata?: Record<string, unknown>): void {
    const deploymentInfo = {
      event,
      ...this.getDeploymentInfo(),
      ...metadata,
    };

    console.log('[Deployment]', JSON.stringify(deploymentInfo));
  }
}

// Export singleton instance
export const observability = new DeploymentObservability();

// Also export class for multiple instances
export { DeploymentObservability };

// Convenience exports
export const getRuntimeInfo = () => observability.getRuntimeInfo();
export const performHealthCheck = () => observability.performHealthCheck();
export const isProduction = () => observability.isProduction();
export const isStaging = () => observability.isStaging();
export const isDevelopment = () => observability.isDevelopment();
