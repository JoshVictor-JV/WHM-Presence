# WHM Presence Firestore Security Specification

This document details the Zero-Trust and Attribute-Based Access Control (ABAC) principles of the **WHM Presence** global church management platform.

## 1. Data Invariants

- **Users (`/users/{userId}`)**: A user profile must match their authenticated Firebase account. Roles can only be changed by administrators. Self-promotion is disabled.
- **Hierarchy Levels (`/hierarchy_levels/{levelId}`)**: Tiers representing church levels are mutable only by administrators. Any references to them in branches are validated.
- **Branches (`/branches/{branchId}`)**: Each branch must belong to a valid `hierarchy_level`. Geographic coordinate bounds (`latitude` / `longitude`) and system state variables must not be spoofed.

## 2. Access Controls & Roles Matrix

| Collection | Read Privilege | Create Privilege | Update Privilege | Delete Privilege |
|---|---|---|---|---|
| `users` | Signed-In Users (Self Get) | Signed-In User (Matches UID) | Signed-In User (Self Only, restricted fields) | Admins Only |
| `hierarchy_levels` | All Signed-In Users | Admins Only | Admins Only | Admins Only |
| `branches` | All Signed-In Users | Admins Only | Admins Only (Restricted Fields check) | Admins Only |

---

## 3. The "Dirty Dozen" Prevention Scenarios

We prevent 12 specific exploit structures directly via the Rules Guard:

1. **Privilege Escalation**: Non-admin attempts to create a profile with `"role": "admin"`. Checked by rule restricting initial creation and self-update role settings.
2. **Identity Spoofing**: User tries to register user ID `userABC` with `request.auth.uid = userXYZ`. Rejected.
3. **Invalid Level Insertion**: Creating levels with string names exceeding size boundaries. Prevented by size match functions.
4. **Incorrect Coordinate injection**: Passing non-numbers as lat/lng coordinates in branches. Checked by `latitude is number` and `longitude is number`.
5. **Orphaned Branch Node**: Creating a branch targeting a non-existent hierarchical relationship node. Screened via `exists(/databases/$(database)/documents/hierarchy_levels/$(incoming().hierarchyLevel))`.
6. **Creation Timeline Tampering**: Injecting a custom client side `createdAt` date into the past. Checked by equality to `request.time`.
7. **Created Age Degradation**: Changing the `createdAt` timestamp when saving updates. Enforces `incoming().createdAt == existing().createdAt`.
8. **Malicious ID Overrides**: Writing incredibly long (1MB+) docuemnt IDs to trigger buffer errors. Shielded by `isValidId()` which checks `.size() <= 128` and matching alphanumeric regex patterns.
9. **Spam Data Inundation**: Setting fields like description/notes to unbounded lengths. Regulated by maximum string sizes.
10. **Shadow Field Writing**: Creating records with secret properties. Repelled by `keys().size() == N` and `hasAll()`.
11. **Anonymized DB Query Scraping**: General query scraping without a secure filtering context. Prevented by `allow list: if resource.data.userId == request.auth.uid` or specific scope.
12. **Status Shortcircuiting / Terminal Lock**: Updating system components when status has already locked. Protected by state locks.
