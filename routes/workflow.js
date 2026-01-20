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

      console.log(`[API] Starting X discovery for @${x_handle} (employee: ${req.employeeId})`);

      const result = await workflowEngine.executeXDiscovery({
        x_handle: x_handle.trim(),
        max_users: Number(max_users) || 5,
        employeeDb: req.db, // Pass employee-specific database for production Railway
      });

      res.json(result);
    } catch (error) {
      console.error("[API] X discovery error:", error);

      // Provide more specific error messages based on the error type
      let statusCode = 500;
      let errorMessage = error.message;

      if (error.message.includes("Browser initialization failed") ||
          error.message.includes("Browser connection lost") ||
          error.message.includes("timed out")) {
        statusCode = 503; // Service Unavailable
        errorMessage = `${error.message} If this persists, Railway may be experiencing resource constraints.`;
      } else if (error.message.includes("authentication") || error.message.includes("cookies")) {
        statusCode = 401; // Unauthorized
      } else if (error.message.includes("rate limit")) {
        statusCode = 429; // Too Many Requests
      }

      res.status(statusCode).json({
        error: "Workflow failed",
        message: errorMessage,
      });
    }
  });

  return router;
}

export default createWorkflowRoutes;
