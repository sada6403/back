const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

require('dotenv').config();

const USERNAME = process.env.MOBITEL_USER || '52785842';
const PASSWORD = process.env.MOBITEL_PASSWORD || 'Jk8qBwGf';

/**
 * Automates the Mobitel Web Portal to send SMS
 * @param {string[]} numbers - Array of phone numbers
 * @param {string} message - SMS content
 */
async function sendBulkMessages(numbers, message) {
    console.log(`[Puppet] Launching browser (ASSISTED MODE) to send SMS to ${numbers.length} numbers...`);

    // Launch options for LOCAL ASSISTED mode
    const browser = await puppeteer.launch({
        headless: false, // Visible browser for manual intervention
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,1024'
        ]
    });

    try {
        const page = await browser.newPage();

        // 1. Navigate to Login
        console.log('[Puppet] Navigating to Login...');
        await page.goto('https://msmsenterprise.mobitel.lk/index.php/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 2. Attempt Auto-fill (Helper only)
        try {
            await page.waitForSelector('#txt_username', { timeout: 5000 });
            await page.type('#txt_username', USERNAME);
            await page.type('#txt_password', PASSWORD);
            console.log('[Puppet] Credentials auto-filled.');

            // Try clicking login once
            const btn = await page.$('#login_button');
            if (btn) {
                console.log('[Puppet] Attempting auto-click on Login...');
                await btn.click();
            }
        } catch (e) {
            console.log('[Puppet] Auto-fill skipped. Please login manually.');
        }

        // 3. WAIT FOR USER TO LOGIN (5 Minutes Timeout)
        console.log('[Puppet] WAITING FOR USER LOGIN... (You have 5 minutes)');
        console.log('[Puppet] Please solve CAPTCHA, enter OTP, or handle any errors manually in the browser window.');

        // Wait until we see the "Send Message" functionality
        const loggedIn = await page.waitForFunction(
            () => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors.some(a =>
                    a.textContent.toLowerCase().includes('send message') ||
                    a.textContent.toLowerCase().includes('compose') ||
                    a.href.includes('sendsms') ||
                    a.href.includes('send_message')
                );
            },
            { timeout: 300000 } // 5 Minutes
        );

        if (!loggedIn) throw new Error('Login timed out after 5 minutes.');
        console.log('[Puppet] Login Detected! Proceeding to send messages...');

        // 4. Find "Send message" link
        const sendLink = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            const target = anchors.find(a =>
                a.textContent.toLowerCase().includes('send message') ||
                a.textContent.toLowerCase().includes('compose') ||
                a.href.includes('sendsms') ||
                a.href.includes('send_message')
            );
            return target ? target.href : null;
        });

        if (!sendLink) throw new Error('Dashboard found but Send Message link missing.');

        console.log(`[Puppet] Navigating to Send Page: ${sendLink}`);
        await page.goto(sendLink, { waitUntil: 'domcontentloaded' });

        // 5. Fill Form
        const numberInput = await page.$x("//textarea[preceding::label[contains(., 'Mobile')]] | //input[contains(@name, 'mobile')] | //*[@id='txt_mobile_no']");
        const msgInput = await page.$x("//textarea[preceding::label[contains(., 'Message')]] | //textarea[contains(@name, 'message')] | //*[@id='txt_message']");
        const sendBtn = await page.$x("//button[contains(., 'Send')] | //input[@value='Send'] | //a[contains(., 'Send')]");

        if (numberInput.length === 0) throw new Error('Could not find Mobile Number input field');
        if (msgInput.length === 0) throw new Error('Could not find Message input field');
        if (sendBtn.length === 0) throw new Error('Could not find Send button');

        console.log('[Puppet] Filling Form...');
        await numberInput[0].type(numbers.join(','));
        await msgInput[0].type(message);

        // 6. Submit
        console.log('[Puppet] Submitting...');

        // Handle confirmation dialogs
        page.on('dialog', async dialog => {
            console.log('[Puppet] Dismissing dialog:', dialog.message());
            await dialog.accept();
        });

        await Promise.all([
            new Promise(r => setTimeout(r, 5000)),
            sendBtn[0].click()
        ]);

        console.log('[Puppet] Message Sent! Keeping browser open for a few seconds...');
        await new Promise(r => setTimeout(r, 5000));

        return { success: numbers.length, failed: 0, details: [] };

    } catch (e) {
        console.error('[Puppet Error]', e.message);
        return {
            success: 0,
            failed: numbers.length,
            details: numbers.map(n => ({ number: n, status: 'failed', error: e.message }))
        };
    } finally {
        await browser.close();
    }
}

module.exports = { sendBulkMessages };
