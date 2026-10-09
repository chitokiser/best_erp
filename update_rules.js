const fs = require('fs');

let rules = fs.readFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', 'utf8');

const newRules = `
    // ====== MULTI-TENANT RESTAURANT SAAS RULES ======
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'daguri75@gmail.com';
    }

    function belongsToTenant(tenantId) {
      return isAuthenticated() && (
        isSuperAdmin() ||
        getUserData().tenant_id == tenantId ||
        getUserData().merchantId == tenantId ||
        request.auth.uid == tenantId
      );
    }

    match /stores/{storeId} {
      allow read: if true; 
      allow write: if belongsToTenant(storeId);
    }

    match /menus/{menuId} {
      allow read: if true; 
      allow update, delete: if belongsToTenant(resource.data.tenantId);
      allow create: if belongsToTenant(request.resource.data.tenantId);
    }

    match /orders/{orderId} {
      allow read: if isSuperAdmin() || (isAuthenticated() && (resource.data.userId == request.auth.uid || belongsToTenant(resource.data.tenantId)));
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if belongsToTenant(resource.data.tenantId);
      allow delete: if isSuperAdmin();
    }
  } // End of match /databases/{database}/documents
} // End of service cloud.firestore
`;

// Insert the new rules before the final two braces.
// Find the last index of `match /databases/{database}/documents { ...` closing brace
const lastDbBrace = rules.lastIndexOf('}');
const beforeLast = rules.lastIndexOf('}', lastDbBrace - 1);

let replaced = rules.substring(0, beforeLast) + newRules;
fs.writeFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', replaced, 'utf8');
console.log("Firestore rules updated.");
