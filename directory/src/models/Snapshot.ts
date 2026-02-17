import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db.js";

export interface SnapshotAttributes {
  id?: number;
  total_agents: number;
  online_agents: number;
  messages_reported: number;
  top_skills: string[];
  captured_at: Date;
}

export class Snapshot extends Model<SnapshotAttributes> {
  declare id: number;
  declare total_agents: number;
  declare online_agents: number;
  declare messages_reported: number;
  declare top_skills: string[];
  declare captured_at: Date;
}

Snapshot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    total_agents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    online_agents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    messages_reported: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    top_skills: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    captured_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "snapshots",
    underscored: true,
    timestamps: false,
  },
);
