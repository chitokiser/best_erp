import{S as e,g as t,n}from"./firebase-config-3n4qqNPS.js";var r=()=>{let e=document.createElement(`div`);return e.id=`aiChatContainer`,e.style=`
        position: fixed;
        bottom: 90px;
        right: 2rem;
        width: 380px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 1000;
        border: 1px solid #e2e8f0;
    `,e.innerHTML=`
        <div style="background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 600; display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:1.2rem;">붿붿</span> AI 뿯붿붿 뿯붿붿턴붿
            </div>
            <button id="closeAiChat" style="background:transparent; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        <div id="aiChatWindow" style="flex: 1; padding: 1rem; overflow-y: auto; background: #f8fafc; display:flex; flex-direction:column; gap:0.75rem;">
            <div style="align-self: flex-start; max-width: 80%; background: #e0e7ff; padding: 0.75rem; border-radius: 8px; font-size: 0.875rem;">
                붿붿붿붿뿯붿! AI-ERM 뿯슽붿템붿니뿯⺽ 붿뿯墽뿯墽뿯₽붿곖뿯墽뿯₽Ѐ뿯岽뿯ᶽ룈뿯₽붿뿯붿뿯ⲽ ᠀뿯疽뿯ㆽ뿯ⲽ 붿郇곇뿯₽붿뿯熽뿯₽붿뿯涽뿯ⲽ 砀뿯▽뿯₽붿뿯붿뿯墽뿯₽붿붿 뿯붿붿붿뿯₽ࠀ뿯↽뿯榽뿯좽붿. 뿯붿붿붿뿯붿 붿뿯붿뿯붿붿뿯붿!
            </div>
        </div>
        <div style="padding: 1rem; border-top: 1px solid #e2e8f0; background: white; display: flex; gap: 0.5rem;">
            <input type="text" id="aiChatInput" placeholder="붿뿯붿붿 붿붿붿 붿뿯붿붿?" style="flex:1; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; outline:none;" />
            <button id="aiChatSend" style="background: #4F46E5; color:white; border:none; padding:0.5rem 1rem; border-radius:4px; font-weight:600; cursor:pointer;">전붿</button>
        </div>
    `,document.body.appendChild(e),e},i=async()=>{let r=`뿯붿뿯붿붿 붿붿뿯붿붿 붿뿯붿하붿 AI-ERM 붿붿 뿯붿붿 뿯붿붿턴트붿니뿯⺽ 붿곖뿯墽뿯₽붿뿯붿뿯⢽砀뿯▽뿯ⲽ 붿뿯䒽뿯⦽붿뿯₽Ѐ뿯岽뿯ᶽ룈뿯₽簀뿯ᖽ뿯䒽뿯₽　뿯ᢽ뿯㲽뿯岽뿯₽㠀뿯Ჽ뿯₽붿뿯碽뿯䒽뿯₽붿뿯붿붿뿯₽붿鳍뿯₽琀냕뿯䖽뿯䒽뿯₽ᰀ뿯붿뿯榽뿯좽붿.

[현붿 뿯횽붿 붿붿붿 팩붿]
`;try{let i=await t(e(n,`employees`));r+=`- 뿯붿뿯붿 붿붿:
`,i.forEach(e=>{let t=e.data();r+=`  * ${t.name} (${t.department}): 투붿붿 ${t.load_percentage}%, 수붿 붿붿젝붿 [${t.current_projects.join(`, `)}]\n`});let a=await t(e(n,`equipment`));r+=`- 뿯붿붿 붿붿:
`,a.forEach(e=>{let t=e.data();r+=`  * ${t.name} (${t.status}): 뿯붿뿯붿 붿붿젝붿 ${t.current_project||`뿯붿붿`}, 붿붿붿뿯붿 ${t.daily_cost}뿯붿\n`}),r+=`- 붿붿젝붿 붿붿 뿯붿붿:
  * A, B, C, D 뿯₽붿붿 붿붿젝붿 뿯즽붿붿. 현붿 전붿 24붿 붿 붿뿯붿 17, 뿯붿붿 5, 붿뿯붿 2붿뿯붿니뿯⺽尀渀∀㬀਀        挀漀渀琀攀砀琀 ⬀㴀 ∀  ⨀ Ѐ뿯岽뿯ᶽ룈뿯₽䄀⠀倀ⴀ　　㄀⤀붿뿯₽붿곇뿯⢽붿뿯붿뿯⦽ 붿뿯熽뿯₽ࠀ뿯붿뿯⺽尀渀  ⨀ Ѐ뿯岽뿯ᶽ룈뿯₽䐀⠀倀ⴀ　　㐀⤀붿뿯₽␀뿯쒽€㈀簀뿯₽붿뿯붿뿯⺽ 붿뿯ソ뿯₽붿뿯붿뿯沽뿯₽붿뿯䲽뿯⺽尀渀∀㬀਀਀        挀漀渀琀攀砀琀 ⬀㴀 ∀尀渀Ѐ뿯₽瀀뿯璽뿯ソ뿯粽뿯₽᐀뿯붿뿯㲽뿯岽뿯₽붿뿯㢽뿯붿뿯₽ᔀ뿯喽뿯墽뿯붿 붿뿯붿붿붿붿 뿯붿붿뿯붿 붿붿붿 붿붿붿붿 뿯붿붿붿 뿯붿뿯붿붿뿯붿붿뿯붿. (붿붿붿뿯붿 뿯얽붿 뿯붿뿯붿붿 붿붿붿붿 뿯붿붿 뿯붿붿붿붿 뿯붿붿붿, 붿뿯붿붿 뿯좽붿뿯붿 붿붿붿붿 인붿붿붿뿯붿)`}catch(e){console.error(`Context build error:`,e)}return r};document.addEventListener(`DOMContentLoaded`,()=>{let e=document.querySelector(`.ai-chat-btn`);if(!e)return;let t=r(),n=document.getElementById(`closeAiChat`),a=document.getElementById(`aiChatSend`),o=document.getElementById(`aiChatInput`);document.getElementById(`aiChatWindow`);let s=!1;i().then(e=>e),e.addEventListener(`click`,()=>{s=!s,t.style.display=s?`flex`:`none`,s&&o.focus()}),n.addEventListener(`click`,()=>{s=!1,t.style.display=`none`}),a.addEventListener(`click`,sendMessage),o.addEventListener(`keypress`,e=>{e.key===`Enter`&&sendMessage()})});