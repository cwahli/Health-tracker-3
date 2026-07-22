# Admin Panel for Real Firebase Users (Roadmap)

This document tracks the phased rollout of the admin panel for managing real Firebase Auth users.

## Phase 1 (Completed)
**Backend**: Implemented a read-only endpoint (`/api/admin/users`) to list all real Firebase Auth users (not just locally-cached ones), restricted to whitelisted admin emails. This allows admins to see everyone, including users with unconfirmed emails.

## Phase 2 (Pending)
**Backend**: Create two separate delete endpoints:
- Auth-only deletion
- Data-only deletion

## Phase 3 (Pending)
**Backend**: Create two separate reset endpoints:
- Resend verification email
- Send password reset email

## Phase 4 (Pending)
**Frontend**: Wire all of the above endpoints into the existing admin "User Management" panel, ensuring a typed-confirmation step is required before any delete operation.
