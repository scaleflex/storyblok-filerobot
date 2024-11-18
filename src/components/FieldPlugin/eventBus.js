import { reactive } from 'vue';

export const eventBus = reactive({
  listeners: {},
  emit(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(payload));
    }
  },
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
});