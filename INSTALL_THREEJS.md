# Three.js Installation Instructions

To install the Three.js dependencies for the virtual office background animation, run the following command in the frontend directory:

```bash
cd frontend
npm install three@^0.160.0 @types/three@^0.160.0
```

Or if you're using yarn:

```bash
cd frontend
yarn add three@^0.160.0 @types/three@^0.160.0
```

The dependencies have already been added to package.json, so you can also just run:

```bash
cd frontend
npm install
```

## Features Added

### 1. Forgot Password Button
- Added to the login page (`frontend/pages/login.tsx`)
- Positioned next to the password label
- Currently shows an alert (can be connected to Firebase Auth later)
- Requires email to be entered first

### 2. Three.js Virtual Office Background
- Created `frontend/components/VirtualOfficeBackground.tsx`
- Features:
  - 3D virtual office with desks, monitors, and screens
  - Floating particles animation
  - Rotating camera movement
  - Dynamic lighting and shadows
  - Responsive design with fallback
  - SSR-safe with dynamic imports

## Usage

The virtual office background is automatically loaded on the home page. It creates an immersive 3D environment showing:

- 6 office desks arranged in a circle
- Computer monitors with glowing screens
- Floating particles
- Smooth camera rotation
- Professional lighting setup

The component gracefully falls back to a CSS gradient if Three.js fails to load.