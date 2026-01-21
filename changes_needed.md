# Golf Charity Website - Complete Flow Documentation

## Overview

This document maps every page, button, and panel in the Golf Charity website, showing:
- ✅ What IS connected to the database
- ⚠️ What uses MOCK data only  
- ❌ What is NOT connected but SHOULD be

---

## Database Tables (Supabase)

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | User accounts, settings, charity selection | ✅ Active |
| `subscriptions` | User payment plans | ⚠️ Schema exists, not integrated |
| `charities` | Partner charity list | ✅ Active |
| `scores` | User golf scores | ✅ Active |
| `draws` | Monthly draw results | ⚠️ Schema exists, partial integration |
| `draw_entries` | User entries in draws | ❌ Not integrated |
| `donations` | Donation records | ❌ Not integrated |
| `verification_uploads` | Score verification files | ❌ Not integrated |

---

# PUBLIC PAGES

## 1. Home Page (`/`)

### Components
| Element | Type | Connected? | Notes |
|---------|------|------------|-------|
| ScrollytellingHero | Display | ⚠️ Mock | Shows rotating charities - uses hardcoded data |
| CharityImpactSection | Display | ⚠️ Mock | Stats are hardcoded ($450K+, 4,313 supporters) |
| CharityCarousel | Display | ⚠️ Mock | Could fetch from `charities` table |
| HowItWorks | Display | Static | No database needed |
| "Start Giving Today" button | Navigation | ✅ | Links to `/signup` |
| "Explore Charities" button | Navigation | ✅ | Links to `/charities` |

### ❌ Changes Needed
1. **CharityImpactSection stats** → Should query `SUM(total_raised)` from `charities` table
2. **CharityCarousel** → Should fetch featured charities from database
3. **ScrollytellingHero charities** → Should use real charity data

---

## 2. Charities Page (`/charities`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Search box | Filter charities | ⚠️ Mock | Filters mock array, not database |
| Category filters | Filter by category | ⚠️ Mock | Same as above |
| Sort dropdown | Sort results | ⚠️ Mock | Client-side sorting only |
| Featured toggle | Show featured only | ⚠️ Mock | No database query |
| "Details" button | Open modal | ✅ Works | Opens CharityDetailsModal |
| "Select This Charity" (in modal) | Save selection | ✅ Connected | Calls `updateProfile()` → `profiles` table |
| "Direct Donation" button | Make donation | ❌ Not working | No payment integration |

### ❌ Changes Needed
1. **Charity list** → Should fetch from `charities` table using `useCharities` hook
2. **Search/Filter** → Should query database with filters
3. **"Direct Donation" button** → Needs Stripe integration

---

## 3. How It Works (`/how-it-works`)

### Elements
| Element | Action | Connected? | Notes |
|---------|--------|------------|-------|
| All content | Display only | Static | No database needed |
| "Get Started" button | Navigation | ✅ | Links to `/signup` |
| FAQ accordions | Interactive | Static | Client-side only |

### ✅ No Changes Needed
This page is informational only.

---

## 4. Results Page (`/results`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Latest Draw card | Display winner | ⚠️ Mock | Hardcoded data |
| Drawing winning numbers | Display | ⚠️ Mock | Should query `draws` table |
| Past Results list | Display history | ⚠️ Mock | Should query `draws` table |
| Prize breakdown | Display amounts | ⚠️ Mock | Hardcoded values |

### ❌ Changes Needed
1. **All draw data** → Should fetch from `draws` table
2. **Winner info** → Should join with `draw_entries` and `profiles`
3. **Prize amounts** → Should calculate from `draws.prize_pool`

---

## 5. Auth Page (`/login`, `/signup`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Email input | Collect email | ✅ | Supabase Auth |
| Password input | Collect password | ✅ | Supabase Auth |
| Full Name input (signup) | Collect name | ✅ | Stored in `user_metadata` |
| Login button | Authenticate | ✅ | `supabase.auth.signInWithPassword()` |
| Signup button | Create account | ✅ | `supabase.auth.signUp()` |
| Auto-create profile | Trigger | ✅ | Database trigger creates `profiles` row |

### ✅ No Changes Needed
Authentication is fully integrated.

---

# USER PROFILE PAGES

## 6. Dashboard (`/dashboard`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Welcome message | Display name | ✅ | From `profiles.full_name` |
| Next Draw countdown | Calculate days | ✅ Frontend | JavaScript calculation |
| Your Draw Numbers | Display scores | ✅ Connected | From `scores` table via `useScores` |
| Selected Charity card | Display charity | ✅ Connected | From `profiles.selected_charity_id` |
| "Update Scores" button | Navigation | ✅ | Links to `/scores` |
| "Select Charity" button | Navigation | ✅ | Links to `/charities` |
| Subscription Status | Display plan | ✅ Connected | From `subscriptions` table via `useSubscription` |
| "Manage Subscription" button | Navigation | ❌ No link | Button does nothing |

