# Deploy Firestore Rules

## Option 1: Firebase Console (Recommended)

1. Go to https://console.firebase.google.com/
2. Select your project
3. Click on **Firestore Database** in the left menu
4. Click on the **Rules** tab
5. Copy all content from `firestore.rules` file
6. Paste it in the rules editor
7. Click **Publish**

## Option 2: Firebase CLI

If you have Firebase CLI installed, run:

```bash
firebase deploy --only firestore:rules
```

## After Deploying Rules

The counter permissions will be active, and you can use the auto-increment counter for reference numbers.

The system will generate reference numbers like:
- FR-000001
- FR-000002
- FR-000003
- etc.
