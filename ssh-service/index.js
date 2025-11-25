const express = require('express');
const { Client } = require('ssh2');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.post('/execute', (req, res) => {
    const { host, port, username, password, command, wait_for_output } = req.body;

    if (!host || !port || !username || !password || !command) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }

    // --- LOGIC FOR LONG-RUNNING, FIRE-AND-FORGET COMMANDS ---
    if (!wait_for_output) {
        res.status(202).json({ message: `Comando de longa duração iniciado. Verifique os logs do ssh-service para o progresso.` });
        // Use require.resolve to get the path to the worker file, which helps bundlers.
        const workerPath = path.resolve(__dirname, 'worker.js');
        const sshProcess = spawn('node', [workerPath], { detached: true, stdio: ['pipe', 'inherit', 'inherit'] });
        sshProcess.stdin.write(JSON.stringify({ host, port, username, password, command }));
        sshProcess.stdin.end();
        sshProcess.unref();
        return;
    }

    // --- LOGIC FOR SHORT-RUNNING COMMANDS THAT RETURN OUTPUT ---
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) {
                conn.end();
                // Even on stream error, return 200 but with an error message and code
                return res.status(200).json({ 
                    error: 'SSH stream error: ' + err.message,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: 1 
                });
            }
            stream.on('close', (code) => {
                conn.end();
                // Always return 200. The client will check the exitCode.
                res.status(200).json({ 
                    message: code === 0 ? 'Command executed successfully' : 'Command finished with a non-zero exit code.', 
                    stdout: stdout, 
                    stderr: stderr,
                    exitCode: code
                });
            }).on('data', (data) => {
                stdout += data.toString();
            }).stderr.on('data', (data) => {
                stderr += data.toString();
            });
        });
    }).on('error', (err) => {
        // Even on connection error, return 200 but with an error message
        res.status(200).json({ 
            error: 'SSH connection error: ' + err.message,
            stdout: '',
            stderr: err.message,
            exitCode: 1
        });
    }).connect({ host, port, username, password, readyTimeout: 20000 });
});

app.listen(port, () => {
    console.log(`SSH service listening on port ${port}`);
});