### ❌ Changes Needed
1. **"Manage Subscription" button** → Should link to `/profile/subscription`

---

## 7. Scores Page (`/scores`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Score list | Display scores | ✅ Connected | `scores` table |
| Add Score form | Submit score | ✅ Connected | `INSERT` into `scores` |
| Delete score (X button) | Remove score | ✅ Connected | `DELETE` from `scores` |
| Course name input | Optional | ✅ Connected | Saved to `scores.course_name` |
| Date picker | Select date | ✅ Connected | Saved to `scores.played_date` |
| Score validation | Check 1-45 range | ✅ Frontend | + DB constraint |

### ✅ No Changes Needed
Scores feature is fully integrated.

---

## 8. My Charity (`/profile/charity`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Current charity display | Show selection | ✅ Connected | From `profiles.selected_charity_id` |
| Your Impact stats | Display stats | ⚠️ Mock | Hardcoded ($245, 24 rounds, etc.) |
| Donation % slider | Adjust percentage | ✅ Connected | Saves to `profiles.donation_percentage` |
| Change Charity list | Browse options | ⚠️ Mock | Uses hardcoded array |
| "Details" button | Open modal | ✅ Works | Opens CharityDetailsModal |
| "Save Preferences" button | Save settings | ✅ Connected | `updateProfile()` |

### ❌ Changes Needed
1. **Your Impact stats** → Should query from `donations` table
2. **Charity list** → Should fetch from `charities` table

---

## 9. Profile Settings (`/profile/settings`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Full Name input | Edit name | ⚠️ Mock | `handleSave` is mock |
| Email input | Edit email | ⚠️ Mock | Same |
| Phone input | Edit phone | ⚠️ Mock | Column doesn't exist in DB |
| Golf Club input | Edit club | ⚠️ Mock | Column doesn't exist in DB |
| Notification toggles | Toggle settings | ⚠️ Mock | No `notifications` column |
| "Save Changes" button | Save profile | ⚠️ Mock | Just shows success message |

### ❌ Changes Needed
1. **Add columns to `profiles`** → `phone`, `golf_club`, `notification_settings` (JSON)
2. **Connect handleSave** → Call `updateProfile()` with real data

---

## 10. Subscription (`/profile/subscription`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Current Plan display | Show plan | ✅ Connected | From `subscriptions` table |
| Plan cards (Monthly/Annual) | Display options | ⚠️ Static | Pricing is hardcoded |
| "Cancel Subscription" button | Cancel sub | ⚠️ Mock | Shows confirm dialog, no real cancel |
| Billing History | Show payments | ⚠️ Mock | Hardcoded array |

### ❌ Changes Needed
1. **Cancel Subscription** → Needs Stripe integration to actually cancel
2. **Billing History** → Should fetch from payment provider (Stripe)
3. **Upgrade/Downgrade** → Needs Stripe Checkout integration

---

# ADMIN PAGES

## 11. Admin Dashboard (`/admin`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Total Users stat | Display count | ✅ Connected | `getTableCount('profiles')` |
| Active Subscribers stat | Display count | ⚠️ Mock | Hardcoded, not querying subs |
| Partner Charities stat | Display count | ✅ Connected | `getTableCount('charities')` |
| Total Donated stat | Display total | ⚠️ Mock | Should sum `donations` table |
| Quick action cards | Navigation | ✅ | Links to admin pages |
| Recent Activity | Display log | ⚠️ Mock | Hardcoded activity list |

### ❌ Changes Needed
1. **Active Subscribers** → Query `subscriptions WHERE status = 'active'`
2. **Total Donated** → Query `SUM(amount) FROM donations`
3. **Recent Activity** → Create `activity_log` table or derive from data

---

## 12. User Management (`/admin/users`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| User list | Display users | ✅ Connected | `getUsers()` → `profiles` table |
| Search box | Filter users | ✅ Frontend | Client-side filtering |
| Edit user button | Open modal | ✅ Works | Opens edit form |
| Save user changes | Update profile | ✅ Connected | `updateRow('profiles', id, data)` |
| Toggle Admin/User role | Change role | ✅ Connected | Updates `profiles.role` |
| Toggle Active/Suspended | Change status | ⚠️ Partial | Column may not exist in DB |

### ❌ Changes Needed
1. **Add `status` column to `profiles`** → `active`, `suspended`, `banned`
2. **Pagination** → Currently loads all users at once

---

## 13. Charity Management (`/admin/charities`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Charity list | Display all | ✅ Connected | `getCharities()` |
| Add New Charity button | Create charity | ✅ Connected | `insertRow('charities', data)` |
| Edit charity form | Update charity | ✅ Connected | `updateRow('charities', id, data)` |
| Delete charity | Remove charity | ✅ Connected | `deleteRow('charities', id)` |
| Toggle Featured | Mark as featured | ✅ Connected | Updates `is_featured` |
| Toggle Active | Enable/disable | ✅ Connected | Updates `is_active` |

