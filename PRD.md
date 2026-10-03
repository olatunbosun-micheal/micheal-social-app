# Personal Communication Gateway

## Product Requirements Document (PRD)

**Product type:** Private one-to-many communication PWA  
**Platform:** Progressive Web App, responsive web  
**Primary user:** The owner/admin of the application  
**Secondary users:** People personally invited to communicate with the owner  
**Core concept:** WhatsApp-style private communication where every user can communicate only with the application owner.  

---

# 1. Product Overview

Personal Communication Gateway is a private communication platform built around one central person.

Unlike a traditional social network or messaging platform, users do not communicate with one another. Every authenticated user has exactly one private conversation with the application owner.

The experience should feel familiar to users of WhatsApp, Instagram Direct Messages, Messenger, or similar communication products, while the underlying relationship model is intentionally different.

The system is:

```text
                    APPLICATION OWNER
                           │
             ┌─────────────┼─────────────┐
             │             │             │
           USER A         USER B        USER C
             │             │             │
          PRIVATE       PRIVATE        PRIVATE
           CHAT          CHAT           CHAT
```

A user must never be able to discover, search for, or communicate with another user.

The application owner receives all conversations through a unified inbox.

---

# 2. Product Goals

## Primary goals

1. Provide a private communication channel between the owner and individual users.
2. Provide a familiar WhatsApp-like messaging experience.
3. Support rich communication including text, images, video, files and voice messages.
4. Provide real-time messaging.
5. Provide reliable push notifications.
6. Make the application installable as a PWA.
7. Enforce communication isolation at the backend authorization layer.
8. Provide the owner with a unified inbox.
9. Make the application mobile-first while supporting desktop browsers.
10. Build the architecture so calling and advanced communication features can be added later.

---

# 3. Non-Goals

The first version is NOT intended to become a general social network.

The system must not provide:

* Public feed
* Followers
* Following
* Friend requests
* User discovery
* Groups
* Public comments
* Public profiles
* User-to-user messaging
* Community channels
* Algorithmic feed
* Public search
* Marketplace
* Social recommendations

---

# 4. Target Users

## 4.1 Owner

The owner is the central communication participant.

The owner can:

* View all conversations
* Search conversations
* Open individual conversations
* Send messages
* Receive messages
* Upload media
* Send voice messages
* Reply to messages
* React to messages
* Edit messages
* Delete messages
* Mark conversations as read
* Archive conversations
* Block users
* Manage users
* View user information
* Receive notifications

---

## 4.2 Guest/User

A guest is a person invited to communicate with the owner.

The guest can:

* Create or activate an account
* Authenticate
* View their own conversation with the owner
* Send text messages
* Send images
* Send videos
* Send files
* Send voice messages
* Reply to messages
* React to messages
* Edit their own messages
* Delete their own messages
* Receive notifications
* View message status

The guest cannot:

* Search for other users
* View other users
* Message another user
* Create a group
* Discover users
* View the owner's other conversations
* Access another user's conversation
* Access administrative functionality

---

# 5. Core Product Principle

## One user = one private conversation with the owner

Every guest account is associated with exactly one conversation.

Example:

```text
Sarah
   ↓
Conversation #001
   ↓
Owner

David
   ↓
Conversation #002
   ↓
Owner

Tobi
   ↓
Conversation #003
   ↓
Owner
```

There should be no valid application-level relationship:

```text
Sarah → David
Sarah → Tobi
David → Tobi
```

This restriction must be enforced by the backend.
Hiding UI buttons is NOT sufficient.

---

# 6. Authentication

## Requirements

The application must support secure authentication.

MVP authentication should support:

* Email authentication
* Password authentication
* Secure session management
* Logout
* Password reset
* Email verification

Architecture should allow future support for:

* OTP
* Magic links
* Passkeys
* OAuth

---

# 7. Onboarding

## Guest onboarding

A new user should see:

```text
Welcome 👋

You have a private conversation with Micheal.

Create your account to continue.

[ Email ]
[ Password ]

[ Continue ]
```

After successful authentication:

```text
Welcome, Sarah 👋

Your private conversation is ready.

[ Open Chat ]
```

The user should immediately enter their conversation.
There should be no social discovery experience.

---

# 8. Application Structure

## Guest application

```text
App
│
├── Authentication
│   ├── Login
│   ├── Register
│   ├── Forgot Password
│   └── Reset Password
│
├── Chat
│   ├── Conversation
│   ├── Message Composer
│   ├── Media Viewer
│   └── Message Actions
│
└── Profile
    ├── Account Information
    ├── Notification Settings
    └── Logout
```

## Owner application

```text
Owner App
│
├── Inbox
│   ├── All Conversations
│   ├── Unread
│   └── Archived
│
├── Conversation
│   ├── Messages
│   ├── Media
│   └── User Information
│
├── Users
│
├── Notifications
│
└── Settings
```

---

# 9. Guest Chat Interface

The interface should feel familiar to modern messaging applications.

Example:

```text
┌──────────────────────────────────┐
│ ←  Micheal                 📞 🎥 │
├──────────────────────────────────┤
│                                  │
│          Yesterday               │
│                                  │
│  Hey bro, how are you?           │
│                                  │
│                  I'm good!       │
│                                  │
│  ┌────────────────────────────┐  │
│  │         📷 Image            │  │
│  └────────────────────────────┘  │
│                                  │
│                         😂       │
│                                  │
├──────────────────────────────────┤
│ 📎  Type a message...       🎙️  │
└──────────────────────────────────┘
```

---

# 10. Messaging

## Text

Users can send:

* Plain text
* Emojis
* Multiline text

Messages should support:

* Timestamp
* Delivery state
* Read state
* Sender identity
* Message ID

---

# 11. Message Status

Support:

```text
Sending
   ↓
Sent
   ↓
Delivered
   ↓
Read
```

Example:

```text
Hey!                         ✓
Hey!                         ✓✓
Hey!                         ✓✓ blue
```

The exact visual language can differ from WhatsApp to avoid unnecessary imitation.

---

# 12. Typing Indicator

When a user is typing:

```text
Micheal is typing...
```

or:

```text
•••
```

Typing indicators should be real-time and ephemeral.
They should not be stored permanently in the database.

---

# 13. Presence

Support:

* Online
* Offline
* Last seen

Example:

```text
Micheal
online
```

or:

```text
Micheal
last seen recently
```

Presence should be implemented using a real-time mechanism rather than frequent database polling.

---

# 14. Media Messaging

Users should be able to send:

### Images
* Preview before sending
* Upload progress
* Thumbnail
* Full-screen viewer
* Download option
* Metadata where appropriate

### Videos
* Upload
* Preview
* Playback
* Upload progress
* Thumbnail

### Files
* Filename
* File size
* File type
* Download/open action

---

# 15. Voice Messages

Users should be able to record voice messages with browser microphone permission, recording waveform/timer, preview, send/cancel, and interactive playback.

---

# 16. Message Replies

Users can reply to individual messages, quoting the original message with quick scroll to context.

---

# 17. Reactions

Quick emoji reactions (❤️, 😂, 👍, 😮, 😢, 🙏) and custom reaction picker.

---

# 18. Edit Messages

Users may edit their own text messages with an "edited" tag.

---

# 19. Delete Messages

Support "Delete for me" and "Delete for everyone".

---

# 20. Media Gallery

Each conversation provides shared media, files, audio, and links.

---

# 21-23. Owner Inbox & Search

Owner dashboard with tabs (All, Unread, Archived, Blocked), live search, quick replies, and user management.
