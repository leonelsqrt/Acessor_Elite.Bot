import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const router = Router();

// Secret for validating GitHub webhooks (optional but recommended)
const WEBHOOK_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || '';

// Validate GitHub webhook signature
function validateSignature(payload: string, signature: string | undefined): boolean {
    if (!WEBHOOK_SECRET) return true; // Skip validation if no secret set
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Deploy endpoint
router.post('/deploy', async (req, res) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const payload = JSON.stringify(req.body);

    // Validate signature if secret is set
    if (WEBHOOK_SECRET && !validateSignature(payload, signature)) {
        console.log('❌ Deploy webhook: Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if it's a push to main branch
    const branch = req.body.ref;
    if (branch && branch !== 'refs/heads/main') {
        console.log(`⏭️ Deploy webhook: Ignoring push to ${branch}`);
        return res.json({ status: 'ignored', reason: 'Not main branch' });
    }

    console.log('🚀 Deploy webhook received! Starting auto-deploy...');

    try {
        // Run deploy commands
        const commands = [
            'cd /docker/elite-assistant',
            'git pull origin main',
            'docker-compose down',
            'docker-compose up -d --build'
        ].join(' && ');

        const { stdout, stderr } = await execAsync(commands, { timeout: 120000 });

        console.log('✅ Auto-deploy completed successfully!');
        console.log('stdout:', stdout);
        if (stderr) console.log('stderr:', stderr);

        res.json({ status: 'success', message: 'Deploy completed' });
    } catch (error: any) {
        console.error('❌ Auto-deploy failed:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Simple trigger endpoint (for manual deploys)
router.get('/deploy/trigger', async (req, res) => {
    const secret = req.query.secret as string;

    // Require secret for manual trigger
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
    }

    console.log('🚀 Manual deploy triggered!');

    try {
        const commands = [
            'cd /docker/elite-assistant',
            'git pull origin main',
            'docker-compose down',
            'docker-compose up -d --build'
        ].join(' && ');

        exec(commands, { timeout: 120000 });

        res.json({ status: 'started', message: 'Deploy started in background' });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;
