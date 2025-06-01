type EscapeHandler = () => void;

interface EscapeRegistration {
  id: string;
  zIndex: number;
  handler: EscapeHandler;
}

class EscapeManager {
  private registrations: EscapeRegistration[] = [];
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  register(id: string, zIndex: number, handler: EscapeHandler): () => void {
    this.unregister(id);

    this.registrations.push({ id, zIndex, handler });

    if (this.registrations.length === 1) {
      this.keydownListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.handleEscape();
        }
      };
      document.addEventListener('keydown', this.keydownListener);
    }

    // Return unregister function
    return () => this.unregister(id);
  }

  unregister(id: string): void {
    this.registrations = this.registrations.filter((reg) => reg.id !== id);

    if (this.registrations.length === 0 && this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
  }

  private handleEscape(): void {
    if (this.registrations.length === 0) return;

    const topmost = this.registrations.reduce((prev, current) => {
      return current.zIndex > prev.zIndex ? current : prev;
    });

    topmost.handler();
  }
}

// Create a singleton instance
export const escapeManager = new EscapeManager();
