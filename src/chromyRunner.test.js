import fs from 'fs';
import Chromy from 'chromy';
import { ChromyRunner } from './chromyRunner';
import logger from './logger';
import { globalConfig, testConfig, configTypes } from './defaultConfig';
import actions from './actions';

jest.mock('chromy', () => jest.fn().mockImplementation(() =>
    ({
      goto: jest.fn(),
      close: jest.fn(),
      screenshotDocument: jest.fn(() => 'png file'),
      screenshotSelector: jest.fn(() => 'png file'),
    }),
  ));

jest.mock('./compareImage', () => jest.fn(arg =>
    new Promise((resolve, reject) => {
      if (arg === './screenshots') {
        return resolve('Writting the diff image to disk');
      }
      return reject('error');
    }),
  ));

let loggerCalls = [];
logger.log = (...args) => {
  loggerCalls.push(...args);
};

let writeFileSyncCalls = [];
fs.writeFileSync = (...args) => {
  writeFileSyncCalls.push(...args);
};

const chromyRunner = new ChromyRunner(globalConfig);

describe('ChromyRunner', () => {
  afterEach(() => {
    loggerCalls = [];
    writeFileSyncCalls = [];
  });
  it('run update', async () => {
    testConfig.type = configTypes.update;
    const result = await chromyRunner.run(testConfig);
    expect(result).toEqual(true);
    expect(chromyRunner.currentTestId).toEqual(1);
    expect(loggerCalls[0]).toEqual('goto -> www.example.com');
    expect(loggerCalls[1]).toEqual('screenshot saved in -> ./screenshots/default.png');
    expect(chromyRunner.options)
      .toEqual({
        screenshots: './screenshots',
        testReportPath: './differencify_report',
        debug: false,
        visible: true,
        timeout: 30000,
        mismatchThreshold: 0.1,
      });
    expect(writeFileSyncCalls).toEqual(['./screenshots/default.png', 'png file']);
  });
  it('run test', async () => {
    testConfig.type = configTypes.test;
    const result = await chromyRunner.run(testConfig);
    expect(result).toEqual(true);
    expect(chromyRunner.currentTestId).toEqual(2);
    expect(loggerCalls[0]).toEqual('goto -> www.example.com');
    expect(loggerCalls[1]).toEqual('screenshot saved in -> ./differencify_report/default.png');
    expect(chromyRunner.options)
      .toEqual({
        screenshots: './screenshots',
        testReportPath: './differencify_report',
        debug: false,
        visible: true,
        timeout: 30000,
        mismatchThreshold: 0.1,
      });
    expect(writeFileSyncCalls).toEqual(['./differencify_report/default.png', 'png file']);
  });
  describe('Chromy runner', () => {
    it('Step runner: test action', async () => {
      const chromy = new Chromy();
      testConfig.type = configTypes.test;
      testConfig.steps.push({ name: actions.test, value: globalConfig.testReportPath });
      const result = await chromyRunner._stepRunner(chromy, testConfig);
      testConfig.steps.pop({ name: actions.test, value: globalConfig.testReportPath });
      expect(result).toEqual(true);
      expect(loggerCalls[0]).toEqual('goto -> www.example.com');
      expect(loggerCalls[1]).toEqual('screenshot saved in -> ./differencify_report/default.png');
      expect(loggerCalls[2]).toEqual('Writting the diff image to disk');
      expect(writeFileSyncCalls).toEqual(['./differencify_report/default.png', 'png file']);
    });
    it('Step runner: update action', async () => {
      const chromy = new Chromy();
      testConfig.type = configTypes.update;
      const result = await chromyRunner._stepRunner(chromy, testConfig);
      expect(result).toEqual(true);
      expect(loggerCalls[0]).toEqual('goto -> www.example.com');
      expect(loggerCalls[1]).toEqual('screenshot saved in -> ./screenshots/default.png');
      expect(writeFileSyncCalls).toEqual(['./screenshots/default.png', 'png file']);
    });
  });
});
