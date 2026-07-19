export interface StreamInputController {
  start(content: string, onChunk: (value: string) => void): void;
  stop(): void;
  readonly running: boolean;
}

export function createStreamInputController(intervalMs = 18): StreamInputController {
  let timer: ReturnType<typeof setInterval> | undefined;
  let isRunning = false;

  const controller: StreamInputController = {
    get running() {
      return isRunning;
    },
    start(content, onChunk) {
      controller.stop();
      let cursor = 0;
      isRunning = true;
      onChunk('');
      timer = setInterval(() => {
        cursor = Math.min(
          content.length,
          cursor + Math.max(1, Math.ceil(content.length / 160))
        );
        onChunk(content.slice(0, cursor));
        if (cursor >= content.length) controller.stop();
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
      isRunning = false;
    }
  };

  return controller;
}
