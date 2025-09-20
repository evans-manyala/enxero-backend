module.exports = {
    apps: [
        {
            name: 'enxero-backend',
            script: './dist/server.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
            max_memory_restart: '1G',
            node_args: '--max-old-space-size=1024',
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_file: './logs/backend-combined.log',
            time: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 4000,
        },
    ],
};
