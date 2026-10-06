# **Frontend Integration Guidelines: Gossipfy Feature**

# **Overview**

This document outlines the technical specification and user interaction flow for integrating the updated **Gossipfy** functionality into the frontend client. The feature allows users to transform existing posts into lightweight, re-imagined "gossipified" variants linked directly to the parent content.

---

# **1\. Updated Zod Schema Validation**

To support post references and track provenance, the client-side validation schema has been updated to include `gossipifiedPostId`.import { z } from 'zod';

export const createGossipSchema \= z.object({

  content: z

    .string()

    .min(1, { message: 'Gossip content cannot be empty.' })

    .max(280, { message: 'Gossip content must be under 280 characters.' }),

  gossipifiedPostId: z

    .string()

    .uuid({ message: 'Invalid parent post ID format.' })

    .nullable()

    .optional(),

  tags: z

    .array(z.string())

    .max(5, { message: 'Maximum 5 tags allowed.' })

    .default(\[\]),

  isAnonymous: z

    .boolean()

    .default(false),

});

export type CreateGossipInput \= z.infer\<typeof createGossipSchema\>;

---

# **2\. API Endpoint Specifications**

## **Create Gossipified Post**

Creates a new gossip entry linked to a target post ID.

* **Endpoint:** `POST /api/v2/gossip`  
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

### **Request Body**

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| `content` | String | Yes | Main text payload of the gossip entry. |
| `gossipifiedPostId` | String (UUID) | Yes | Unique identifier of the original post being target-linked. |
| `tags` | Array\<String\> | No | Optional thematic tags. |
| `isAnonymous` | Boolean | No | Defaults to `false`. |

### **Response Schema (`201 Created`)**

{

  "success": true,

  "data": {

    "id": "gossip-908123-abc",

    "gossipifiedPostId": "post-456789-xyz",

    "content": "Word on the street is this deploy went completely smooth\!",

    "author": {

      "id": "user-123",

      "username": "alex\_dev"

    },

    "createdAt": "2024-03-29T10:15:30Z"

  }

}

### **Error Handling**

* `400 Bad Request`: Failed schema validation (e.g., content exceeds length or invalid UUID format).  
* `404 Not Found`: Provided `gossipifiedPostId` does not correspond to an existing active post.

---

# **3\. Frontend Component Checklist**

- [ ] Update form validation hook to consume the updated `createGossipSchema`.  
- [ ] Verify the payload key aligns with `gossipifiedPostId` (renamed from legacy `parentPostId`).  
- [ ] Implement target post reference preview inside the create dialog.  
- [ ] Ensure accessibility attributes (`aria-expanded`, `aria-describedby`) are correctly applied to the Gossipfy trigger button and dialog.