### ✅ No Changes Needed
Charity management is fully integrated.

---

## 14. Draw Management (`/admin/draws`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Draw history list | Display draws | ⚠️ Mock | Uses hardcoded array |
| "Run Draw" button | Generate winners | ⚠️ Mock | Frontend simulation only |
| Publish Results | Make public | ⚠️ Mock | Updates local state only |
| Winning numbers display | Show result | ⚠️ Mock | From frontend calculation |

### ❌ Changes Needed
1. **Fetch draws** → Query from `draws` table
2. **Run Draw** → 
   - Fetch all eligible users (5+ scores, active subscription)
   - Generate winning numbers from collected scores
   - Create `draw_entries` for all participants
   - Save to `draws` table
3. **Publish** → Update `draws.status = 'published'`

---

## 15. Draw Control (`/admin/draw-control`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Active Participants count | Display | ⚠️ Mock | Uses `generateMockScores()` |
| Prize Pool breakdown | Calculate | ⚠️ Mock | Client-side calculation |
| Frequency Analysis chart | Display stats | ⚠️ Mock | From mock data |
| Run Analysis button | Simulate | ⚠️ Mock | `simulateDrawResults()` frontend only |
| Publish Draw button | Save results | ⚠️ Mock | Does nothing to database |

### ❌ Changes Needed
1. **Fetch real participants** → Query users with 5+ scores and active subscription
2. **Save analysis results** → Store in `draws` table
3. **Connect to payment** → Calculate prize pool from subscription revenue

---

## 16. Admin Reports (`/admin/reports`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Revenue chart | Display monthly | ⚠️ Mock | Hardcoded array |
| Donation breakdown | Display by charity | ⚠️ Mock | Hardcoded array |
| Top Charities list | Display ranking | ⚠️ Mock | Should query `donations` |
| Export buttons | Download report | ⚠️ Mock | Just logs to console |

### ❌ Changes Needed
1. **Revenue data** → Query from payment provider (Stripe)
2. **Donation breakdown** → Query `donations` grouped by `charity_id`
3. **Export functionality** → Implement CSV/PDF generation

---

## 17. Content Management (`/admin/content`)

### Elements
| Element | Action | Connected? | Backend |
|---------|--------|------------|---------|
| Hero section fields | Edit text | ⚠️ Mock | Saves to local state only |
| Stats fields | Edit numbers | ⚠️ Mock | Same |
| Footer fields | Edit text | ⚠️ Mock | Same |
| Save Changes button | Persist content | ⚠️ Mock | Just shows success |

### ❌ Changes Needed
1. **Create `site_content` table** → Key-value store for CMS content
2. **Fetch on page load** → Load content from database
3. **Save changes** → Update database, invalidate cache

---

# SUMMARY: Priority Changes Needed

## 🔴 Critical (User-Facing)

| Feature | Location | Current State | Fix Needed |
|---------|----------|---------------|------------|
| ~~Selected Charity~~ | ~~Dashboard~~ | ~~Mock only~~ | ~~✅ FIXED~~ |
| Profile Settings | Settings page | Mock save | Connect to `updateProfile()` |
| Subscription cancel | Subscription page | Mock only | Stripe integration |
| Direct Donation | Charities page | Button exists, no action | Stripe integration |

## 🟡 Important (Admin-Facing)

| Feature | Location | Current State | Fix Needed |
|---------|----------|---------------|------------|
| Draw execution | Draw Management | Mock simulation | Full draw engine integration |
| User subscriptions | User Management | No sub data shown | Join with `subscriptions` table |
| All reports | Admin Reports | Hardcoded data | Real data aggregation |
| Content CMS | Content Mgmt | Local state only | Create `site_content` table |

## 🟢 Nice to Have

| Feature | Location | Current State | Fix Needed |
|---------|----------|---------------|------------|
| Homepage stats | CharityImpactSection | Hardcoded | Query real totals |
| Charity carousel | HomePage | Hardcoded | Fetch featured from DB |
| Activity log | Admin Dashboard | Hardcoded | Create activity tracking |
| Pagination | All list pages | Load all | Add cursor/offset pagination |

---

# Database Schema Additions Needed

```sql
-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS golf_club TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
  CHECK (status IN ('active', 'suspended', 'banned'));

-- Create site_content table for CMS
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log for admin dashboard
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# External Integrations Needed

| Service | Purpose | Pages Affected |
|---------|---------|----------------|
| **Stripe** | Payments & subscriptions | Subscription, Donate, Admin Reports |
| **Email (SendGrid/Resend)** | Notifications | Draw results, Welcome emails |
| **File Storage** | Score verification | Scores page |
