const { Client } = require('ssh2');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        const { host, port, username, password, command } = JSON.parse(input);
        const conn = new Client();
        conn.on('ready', () => {
            console.log('SSH Worker: Connection ready. Executing command:', command);
            conn.exec(command, (err, stream) => {
                if (err) { console.error('SSH Worker: Stream error:', err); conn.end(); return; }
                stream.on('close', (code, signal) => {
                    console.log('SSH Worker: Stream closed. Code:', code, 'Signal:', signal);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        }).on('error', (err) => {
            console.error('SSH Worker: Connection error:', err);
        }).connect({ host, port, username, password, readyTimeout: 20000 });
    } catch (e) {
        console.error('Error in SSH worker process:', e);
    }
});
