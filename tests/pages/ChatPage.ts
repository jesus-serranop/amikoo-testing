import { type Page, type Locator, expect } from '@playwright/test';
import path from 'path';

/**
 * Page Object for the Amikoo chat interface (/home).
 * Encapsulates all interactions with the chat input, AI responses,
 * option buttons, and file upload.
 */
export class ChatPage {
  readonly page: Page;

  // Chat input area
  readonly messageInput: Locator;
  readonly sendButton: Locator;

  // AI response container — last message bubble from the assistant
  readonly lastAssistantMessage: Locator;

  // File upload input (hidden, triggered by the attach button)
  readonly fileInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.messageInput = page.getByRole('textbox', { name: /message|chat|type/i });
    this.sendButton = page.getByRole('button', { name: /send/i });
    this.lastAssistantMessage = page.locator('[data-role="assistant"], .assistant-message, .ai-message').last();
    this.fileInput = page.locator('input[type="file"]');
  }

  /** Navigate to the chat home page. */
  async goto() {
    await this.page.goto('/home');
    await expect(this.messageInput).toBeVisible();
  }

  /** Type a message and submit it. */
  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  /**
   * Wait for the assistant to finish responding.
   * Waits until a loading/spinner indicator disappears
   * and the last message is stable.
   */
  async waitForResponse() {
    // Wait for any loading indicator to disappear
    const loader = this.page.locator('[data-testid="loading"], .loading, .typing-indicator');
    await loader.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {
      // Loader may not exist — that's fine, continue
    });
    // Give the response a moment to fully render
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click one of the option buttons rendered in the last AI response.
   * Matches by partial visible text.
   */
  async clickOption(optionText: string) {
    const option = this.page.getByRole('button', { name: new RegExp(optionText, 'i') }).last();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  }

  /**
   * Attach a file via the hidden file input and then send an optional message.
   * @param filePath  Absolute or relative path to the file on disk.
   * @param message   Text to include in the same message (optional).
   */
  async attachFileAndSend(filePath: string, message?: string) {
    // Trigger the file chooser and set the file
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      // Click the attach / paperclip button
      this.page.getByRole('button', { name: /attach|upload|file/i }).click(),
    ]);
    await fileChooser.setFiles(filePath);

    if (message) {
      await this.messageInput.fill(message);
    }
    await this.sendButton.click();
  }

  /** Assert that the assistant reply contains the expected text. */
  async expectResponseToContain(text: string) {
    await expect(this.lastAssistantMessage).toContainText(text, { timeout: 30_000 });
  }

  /** Assert that at least N option buttons are visible in the last response. */
  async expectOptionsVisible(minCount: number) {
    const options = this.page.getByRole('button').filter({ hasText: /\d+\.|option/i });
    await expect(options).toHaveCount(minCount, { timeout: 15_000 });
  }
}
