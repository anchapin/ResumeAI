/**
 * Type-safe mock builders for common patterns
 * Reduces boilerplate for setting up test doubles
 */

import { vi, Mock } from 'vitest';

/**
 * Builder for creating mock API client instances
 * @example
 * const mockClient = apiClientBuilder()
 *   .withFetch(mockFetch)
 *   .withRetry(mockRetry)
 *   .build();
 */
export class ApiClientMockBuilder {
  private mocks: Record<string, Mock> = {};

  withMethod<T extends (...args: any[]) => any>(name: string, impl?: T): this {
    this.mocks[name] = vi.fn(impl);
    return this;
  }

  withResolvedMethod<T extends (...args: any[]) => any>(
    name: string,
    value: Awaited<ReturnType<T>>,
  ): this {
    const mock = vi.fn<Parameters<T>, Promise<Awaited<ReturnType<T>>>>();
    mock.mockResolvedValue(value);
    this.mocks[name] = mock;
    return this;
  }

  withRejectedMethod<T extends (...args: any[]) => any>(
    name: string,
    error: Error,
  ): this {
    const mock = vi.fn<Parameters<T>, Promise<never>>();
    mock.mockRejectedValue(error);
    this.mocks[name] = mock;
    return this;
  }

  build(): Record<string, Mock> {
    return this.mocks;
  }

  reset(): this {
    Object.values(this.mocks).forEach(mock => mock.mockClear());
    return this;
  }
}

/**
 * Builder for creating mock React component props
 * @example
 * const props = propsBuilder<MyComponentProps>()
 *   .withCallback('onSubmit', vi.fn())
 *   .withValue('title', 'Test')
 *   .build();
 */
export class PropsMockBuilder<T> {
  private props: Partial<T> = {};

  withValue<K extends keyof T>(key: K, value: T[K]): this {
    this.props[key] = value;
    return this;
  }

  withCallback<K extends keyof T>(key: K, cb: T[K]): this {
    this.props[key] = cb;
    return this;
  }

  build(): Partial<T> {
    return this.props;
  }
}

/**
 * Builder for HTTP response mocks
 * @example
 * const response = responseBuilder()
 *   .status(200)
 *   .json({ data: {...} })
 *   .build();
 */
export class ResponseMockBuilder {
  private response: Partial<Response> = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  };

  status(code: number): this {
    this.response.status = code;
    this.response.ok = code >= 200 && code < 300;
    return this;
  }

  json<T>(data: T): this {
    this.response.json = vi.fn().mockResolvedValue(data);
    return this;
  }

  text(text: string): this {
    this.response.text = vi.fn().mockResolvedValue(text);
    return this;
  }

  header(key: string, value: string): this {
    (this.response.headers as Headers).set(key, value);
    return this;
  }

  build(): Partial<Response> {
    return this.response;
  }
}

/**
 * Builder for error scenarios
 * @example
 * const errorMock = errorBuilder()
 *   .withStatus('timeout')
 *   .withMessage('Request timed out')
 *   .build();
 */
export class ErrorMockBuilder {
  private error: Record<string, any> = {
    code: 'ERROR',
    message: 'An error occurred',
  };

  withStatus(status: string): this {
    this.error.status = status;
    return this;
  }

  withMessage(message: string): this {
    this.error.message = message;
    return this;
  }

  withCode(code: string): this {
    this.error.code = code;
    return this;
  }

  withDetails<T>(details: T): this {
    this.error.details = details;
    return this;
  }

  build(): typeof this.error {
    return this.error;
  }

  buildAsError(): Error {
    const err = new Error(this.error.message);
    Object.assign(err, this.error);
    return err;
  }
}

/**
 * Factory for creating API mock builders
 */
export const apiClientBuilder = () => new ApiClientMockBuilder();

/**
 * Factory for creating props mock builders
 */
export const propsBuilder = <T>() => new PropsMockBuilder<T>();

/**
 * Factory for creating response mock builders
 */
export const responseBuilder = () => new ResponseMockBuilder();

/**
 * Factory for creating error mock builders
 */
export const errorBuilder = () => new ErrorMockBuilder();
