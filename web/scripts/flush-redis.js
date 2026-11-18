const { spawnSync } = require('child_process');

const r = spawnSync('docker', ['exec', 'prosa-redis', 'sh', '-c', 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning FLUSHALL'], { encoding: 'utf8' });
console.log('Redis stdout:', r.stdout);
console.log('Redis stderr:', r.stderr);
