<<<<<<< HEAD
# AuraSlot
=======
# AuraSlot -Appointment Booking System

A complete, production-grade appointment booking web application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. Designed using the **"Neon Night Glass"** dark glassmorphism theme with 100% client-side `localStorage` persistence.

---

## 🌟 Key Features

### 1. 📅 Interactive Booking System
- **Comprehensive Fields**: Full Name, Email, Phone Number, Consultation Service dropdown, Date Picker, Time Slot selector, and Optional Notes.
- **Smart Date Rules**: Past dates are locked out via HTML5 attributes and validation guards; optional weekend-blocking toggle.
- **30-Minute Time Slot Picker**: Operating hours from `9:00 AM` to `5:00 PM` in 30-minute intervals, with lunch break (`1:00 PM – 2:00 PM`) excluded.
- **Real-Time Availability**: Booked and passed slots are disabled with translucent styling and strikethrough indicators.

### 2. 🛡️ Robust Validation & Error Prevention
- **Inline Feedback**: Real-time errors displayed on `blur` (touched) and on submission.
- **Strict Validation Rules**:
  - **Full Name**: Minimum 3 characters, letters and spaces only.
  - **Email**: Standard RFC email format.
  - **Phone Number**: Valid 10-digit phone format.
  - **Date & Slot**: Required, future dates and active slots only.
- **Duplicate & Collision Protection**:
  - A slot on a given date cannot be booked twice. Availability is re-checked synchronously at submit time.
  - Same email cannot book multiple appointments at the exact same time.

### 3. 📋 Appointment Management ("My Appointments")
- **List & Table Modes**: Toggle between glassmorphic card grids and tabular data views.
- **Instant Search**: Search appointments by patient name, email, booking reference ID, or service.
- **Multi-Filter & Sorting**:
  - Filter by Status: `All`, `Upcoming`, `Completed`, `Cancelled`.
  - Filter by Date and Service.
  - Sort by date (soonest / latest), booking date, or name.
- **Slot Release on Cancellation**: Cancelling an appointment frees the slot immediately so others can book it.
- **Edit & Reschedule**: Modify patient information or shift time slots with full collision checks.

### 4. 🎨 "Cream & Crimson Red" Aesthetics
- **Curated Palette**:
  - Cream Base & Canvas: `#FAF6EE` / `#FFFDF9`
  - Ruby / Crimson Red: `#DC2626` / `#B91C1C` / `#991B1B`
  - Crisp Espresso Text: `#1C1917` (High AAA contrast)
  - Warm Taupe/Stone: `#78716C`
  - Glowing Statuses: Success `#059669`, Ruby Alert `#DC2626`
- **Glassmorphism & Micro-animations**: `backdrop-filter: blur(16px)`, soft ruby-tinted borders (`rgba(153, 27, 27, 0.12)`), elegant drop shadows, and subtle ambient glows.
- **Confetti Celebration**: Festive particle bursts in ruby, gold, and emerald on successful booking.
- **Calendar Export**: Download `.ics` iCalendar invites compatible with Google Calendar, Apple Calendar, and Outlook.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation & Launch

```bash
# 1. Clone repository / enter directory
cd Appoinment

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The dev server will launch at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🧪 Testing Checklist

- [x] **Empty Form Validation**: Submitting an empty form triggers inline error messages under each field.
- [x] **Duplicate Booking Prevention**: Booking the same slot twice is blocked both in UI and at submit time.
- [x] **Slot State**: Booked slots appear disabled with dimmed strikethrough in the picker.
- [x] **Slot Freeing on Cancel**: Cancelling an appointment frees the time slot for subsequent bookings.
- [x] **Persistence**: All bookings, edits, and cancellations persist across browser refreshes via `localStorage`.
- [x] **Mobile Responsiveness**: Fluid layout verified across mobile, tablet, and desktop viewports.
- [x] **Calendar Sync**: `.ics` file downloads correctly with matching date, time, and patient notes.

---

## 📂 Project Architecture

```
src/
├── components/
│   ├── AppointmentCard.tsx        # Card item with status badges and actions
│   ├── AppointmentList.tsx        # Filter, search, and view controller
│   ├── AppointmentTable.tsx       # Dense tabular data view
│   ├── BookingForm.tsx            # Full appointment scheduling form
│   ├── BookingSuccessModal.tsx    # Confetti modal with booking reference & iCal export
│   ├── ConfirmModal.tsx           # Confirmation dialog for cancellations
│   ├── DashboardStats.tsx         # Live metrics cards with quick-filtering
│   ├── EditAppointmentModal.tsx   # Reschedule & edit existing appointments
│   ├── Navbar.tsx                 # Glassmorphic top navigation with badge
│   ├── TimeSlotPicker.tsx         # Operating hour slot buttons with state
│   └── ToastContainer.tsx         # Animated floating alert toasts
├── hooks/
│   ├── useAppointments.ts         # Central appointment state and storage sync
│   └── useToast.ts                # Toast notification management
├── types/
│   └── appointment.ts             # TypeScript interfaces and types
├── utils/
│   ├── constants.ts               # Services catalog, operating hours, and seed data
│   ├── slots.ts                   # Slot generator and date calculation helpers
│   ├── storage.ts                 # LocalStorage I/O, iCalendar generator, and IDs
│   └── validation.ts              # Form validation engine
├── App.tsx                        # Master layout and state coordinator
├── index.css                      # Neon Night Glass design tokens & styles
└── main.tsx                       # React root mounting
```
>>>>>>> a81f36c (initial)
