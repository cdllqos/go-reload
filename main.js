#!/usr/bin/env node
const path = require('path');
const chokidar = require('chokidar');
const baseDIR = path.resolve('./');
const colors = require('colors');
const { Subject } = require('rxjs');
const { debounceTime, tap } = require('rxjs/operators');
const { spawn } = require('child_process');

let job;
const update$$ = new Subject();

const kill = () => {
  if (job) {
    process.kill(-job.pid);
    job = null;
  }
};

const compileGolang = () => {
  console.clear();
  console.log(colors.green('begin exec go run main.go command'));
  job = spawn('go', ['run', 'main.go'], {
    detached: true,
    stdio: 'inherit',
  });

  job.on('exit', (code) => {
    if (code && code > 0) {
      job = null;
    }
  });
};

const watch = () => {
  const watcher = chokidar.watch([`${baseDIR}/**/*.go`]);
  watcher.on('add', () => {
    update$$.next();
  });

  watcher.on('change', () => {
    update$$.next();
  });

  process.on('SIGINT', () => {
    kill();
    update$$.complete();
    watcher.close().then(() => {
      process.exit(0);
    });
  });
};

(function run() {
  update$$
    .pipe(
      debounceTime(300),
      tap(() => kill())
    )
    .subscribe(() => {
      compileGolang();
    });
  watch();
})();
