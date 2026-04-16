/**
 * Centralized type definitions for the PMO application.
 * All shared types are re-exported from here for convenient imports.
 */

// Project
export type {
  Project,
  ProjectListItem,
  ProjectCreate,
  ProjectUpdate,
  ProjectView,
} from './project';

// Program
export type { Program, ProgramDetail } from './program';

// User
export type {
  User,
  OrgBrief,
  LoginResponse,
  CurrentUser,
  UserOption,
} from './user';

// Organization
export type { Organization, OrgOption } from './organization';

// Risk
export type { Risk, RiskWithProject } from './risk';

// Issue
export type { Issue, IssueWithProject } from './issue';

// Change
export type { Change, ChangeWithProject } from './change';

// Lesson
export type { Lesson, LessonWithProject } from './lesson';

// Minute
export type { Minute, MinuteRaid, MinuteWithProject } from './minute';

// Document
export type { Document, DocWithProject, UploadResponse } from './document';

// Report
export type { Report, ReportView } from './report';

// Area
export type { Area } from './area';

// Task
export type { Task, BacklogItem } from './task';

// Objective
export type { Objective } from './objective';

// Dashboard
export type { DashboardKPIs } from './dashboard';

// Tenant / Superadmin
export type {
  Tenant,
  TenantDetail,
  ProgramSummary,
  ProjectSummary,
  UserSummary,
  RequestSummary,
  ServerHealth,
  ProvisionForm,
} from './tenant';
