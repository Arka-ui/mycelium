const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { spawn } = require('child_process');
const path = require('path');

const APP_PATH = process.env.MYCELIUM_DESKTOP_PATH ||
  path.join(__dirname, '..', '..', 'target', 'release', 'mycelium_desktop.exe');

describe('Mycelium desktop smoke test', function () {
  this.timeout(120_000);
  let driver;
  let appProcess;

  before(async () => {
    appProcess = spawn(APP_PATH, [], { stdio: 'pipe' });
    await new Promise((r) => setTimeout(r, 4000));
    driver = await new Builder()
      .usingServer('http://127.0.0.1:9515')
      .withCapabilities({ 'tauri:options': { application: APP_PATH } })
      .forBrowser('chrome')
      .build();
  });

  after(async () => {
    if (driver) await driver.quit().catch(() => {});
    if (appProcess) appProcess.kill();
  });

  it('renders the sidebar', async () => {
    await driver.wait(until.elementLocated(By.css('.sidebar')), 10_000);
    const heading = await driver.findElement(By.css('.sidebar h1')).getText();
    expect(heading).to.equal('Mycelium');
  });

  it('creates a new note when + New Note is clicked', async () => {
    const btn = await driver.findElement(By.id('new-note'));
    await btn.click();
    await driver.wait(until.elementLocated(By.css('#notes li')), 5000);
    const items = await driver.findElements(By.css('#notes li'));
    expect(items.length).to.be.greaterThan(0);
  });

  it('persists typed content after save debounce', async () => {
    const ed = await driver.findElement(By.id('editor-area'));
    await ed.click();
    await ed.sendKeys('hello mycelium');
    await new Promise((r) => setTimeout(r, 800));
    const text = await ed.getText();
    expect(text).to.include('hello mycelium');
  });

  it('cycles theme', async () => {
    const before = await driver.executeScript('return document.body.dataset.theme');
    await driver.findElement(By.id('toggle-theme')).click();
    const after = await driver.executeScript('return document.body.dataset.theme');
    expect(after).to.not.equal(before);
  });

  it('opens pairing modal', async () => {
    await driver.findElement(By.id('toggle-pairing')).click();
    const modal = await driver.findElement(By.id('pairing-modal'));
    const klass = await modal.getAttribute('class');
    expect(klass).to.include('open');
    await driver.findElement(By.id('pair-cancel')).click();
  });
});
