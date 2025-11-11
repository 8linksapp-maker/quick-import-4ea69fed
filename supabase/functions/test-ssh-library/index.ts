import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import SSH2Promise from 'https://esm.sh/ssh2-promise@2.1.0' // Using esm.sh for Node.js library

serve(async (req) => {
  // This function's sole purpose is to test if ssh2-promise can be bundled and deployed.
  // It does not actually connect to any SSH server.

  // Just referencing the imported library to ensure it's part of the bundle.
  const sshClient = new SSH2Promise({}); 
  console.log("SSH2Promise imported successfully for test.");

  return new Response("SSH2Promise test function deployed successfully!", {
    headers: { "Content-Type": "text/plain" },
    status: 200,
  })
})