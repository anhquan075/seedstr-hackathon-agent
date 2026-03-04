import { EventEmitter } from 'events';
import type { AgentEventMap, TypedEventEmitter } from '../types.js';

/**
 * Typed event bus wrapping Node EventEmitter
 * Provides compile-time type safety for all events via AgentEventMap
 * 
 * Usage:
 *   const bus = new EventBus();
 *   bus.emit('job_completed', { id: '123', output: 'result', ... });
 *   bus.on('job_completed', (data) => {
 *     console.log(data.id); // TypeScript knows id is a string
 *   });
 */
export class EventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Prevent memory warnings for high listener counts (polling + pipeline stages)
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit a typed event with full type safety
   * @param event - Event key from AgentEventMap
   * @param data - Event payload matching the key's type
   */
  emit<K extends keyof AgentEventMap>(event: K, data: AgentEventMap[K]): void {
    this.emitter.emit(String(event), data);
  }

  /**
   * Subscribe to a typed event
   * @param event - Event key from AgentEventMap
   * @param listener - Callback receiving data of the correct type
   * @returns Unsubscribe function (call to remove listener)
   */
  on<K extends keyof AgentEventMap>(
    event: K,
    listener: (data: AgentEventMap[K]) => void
  ): () => void {
    this.emitter.on(String(event), listener);
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Remove a listener
   * @param event - Event key from AgentEventMap
   * @param listener - The callback to remove
   */
  off<K extends keyof AgentEventMap>(
    event: K,
    listener: (data: AgentEventMap[K]) => void
  ): void {
    this.emitter.off(String(event), listener);
  }

  /**
   * Subscribe once and auto-unsubscribe
   * @param event - Event key from AgentEventMap
   * @param listener - Callback receiving data of the correct type
   * @returns Unsubscribe function
   */
  once<K extends keyof AgentEventMap>(
    event: K,
    listener: (data: AgentEventMap[K]) => void
  ): () => void {
    this.emitter.once(String(event), listener);
    return () => this.off(event, listener);
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount<K extends keyof AgentEventMap>(event: K): number {
    return this.emitter.listenerCount(String(event));
  }

  /**
   * Clear all listeners (useful for testing or shutdown)
   */
  /**
   * Clear listeners for a specific event (or all events if not specified)
   * @param event - Optional event key from AgentEventMap. If not provided, clears all listeners.
   */
  removeAllListeners<K extends keyof AgentEventMap>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(String(event));
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof AgentEventMap)[] {
    return this.emitter.eventNames() as (keyof AgentEventMap)[];
  }
}

export default EventBus;
