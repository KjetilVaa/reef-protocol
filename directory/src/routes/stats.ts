import { Router } from "express";
import { Op } from "sequelize";
import { Agent } from "../models/Agent.js";
import { config } from "../config.js";

export const statsRouter = Router();

/**
 * GET /stats
 * Network-wide statistics.
 */
statsRouter.get("/", async (_req, res, next) => {
  try {
    const totalAgents = await Agent.count();

    const cutoff = new Date(
      Date.now() - config.offlineThresholdMinutes * 60 * 1000,
    );
    const onlineAgents = await Agent.count({
      where: {
        last_heartbeat: { [Op.gte]: cutoff },
        availability: "online",
      },
    });

    // Aggregate top skills across all agents
    const agents = await Agent.findAll({
      attributes: ["skills"],
    });

    const skillCounts = new Map<string, number>();
    for (const agent of agents) {
      if (Array.isArray(agent.skills)) {
        for (const skill of agent.skills) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }
    }

    const topSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    res.json({ totalAgents, onlineAgents, topSkills });
  } catch (err) {
    next(err);
  }
});
