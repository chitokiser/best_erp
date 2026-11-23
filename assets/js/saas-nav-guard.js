// assets/js/saas-nav-guard.js
// 가맹점 SaaS 모듈 ON/OFF 연동 + 직원(STAFF) RBAC 메뉴/페이지 접근 차단 + Super Admin 관제판 메뉴 주입

import { db } from './firebase-config.js';
import { doc, getDoc } from 'firebase/firestore';

const STAFF_BLOCKED_PAGES = [
  'finance.html',
  'settlement.html',
  'saas-settings.html',
  'api-settings.html',
  'users.html',
  'saas-console.html',
];

const MODULE_PAGE_MAP = {
  erpMenus: ['menus.html', 'categories.html'],
  crmClients: ['clients.html', 'crm-retention.html'],
  settlement: ['settlement.html', 'finance.html'],
  coupons: ['coupons.html'],
  visionCrm: ['vision-crm.html'],
  marketing: ['marketing.html'],
  hrTasks: ['tasks.html', 'employees.html', 'field-reports.html'],
};

function hideLinksForPages(pages) {
  pages.forEach((p) => {
    document.querySelectorAll(`a[href*="${p}"]`).forEach((a) => {
      const li = a.closest('li');
      if (li && !li.classList.contains('dropdown')) {
        li.style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    });
  });
}

export async function applySaasNavGuard({ role, tenantId, isSuperAdmin }) {
  const path = window.location.pathname.toLowerCase();

  // 1. STAFF 권한 분리 (RBAC): 민감 메뉴 숨김 + 직접 URL 접근 차단
  if (role === 'STAFF' && !isSuperAdmin) {
    hideLinksForPages(STAFF_BLOCKED_PAGES);
    if (STAFF_BLOCKED_PAGES.some((p) => path.endsWith('/' + p))) {
      alert('직원 계정에서는 접근할 수 없는 대표 전용 메뉴입니다.');
      window.location.replace('dashboard.html');
      return;
    }
  }

  // 2. Super Admin 전용 메뉴 주입 (SaaS 전체 가맹점 관제판)
  if (isSuperAdmin) {
    const navList = document.getElementById('navMenuList');
    if (navList && !navList.querySelector('a[href="saas-console.html"]')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="saas-console.html" style="color:#f59e0b;font-weight:800;">👑 SaaS 관제판</a>`;
      navList.prepend(li);
    }
  }

  // 3. 가맹점별 saasModules ON/OFF 반영 (Super Admin 제외)
  if (!isSuperAdmin && tenantId && tenantId !== 'system_master') {
    try {
      const snap = await getDoc(doc(db, 'merchants', String(tenantId)));
      if (snap.exists()) {
        const d = snap.data() || {};
        if (d.saasStatus === 'suspended' && !path.endsWith('/saas-settings.html')) {
          alert('현재 가맹점 SaaS 워크스페이스가 일시정지 상태입니다. 관리자에게 문의해 주세요.');
        }
        const mods = d.saasModules;
        if (mods && typeof mods === 'object') {
          Object.entries(MODULE_PAGE_MAP).forEach(([modKey, pages]) => {
            if (mods[modKey] === false) hideLinksForPages(pages);
          });
        }
      }
    } catch (_) {}
  }
}
