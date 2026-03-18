import { describe, it, expect } from 'vitest';
import type { WsMessage } from '../shared/types.js';

/**
 * These tests verify that the WsMessage discriminated union type
 * correctly models expected message shapes and that serialization
 * round-trips work for each variant.
 */
describe('WsMessage serialization', () => {
  function roundTrip(msg: WsMessage): WsMessage {
    return JSON.parse(JSON.stringify(msg));
  }

  it('should round-trip terminal data message', () => {
    const msg: WsMessage = {
      channel: 'terminal:session-1',
      type: 'data',
      data: 'hello world\r\n',
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    expect(result.channel).toBe('terminal:session-1');
    expect(result.type).toBe('data');
  });

  it('should round-trip terminal input message', () => {
    const msg: WsMessage = {
      channel: 'terminal:session-2',
      type: 'input',
      data: 'ls -la\n',
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    expect(result.type).toBe('input');
  });

  it('should round-trip terminal resize message', () => {
    const msg: WsMessage = {
      channel: 'terminal:session-1',
      type: 'resize',
      cols: 120,
      rows: 40,
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    expect(result.type).toBe('resize');
    // Type narrowing: after checking type, cols/rows should be accessible
    if (result.type === 'resize' && result.channel.startsWith('terminal:')) {
      expect(result.cols).toBe(120);
      expect(result.rows).toBe(40);
    }
  });

  it('should round-trip terminal exit message', () => {
    const msg: WsMessage = {
      channel: 'terminal:session-1',
      type: 'exit',
      code: 0,
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    if (result.type === 'exit' && result.channel.startsWith('terminal:')) {
      expect(result.code).toBe(0);
    }
  });

  it('should round-trip watcher update message', () => {
    const msg: WsMessage = {
      channel: 'watcher:docs',
      type: 'update',
      data: { deliverables: [{ id: 'D1', status: 'complete' }] },
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    expect(result.channel).toBe('watcher:docs');
    expect(result.type).toBe('update');
  });

  it('should round-trip system subscribe message', () => {
    const msg: WsMessage = {
      channel: 'system',
      type: 'subscribe',
      channels: ['terminal:session-1', 'watcher:docs'],
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
    if (result.type === 'subscribe' && result.channel === 'system') {
      expect(result.channels).toEqual(['terminal:session-1', 'watcher:docs']);
    }
  });

  it('should round-trip system ping message', () => {
    const msg: WsMessage = {
      channel: 'system',
      type: 'ping',
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
  });

  it('should round-trip system pong message', () => {
    const msg: WsMessage = {
      channel: 'system',
      type: 'pong',
    };
    const result = roundTrip(msg);
    expect(result).toEqual(msg);
  });

  describe('message type discrimination', () => {
    it('should distinguish messages by type field', () => {
      const messages: WsMessage[] = [
        { channel: 'terminal:s1', type: 'data', data: 'output' },
        { channel: 'terminal:s1', type: 'input', data: 'cmd' },
        { channel: 'terminal:s1', type: 'resize', cols: 80, rows: 24 },
        { channel: 'terminal:s1', type: 'exit', code: 1 },
        { channel: 'watcher:docs', type: 'update', data: {} },
        { channel: 'system', type: 'subscribe', channels: [] },
        { channel: 'system', type: 'ping' },
        { channel: 'system', type: 'pong' },
      ];

      const types = messages.map((m) => m.type);
      expect(types).toEqual(['data', 'input', 'resize', 'exit', 'update', 'subscribe', 'ping', 'pong']);
    });

    it('should handle exit code of non-zero', () => {
      const msg: WsMessage = {
        channel: 'terminal:session-1',
        type: 'exit',
        code: 137,
      };
      expect(msg.code).toBe(137);
    });
  });
});
