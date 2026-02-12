const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
puppeteer.use(StealthPlugin());

require('dotenv').config();

const USERNAME = process.env.MOBITEL_USER || 'esmsusr_rzpdQuR3';
const PASSWORD = process.env.MOBITEL_PASSWORD || 'Jk8qBwGf';
const ALIAS = process.env.MOBITEL_SENDER_ID || 'NF Groups';

/**
 * Automates the Mobitel Web Portal to send SMS
 * Feature: "Smart Seamless Mode" with robust session-aware navigation.
 */
async function sendBulkMessages(numbers, message) {
    console.log(`[Puppet] Initializing SMS flow for ${numbers.length} recipients...`);

    // Directory ignored by nodemon
    const userDataDir = path.join(__dirname, '..', '.mobitel_session');
    let browser;
    let page;

    try {
        // Mode 1: HEADLESS ATTEMPT
        console.log('[Puppet] Step 1: Checking session (Background)...');
        browser = await puppeteer.launch({
            headless: 'new',
            userDataDir: userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        page = await browser.newPage();

        // Land on Home, not direct Send Message (to avoid 404)
        await page.goto('https://msmsenterprise.mobitel.lk/index.php/home', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise(r => setTimeout(r, 4000));

        const stateResult = await page.evaluate(() => {
            const url = window.location.href.toLowerCase();
            const text = document.body.innerText.toLowerCase();
            const hasUserField = !!document.querySelector('#txt_username');

            if (url.includes('login') || hasUserField) return 'needs_login';
            if (text.includes('dashboard') || text.includes('logout') || text.includes('send message')) return 'logged_in';
            return 'unknown';
        });

        console.log(`[Puppet] Page State: ${stateResult} | URL: ${page.url()}`);

        if (stateResult !== 'logged_in') {
            console.log('[Puppet] Session stale. Attempting background login...');

            if (!page.url().includes('login')) {
                await page.goto('https://msmsenterprise.mobitel.lk/index.php/login', { waitUntil: 'domcontentloaded' });
            }

            await page.waitForSelector('#txt_username', { timeout: 10000 }).catch(() => { });
            await page.type('#txt_username', USERNAME).catch(() => { });
            await page.type('#txt_password', PASSWORD).catch(() => { });

            const loginBtn = await page.$('#login_button');
            if (loginBtn) await loginBtn.click();

            await new Promise(r => setTimeout(r, 5000));

            const checkLogin = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                if (text.includes('logout') || text.includes('dashboard') || text.includes('send message')) return 'ok';
                return 'blocked';
            });

            if (checkLogin !== 'ok') {
                console.log('[Puppet] Background login blocked (OTP/CAPTCHA). Opening VISIBLE WINDOW...');
                await browser.close();

                browser = await puppeteer.launch({
                    headless: false,
                    userDataDir: userDataDir,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024']
                });
                page = await browser.newPage();
                await page.goto('https://msmsenterprise.mobitel.lk/index.php/login', { waitUntil: 'domcontentloaded' });

                // Pre-fill
                await page.waitForSelector('#txt_username', { timeout: 10000 }).catch(() => { });
                await page.type('#txt_username', USERNAME).catch(() => { });
                await page.type('#txt_password', PASSWORD).catch(() => { });

                console.log('[Puppet] !!! ACTION REQUIRED: COMPLETE LOGIN IN BROWSER !!!');
                await page.waitForFunction(
                    () => {
                        const text = document.body.innerText.toLowerCase();
                        return (text.includes('dashboard') || text.includes('logout') || text.includes('send message')) && !window.location.href.includes('login');
                    },
                    { timeout: 600000 }
                );
                console.log('[Puppet] Manual Login Successful.');
            } else {
                console.log('[Puppet] Background login success!');
            }
        } else {
            console.log('[Puppet] Session active. No window needed.');
        }

        // 3. Activating "Send message" Tab
        console.log('[Puppet] Accessing "Send message" section...');
        await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button, li, span, td, font, b, div'));
            const target = elements.find(el => el.textContent.trim().toLowerCase() === 'send message');
            if (target) target.click();
        });

        // 4. Form Processing
        console.log('[Puppet] Waiting for message form load...');
        await new Promise(r => setTimeout(r, 5000));

        const frames = [page, ...page.frames()];
        let formSubmitted = false;

        for (const frame of frames) {
            try {
                const filled = await frame.evaluate((targetNumbers, targetMessage, targetAlias) => {
                    const textareas = Array.from(document.querySelectorAll('textarea'));
                    const mobileInput = textareas.find(t => t.name?.toLowerCase().includes('mobile') || t.id?.toLowerCase().includes('mobile')) || textareas[0];
                    if (!mobileInput) return false;

                    mobileInput.value = targetNumbers;
                    mobileInput.dispatchEvent(new Event('input', { bubbles: true }));

                    const maskSelect = document.querySelector('select[name*="mask"], select[name*="alias"], #ddl_mask, select');
                    if (maskSelect) {
                        const option = Array.from(maskSelect.options).find(o =>
                            o.text.trim().toLowerCase().includes(targetAlias.toLowerCase()) ||
                            o.value.trim().toLowerCase().includes(targetAlias.toLowerCase())
                        );
                        if (option) {
                            maskSelect.value = option.value;
                            maskSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }

                    const msgInput = textareas.find(t => t !== mobileInput && (t.name?.toLowerCase().includes('message') || t.id?.toLowerCase().includes('message'))) || textareas[1];
                    if (msgInput) {
                        msgInput.value = targetMessage;
                        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    return true;
                }, numbers.join(','), message, ALIAS);

                if (filled) {
                    console.log(`[Puppet] Form found in frame: ${frame.url()}`);
                    const sendBtn = await frame.evaluateHandle(() => {
                        const candidates = Array.from(document.querySelectorAll('input[type="submit"], button, .btn, .button, [value="Send"]'));
                        return candidates.find(b => {
                            const val = (b.value || b.textContent || '').toLowerCase().trim();
                            return (val === 'send' || val === 'send message' || val.includes('send')) && !val.includes('excel') && !val.includes('report');
                        });
                    });

                    if (sendBtn.asElement()) {
                        console.log('[Puppet] Submitting form...');
                        await sendBtn.asElement().evaluate(el => el.scrollIntoView());
                        await new Promise(r => setTimeout(r, 1000));

                        page.on('dialog', async d => await d.accept());

                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => { }),
                            sendBtn.asElement().click()
                        ]);
                        formSubmitted = true;
                        break;
                    }
                }
            } catch (e) { }
        }

        if (!formSubmitted) throw new Error('Form submission failed (could not locate/click Send in any frame).');

        console.log('[Puppet] Success: Bulk SMS task completed.');
        return { success: numbers.length, failed: 0, details: [] };

    } catch (err) {
        console.error('[Puppet Error]', err.message);
        if (page) await page.screenshot({ path: path.join(__dirname, '..', `error_sms_${Date.now()}.png`) }).catch(() => { });
        return {
            success: 0,
            failed: numbers.length,
            details: numbers.map(n => ({ number: n, status: 'failed', error: err.message }))
        };
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { sendBulkMessages };
