'use strict';

const { parentPort, workerData } = require('worker_threads');
const { parsePrproj } = require('./prproj-parser');

parsePrproj(workerData.prprojPath)
  .then((result) => {
    parentPort.postMessage({ ok: true, result });
  })
  .catch((err) => {
    parentPort.postMessage({ ok: false, error: err.message || String(err) });
  });
