import { Router } from "express";

/**
 * Workflow routes for X discovery
 * Handles searching for users on X/Twitter via Google and validating Telegram
 */
export function createWorkflowRoutes(workflowEngine) {
  const router = Router();

  // Manual X discovery: search company handle and discover users
  router.post("/x-discovery", async (req, res) => {
    try {
      const { x_handle, max_users = 5 } = req.body;

      if (!x_handle || !x_handle.trim()) {
        return res.status(400).json({ error: "x_handle is required" });
      }

      console.log(`[API] Starting X discovery for @${x_handle}`);

      // Get session ID for user-specific cookies
      const sessionId = req.cookies?.session_id || req.headers['x-session-id'];

      const result = await workflowEngine.executeXDiscovery({
        x_handle: x_handle.trim(),
        max_users: Number(max_users) || 5,
        sessionId: sessionId, // Pass sessionId for user-specific cookies
      });

      res.json(result);
    } catch (error) {
      console.error("[API] X discovery error:", error);
      res.status(500).json({
        error: "Workflow failed",
        message: error.message,
      });
    }
  });

  return router;
}

export default createWorkflowRoutes;
