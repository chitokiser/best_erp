import fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

const missingRules = `

    // Purchase Requests
    match /purchase_requests/{document=**} {
      allow read, write: if isStaffOrAdmin();
    }

    // Access Requests for new users
    match /access_requests/{document=**} {
      allow create: if true;
      allow read, write: if isStaffOrAdmin();
    }
  }
}`;

content = content.replace(/  }\s*}\s*$/, missingRules);
fs.writeFileSync('firestore.rules', content, 'utf8');
