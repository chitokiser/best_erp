import{T as e,h as t,n,v as r}from"./firebase-config-Dov2i-Iu.js";/* empty css              */import{i,t as a}from"./auth-CtJ78x58.js";import"./ai-chat-BlqYqEc2.js";window.logoutAndRedirect=()=>{i()},window.createProject=async()=>{let r=prompt(`새로운 프로젝트(공사 현장) 이름을 입력하세요:`);if(!r)return;let i=prompt(`이 프로젝트를 담당할 PM(담당자)의 이메일을 입력하세요 (예: kfu134252@gmail.com):`);if(i)try{let a=await t(e(n,`projects`),{title:r,status:`착공대기`,pm:i,createdAt:new Date,deadline:`N/A`});alert(`프로젝트가 성공적으로 생성 및 할당되었습니다!`),window.location.href=`project-detail.html?id=${a.id}`}catch(e){alert(`프로젝트 생성 실패: `+e.message)}},a(async t=>{document.body.style.display=`block`,document.getElementById(`currentUserEmail`).textContent=t.email;let i=document.getElementById(`projectsTableBody`);try{let t=await r(e(n,`users`)),a={};t.forEach(e=>{let t=e.data();t.email&&t.name&&(a[t.email]=t.name)});let o=await r(e(n,`projects`));if(o.empty){i.innerHTML=`<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">생성된 프로젝트가 없습니다.</td></tr>`;return}let s=``;o.forEach(e=>{let t=e.data(),n=e.id,r=t.pm||`미지정`,i=a[r]?a[r]:r;s+=`
                            <tr>
                                <td style="padding: 1rem; font-weight: 600;">
                                    <a href="project-detail.html?id=${n}" style="color:var(--ai-primary); text-decoration:none;">${t.title||`무제 프로젝트`}</a>
                                </td>
                                <td style="padding: 1rem;">
                                    <span class="badge-status">
                                        ${t.status||`착공대기`}
                                    </span>
                                </td>
                                <td style="padding: 1rem;">${i}</td>
                                <td style="padding: 1rem; color: var(--text-muted);">${t.deadline||`N/A`}</td>
                                <td style="padding: 1rem;">
                                    <button class="btn-primary" style="padding:0.4rem 0.8rem; font-size: 0.85rem;" onclick="location.href='project-detail.html?id=${n}'">칸반 열기</button>
                                </td>
                            </tr>
                        `}),i.innerHTML=s}catch(e){i.innerHTML=`<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--danger);">오류가 발생했습니다.</td></tr>`,console.error(e)}},()=>{window.location.href=`../login.html`});