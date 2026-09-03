// One (config, seed) evaluation. Forked by sim/tune.js; see there for method.
const { evaluate } = require('./optimise.js');
process.on('message', job => {
  const r = evaluate(job.cfg, job.drafts, job.seasons, job.seed);
  process.send({ idx: job.idx, ci: job.ci, seed: job.seed, title: r.title, playoff: r.playoff });
});
