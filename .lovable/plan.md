
# Telegram Escrow System - Build Plan

## Concept
A peer-to-peer escrow platform where buyers and sellers trade digital goods (accounts, files, etc.) safely. Both parties interact via Telegram bot AND web interface. An admin confirms payments and resolves disputes.

## Phase 1: Backend Setup (Lovable Cloud)
- Enable Lovable Cloud
- Design database schema:
  - `profiles` (user_id, telegram_username, telegram_chat_id, role, created_at)
  - `user_roles` (user_id, role: admin/moderator/user)
  - `escrows` (id, buyer_id, seller_id, title, description, amount, crypto_type, status, created_at)
  - `escrow_messages` (id, escrow_id, sender_id, message, created_at)
  - `payments` (id, escrow_id, crypto_type, wallet_address, amount, status, confirmed_by, confirmed_at)
  - `disputes` (id, escrow_id, raised_by, reason, status, resolved_by, resolved_at)
  - `crypto_wallets` (id, crypto_name, network, wallet_address, is_active, added_by)
  - `bot_config` (id, bot_username, bot_token, chat_id, is_active)
- RLS policies for role-based access
- Seed admin users: danjolo99, @Misafa4784

## Phase 2: Auth & Web Interface
- Custom auth with Telegram username + password (sign up requires Telegram onboarding first)
- Login/signup pages with Telegram bot link
- Password reset flow
- Role-based routing (admin vs user vs moderator dashboards)

## Phase 3: User Dashboard
- My Escrows (as buyer/seller)
- Create new escrow
- Escrow detail page with chat
- Payment status tracking
- Dispute filing

## Phase 4: Admin Dashboard
- Overview stats (active escrows, pending payments, disputes)
- User management (roles, ban/unban)
- Payment confirmation panel
- Dispute resolution
- Crypto wallet management (add/edit/enable/disable/delete)
- Telegram bot configuration page
- Moderator assignment

## Phase 5: Telegram Bot (Edge Functions)
- `/start` → Welcome + inline buttons (Start Escrow, My Escrows, Help)
- Start Escrow → Select role (Buyer/Seller) → Enter counterpart username → Set password → Create escrow
- Inline keyboard buttons throughout (no typed commands)
- Notifications for: new escrow, payment received, admin confirmed, dispute raised
- Group creation for buyer+seller+moderator discussion

## Design Direction
- Dark, trust-focused UI (think: crypto exchange meets banking)
- Color palette: Deep navy (#0F1729), Electric blue (#3B82F6), Success green (#10B981), Warning amber (#F59E0B)
- Font: Space Grotesk (display) + Inter (body)
- Glassmorphism cards, subtle gradients
- Status badges with color coding
