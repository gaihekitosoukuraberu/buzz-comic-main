/** @type {import('pm2').StartOptions[]} */
module.exports = {
  apps: [
    // -------------------------------------------------------------------------
    // Next.js web server
    // -------------------------------------------------------------------------
    {
      name: "buzz-comic-web",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },

    // -------------------------------------------------------------------------
    // Background job worker
    // -------------------------------------------------------------------------
    {
      name: "buzz-comic-worker",
      script: "npx",
      args: "ts-node --esm scripts/worker.ts",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      // Graceful shutdown timeout (ms)
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        // Worker health-check port
        WORKER_PORT: 3001,
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
