import { test, expect } from '@playwright/test';
import path from 'path';
import { ChatPage } from '../pages/ChatPage';

/**
 * Test suite: Video Analysis — Generate User Stories via Chat
 *
 * Covers the flow observed in the recorded session:
 *   1. User opens the chat and asks "What can you do with videos?"
 *   2. AI responds with a set of capability options
 *   3. User selects "Generate user stories"
 *   4. User uploads a video and sends it with context text
 *   5. AI responds with generated user stories (US-001 … US-003)
 */
test.describe('Chat — Video Analysis: Generate User Stories', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
  });

  test('should display video capability options when asked', async () => {
    // Ask the AI what it can do with videos
    await chatPage.sendMessage('What can you do with videos?');
    await chatPage.waitForResponse();

    // Expect the reply to mention key capabilities
    await chatPage.expectResponseToContain('Generate user stories');
    await chatPage.expectResponseToContain('Describe the flow');
  });

  test('should generate user stories after uploading a video', async ({ page }) => {
    // Step 1 — Ask about video capabilities
    await chatPage.sendMessage('What can you do with videos?');
    await chatPage.waitForResponse();

    // Step 2 — Select the "Generate user stories" option from the AI response
    await chatPage.clickOption('Generate user stories');
    await chatPage.waitForResponse();

    // Step 3 — Upload a video file and send it with context text
    // Replace the path below with a real fixture video before running locally.
    const videoFixturePath = path.resolve(__dirname, '../fixtures/sample-video.mp4');
    await chatPage.attachFileAndSend(videoFixturePath, 'Use this video:');

    // Step 4 — Wait for the AI to process and respond
    await chatPage.waitForResponse();

    // Step 5 — Verify user stories are present in the AI response
    // The AI is expected to produce at least US-001 in its output
    await chatPage.expectResponseToContain('US-001');

    // Verify the response contains recognisable user story content
    const lastMessage = chatPage.lastAssistantMessage;
    await expect(lastMessage).toContainText(/US-00[123]/);
  });

  test('should show an AI response after uploading a video directly', async ({ page }) => {
    // Edge-case: user uploads a video without going through the options flow first.
    // The AI should still respond meaningfully rather than error out.
    const videoFixturePath = path.resolve(__dirname, '../fixtures/sample-video.mp4');
    await chatPage.attachFileAndSend(videoFixturePath, 'Use this video:');
    await chatPage.waitForResponse();

    // The assistant should produce a non-empty reply
    await expect(chatPage.lastAssistantMessage).not.toBeEmpty();
  });
});
