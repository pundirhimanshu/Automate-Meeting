/**
 * Simple retry helper for transient DB connection issues (like Neon hibernation)
 */
export async function withRetry(fn, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === retries - 1) throw err;
            
            // Only retry on connection-related errors (P1001, P2024, or generic reachability)
            const isConnectionError = 
                err.code === 'P1001' || 
                err.code === 'P2024' || 
                err.message?.includes('Can\'t reach database') ||
                err.message?.includes('connection pool') ||
                err.message?.includes('Timed out');

            if (!isConnectionError) throw err;

            console.warn(`[DB_RETRY] Connection retry ${i + 1}/${retries} after ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}
