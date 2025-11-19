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
                return res.status(500).json({ error: 'SSH stream error: ' + err.message });
            }
            stream.on('close', (code) => {
                conn.end();
                if (code !== 0) {
                    return res.status(500).json({ 
                        error: `Command failed with code ${code}`,
                        stdout: stdout,
                        stderr: stderr,
                        exitCode: code
                    });
                }
                res.status(200).json({ 
                    message: 'Command executed successfully', 
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
        res.status(500).json({ error: 'SSH connection error: ' + err.message });
    }).connect({ host, port, username, password, readyTimeout: 20000 });
});

app.listen(port, () => {
    console.log(`SSH service listening on port ${port}`);
});