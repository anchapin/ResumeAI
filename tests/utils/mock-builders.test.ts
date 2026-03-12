/**
 * Tests for type-safe mock builders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiClientBuilder,
  propsBuilder,
  responseBuilder,
  errorBuilder,
} from '../../utils/test-utils/mock-builders';

describe('Mock Builders', () => {
  describe('ApiClientMockBuilder', () => {
    it('builds API client with methods', () => {
      const client = apiClientBuilder()
        .withMethod('fetch')
        .withMethod('post')
        .build();

      expect(client.fetch).toBeDefined();
      expect(client.post).toBeDefined();
      expect(vi.isMockFunction(client.fetch)).toBe(true);
    });

    it('builds with resolved methods', async () => {
      const responseData = { id: 1, name: 'Test' };
      const client = apiClientBuilder()
        .withResolvedMethod<() => Promise<typeof responseData>>('getData', responseData)
        .build();

      const result = await client.getData?.();
      expect(result).toEqual(responseData);
    });

    it('builds with rejected methods', async () => {
      const error = new Error('API Error');
      const client = apiClientBuilder()
        .withRejectedMethod<() => Promise<never>>('failMethod', error)
        .build();

      await expect(client.failMethod?.()).rejects.toThrow('API Error');
    });

    it('allows method chaining', () => {
      const client = apiClientBuilder()
        .withMethod('method1')
        .withMethod('method2')
        .withResolvedMethod<() => Promise<string>>('method3', 'data')
        .build();

      expect(Object.keys(client)).toHaveLength(3);
    });

    it('resets all mocks when reset called', async () => {
      const builder = apiClientBuilder()
        .withResolvedMethod<() => Promise<string>>('getData', 'data');

      const client1 = builder.build();
      await client1.getData?.();
      expect(client1.getData).toHaveBeenCalledTimes(1);

      builder.reset();
      const client2 = builder.build();
      expect(client2.getData).toHaveBeenCalledTimes(0);
    });
  });

  describe('PropsMockBuilder', () => {
    interface ComponentProps {
      title: string;
      count: number;
      onSubmit: (data: string) => void;
      onCancel?: () => void;
    }

    it('builds props with values', () => {
      const props = propsBuilder<ComponentProps>()
        .withValue('title', 'Test Title')
        .withValue('count', 42)
        .build();

      expect(props.title).toBe('Test Title');
      expect(props.count).toBe(42);
    });

    it('builds props with callbacks', () => {
      const onSubmit = vi.fn();
      const props = propsBuilder<ComponentProps>()
        .withCallback('onSubmit', onSubmit)
        .build();

      expect(props.onSubmit).toBe(onSubmit);
      props.onSubmit?.('test');
      expect(onSubmit).toHaveBeenCalledWith('test');
    });

    it('allows mixing values and callbacks', () => {
      const mockFn = vi.fn();
      const props = propsBuilder<ComponentProps>()
        .withValue('title', 'Title')
        .withValue('count', 10)
        .withCallback('onSubmit', mockFn)
        .build();

      expect(props.title).toBe('Title');
      expect(props.count).toBe(10);
      expect(vi.isMockFunction(props.onSubmit)).toBe(true);
    });
  });

  describe('ResponseMockBuilder', () => {
    it('builds basic successful response', () => {
      const response = responseBuilder().build();

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
    });

    it('builds response with custom status', () => {
      const response = responseBuilder()
        .status(404)
        .build();

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('builds response with JSON data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = responseBuilder()
        .json(data)
        .build();

      const result = await response.json?.();
      expect(result).toEqual(data);
    });

    it('builds response with text', async () => {
      const text = 'Response text';
      const response = responseBuilder()
        .text(text)
        .build();

      const result = await response.text?.();
      expect(result).toBe(text);
    });

    it('builds response with headers', () => {
      const response = responseBuilder()
        .header('Content-Type', 'application/json')
        .header('Authorization', 'Bearer token')
        .build();

      expect(response.headers?.get('Content-Type')).toBe('application/json');
      expect(response.headers?.get('Authorization')).toBe('Bearer token');
    });

    it('allows method chaining', async () => {
      const data = { success: true };
      const response = responseBuilder()
        .status(201)
        .json(data)
        .header('Location', '/resource/1')
        .build();

      expect(response.status).toBe(201);
      expect(await response.json?.()).toEqual(data);
      expect(response.headers?.get('Location')).toBe('/resource/1');
    });
  });

  describe('ErrorMockBuilder', () => {
    it('builds basic error object', () => {
      const error = errorBuilder().build();

      expect(error.code).toBe('ERROR');
      expect(error.message).toBe('An error occurred');
    });

    it('builds error with custom status', () => {
      const error = errorBuilder()
        .withStatus('timeout')
        .build();

      expect(error.status).toBe('timeout');
    });

    it('builds error with custom message', () => {
      const error = errorBuilder()
        .withMessage('Custom error message')
        .build();

      expect(error.message).toBe('Custom error message');
    });

    it('builds error with code', () => {
      const error = errorBuilder()
        .withCode('CUSTOM_ERROR')
        .build();

      expect(error.code).toBe('CUSTOM_ERROR');
    });

    it('builds error with details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = errorBuilder()
        .withDetails(details)
        .build();

      expect(error.details).toEqual(details);
    });

    it('converts to Error instance', () => {
      const error = errorBuilder()
        .withMessage('Test error')
        .buildAsError();

      expect(error instanceof Error).toBe(true);
      expect(error.message).toBe('Test error');
    });

    it('allows method chaining', () => {
      const details = { reason: 'network' };
      const error = errorBuilder()
        .withStatus('failed')
        .withCode('NETWORK_ERROR')
        .withMessage('Network request failed')
        .withDetails(details)
        .build();

      expect(error.status).toBe('failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network request failed');
      expect(error.details).toEqual(details);
    });
  });
});
