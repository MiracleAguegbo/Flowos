# Security Specification: Multi-Tenant Business Membership Security (ABAC)

## 1. Core Data Invariants
1. **Strict Multi-Tenant Isolation**: A user can ONLY read, create, update, or delete data within `/businesses/{businessId}` or its subcollections (customers, conversations, messages, leads, orders, products, followUps, knowledgeBase) if their authenticated `request.auth.uid` is an explicitly listed member in the specific `/businesses/{businessId}` document (`resource.data.members` or `resource.data.ownerId`).
2. **No Blanket Reads**: Signed-in users without membership in business B CANNOT read business B or any documents under business B's subcollections (`PERMISSION_DENIED`).
3. **No Cross-Tenant Writes**: User A (member of Business A) CANNOT create, update, or delete any document (customers, orders, conversations, products, etc.) belonging to Business B.
4. **Master Gate Relationship**: Access to all subcollections under `/businesses/{businessId}` is synchronously derived from fetching the parent `/businesses/{businessId}` document and verifying that the user is a listed member. Revoking membership in the parent business document immediately revokes access to all subcollections.
5. **Business Document Protection**: Only existing listed members or the owner can update the business document. Only the owner can delete the business document.
6. **User Document Isolation**: A user can only access their own user document at `/users/{userId}` where `request.auth.uid == userId`.

---

## 2. The "Dirty Dozen" Adversarial Payloads
The following 12 attack vectors attempt to bypass multi-tenant isolation, cross-pollinate data, or execute unauthorized operations:

1. **Payload 1 (Cross-Tenant Business Read)**: User A sends a `get` request to `/businesses/business-B`. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Cross-Tenant Business Update)**: User A sends an `update` request modifying the `name` or `currency` of `/businesses/business-B`. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Cross-Tenant Customer Read)**: User A sends a `get` request to `/businesses/business-B/customers/customer-1`. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Cross-Tenant Customer Write/Create)**: User A sends a `create` request to `/businesses/business-B/customers/customer-malicious`. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Cross-Tenant Order Create)**: User A creates a fraudulent order under `/businesses/business-B/orders/order-malicious`. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Cross-Tenant Order Update)**: User A attempts to update payment status or totals on an existing order in `/businesses/business-B/orders/order-1`. Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Cross-Tenant Conversation Read)**: User A reads private WhatsApp conversations under `/businesses/business-B/conversations/conv-1`. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Cross-Tenant Message Inject)**: User A attempts to inject a message into `/businesses/business-B/conversations/conv-1/messages/msg-spy`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Cross-Tenant Lead Tamper)**: User A attempts to read or update sales leads in `/businesses/business-B/leads/lead-1`. Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Cross-Tenant Product Catalog Tamper)**: User A attempts to update product prices in `/businesses/business-B/products/prod-1`. Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Unauthenticated Probe)**: An unauthenticated client attempts to read `/businesses/business-A` or `/businesses/business-B`. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Self-Privilege Escalation)**: User A attempts to add their own UID to the `members` array of `/businesses/business-B`. Expected: `PERMISSION_DENIED`.

---

## 3. Test Runner Architecture
The test suite `tests/firestore.rules.test.ts` uses `@firebase/rules-unit-testing` against the Firestore emulator to systematically instantiate two separate businesses (`biz-a` with Member User A, and `biz-b` with Member User B) and assert:
- User A CAN read and write to `biz-a` and its subcollections.
- User B CAN read and write to `biz-b` and its subcollections.
- User A's read/write requests to `biz-b` are DENIED.
- User B's read/write requests to `biz-a` are DENIED.
- Unauthenticated requests are DENIED.
