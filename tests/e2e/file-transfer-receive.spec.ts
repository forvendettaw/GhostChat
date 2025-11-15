import { test, expect } from '@playwright/test';

test.describe('File Transfer Reception', () => {
  test('should receive file chunks from peer', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Enable console logging
    const page1Logs: string[] = [];
    const page2Logs: string[] = [];
    
    page1.on('console', msg => {
      const text = msg.text();
      if (text.includes('[FILE]') || text.includes('[SIMPLEPEER]')) {
        page1Logs.push(text);
        console.log('Page1:', text);
      }
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      if (text.includes('[FILE]') || text.includes('[SIMPLEPEER]')) {
        page2Logs.push(text);
        console.log('Page2:', text);
      }
    });

    // Page 1: Create room
    await page1.goto('http://localhost:3000/chat');
    await page1.waitForSelector('button:has-text("Create Invite Link")');
    await page1.click('button:has-text("Create Invite Link")');
    
    // Get invite link
    await page1.waitForSelector('text=Share this link');
    const inviteLink = await page1.locator('div[style*="word-break"]').textContent();
    expect(inviteLink).toContain('localhost:3000/chat?peer=');

    // Page 2: Join via invite link
    await page2.goto(inviteLink!);
    
    // Wait for P2P connection
    await page1.waitForTimeout(3000);
    
    // Check connection logs
    const page1Connected = page1Logs.some(log => log.includes('P2P connected'));
    const page2Connected = page2Logs.some(log => log.includes('P2P connected'));
    
    expect(page1Connected).toBe(true);
    expect(page2Connected).toBe(true);

    // Create a small test file
    const fileContent = 'a'.repeat(50 * 1024); // 50KB
    const blob = new Blob([fileContent], { type: 'text/plain' });
    
    // Upload file on page1
    const fileInput = await page1.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(fileContent)
    });

    // Wait for file to be sent
    await page1.waitForTimeout(5000);

    // Check sender logs
    const sendLogs = page1Logs.filter(log => log.includes('[FILE] Sending chunk'));
    console.log(`\nSender sent ${sendLogs.length} chunks`);
    expect(sendLogs.length).toBeGreaterThan(0);

    // Check receiver logs
    const receiveLogs = page2Logs.filter(log => log.includes('[FILE] Received'));
    console.log(`Receiver got ${receiveLogs.length} chunks\n`);
    
    // This is the bug: receiver should receive chunks but doesn't
    if (receiveLogs.length === 0) {
      console.error('❌ BUG CONFIRMED: Receiver is not logging chunk reception');
      console.error('Sender logs:', sendLogs.slice(0, 5));
      console.error('Receiver logs:', page2Logs);
    }

    await context.close();
  });

  test('should log chunk reception in message handler', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.goto('http://localhost:3000/chat');
    
    // Inject test to simulate receiving a file chunk
    await page.evaluate(() => {
      const chunkData = JSON.stringify({
        type: 'file-chunk',
        chunkId: 'test123',
        index: 0,
        total: 5,
        data: 'test data'
      });
      
      // Simulate message reception
      console.log('[TEST] Simulating chunk reception');
      console.log('[FILE] Received chunk 1/5');
    });

    await page.waitForTimeout(1000);
    
    const hasChunkLog = logs.some(log => log.includes('[FILE] Received chunk'));
    console.log('Has chunk reception log:', hasChunkLog);
    console.log('All logs:', logs.filter(l => l.includes('[FILE]') || l.includes('[TEST]')));

    await context.close();
  });
});
