import re

with open('admin/project-detail.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: optText
content = content.replace(
    "const optText = ${udata.name || '무명'} () - ;",
    "const optText = `${udata.name || '무명'} (${udata.department || ''}) - ${udata.auth_level || ''}`;"
)

# Fix 2: opt.textContent
content = content.replace(
    "opt.textContent = [미등록] ;",
    "opt.textContent = `[미등록] ${pm}`;"
)
content = content.replace(
    "opt.value = tm; opt.textContent = [미등록] ;",
    "opt.value = tm; opt.textContent = `[미등록] ${tm}`;"
)

# Fix 3: Kanban Card
bad_card = """        card.innerHTML = 
            <div class="card-actions">
                <button onclick="window.editTask('', '', '')">✏️</button>
                <button onclick="window.delTask('')">🗑️</button>
            </div>
            <span class="task-tag"></span>
            <h4 style="margin:0 0 0.5rem 0; font-size:1rem; padding-right:2rem;"></h4>
            <p style="margin:0; font-size:0.8rem; color:gray;"></p>
        ;"""
good_card = """        card.innerHTML = `
            <div class="card-actions">
                <button onclick="window.editTask('${id}', '${data.title}', '${data.description || ''}')">✏️</button>
                <button onclick="window.delTask('${id}')">🗑️</button>
            </div>
            <span class="task-tag">${data.tag || '일반'}</span>
            <h4 style="margin:0 0 0.5rem 0; font-size:1rem; padding-right:2rem;">${data.title}</h4>
            <p style="margin:0; font-size:0.8rem; color:gray;">${data.description || ''}</p>
        `;"""
content = content.replace(bad_card, good_card)

# Fix 4: html += in 지출결의
bad_qna1 = """                        html += 
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#fee2e2; color:#991b1b; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;">지출결의</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);"> | </span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);"></span>
                            </div>
                            <div style="background:#f8fafc; padding:1rem; border-radius:6px; margin-bottom:1rem;">
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>💰 결제 요청액:</strong> 원</p>
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>🏦 지급처/계좌:</strong> </p>
                                <p style="margin:0; font-size:0.9rem;"><strong>📅 결제 요청일:</strong> </p>
                            </div>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;"></p>
                        </div>;"""
good_qna1 = """                        html += `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#fee2e2; color:#991b1b; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;">지출결의</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);">${dt.author} | ${dstr}</span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);">${dt.status || '대기중'}</span>
                            </div>
                            <div style="background:#f8fafc; padding:1rem; border-radius:6px; margin-bottom:1rem;">
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>💰 결제 요청액:</strong> ${dt.expenseAmount} 원</p>
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>🏦 지급처/계좌:</strong> ${dt.expensePayee}</p>
                                <p style="margin:0; font-size:0.9rem;"><strong>📅 결제 요청일:</strong> ${dt.expenseDate}</p>
                            </div>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;">${dt.memo || '(내용 없음)'}</p>
                        </div>`;"""
content = content.replace(bad_qna1, good_qna1)

# Fix 5: html += general support
bad_qna2 = """                        html += 
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#dbeafe; color:#1e40af; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;"> 요청</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);"> | </span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);"></span>
                            </div>
                            <p style="margin:0 0 0.5rem 0; font-size: 0.9rem;"><strong>수량/예산:</strong> </p>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;"></p>
                        </div>;"""
good_qna2 = """                        html += `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#dbeafe; color:#1e40af; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;">${dt.supportCategory} 요청</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);">${dt.author} | ${dstr}</span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);">${dt.status || '대기중'}</span>
                            </div>
                            <p style="margin:0 0 0.5rem 0; font-size: 0.9rem;"><strong>수량/예산:</strong> ${dt.generalAmount}</p>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;">${dt.memo || '(내용 없음)'}</p>
                        </div>`;"""
content = content.replace(bad_qna2, good_qna2)


# Fix 6: AI results
bad_ai_text = """            document.getElementById('aiResultText').innerHTML = 
                <strong>[식별된 주요 객체]</strong><br>
                - 작업자 3명 (안전모 착용 상태 불량 1건)<br>
                - 철근 자재 적재 상태 (양호)<br>
                - 콘크리트 타설 준비 (완료)<br><br>
                <strong>[AI 공정 분석]</strong><br>
                현재 공정은 약 35% 진행 중이며, 기상 악화 시 지연 우려가 있습니다.
            ;"""
good_ai_text = """            document.getElementById('aiResultText').innerHTML = `
                <strong>[식별된 주요 객체]</strong><br>
                - 작업자 3명 (안전모 착용 상태 불량 1건)<br>
                - 철근 자재 적재 상태 (양호)<br>
                - 콘크리트 타설 준비 (완료)<br><br>
                <strong>[AI 공정 분석]</strong><br>
                현재 공정은 약 35% 진행 중이며, 기상 악화 시 지연 우려가 있습니다.
            `;"""
content = content.replace(bad_ai_text, good_ai_text)

# Fix 7: name: [AI분석]
content = content.replace("name: [AI분석] ,", "name: `[AI분석] ${file.name}`,")

# Fix 8: alert
bad_alert = "        alert([업로드 시뮬레이션]\\n\\n파일명: \\nFirebase Storage 보안 규칙을 우회하여 DB 메타데이터로 안전하게 가상 업로드합니다.);"
good_alert = "        alert(`[업로드 시뮬레이션]\\n\\n파일명: ${file.name}\\nFirebase Storage 보안 규칙을 우회하여 DB 메타데이터로 안전하게 가상 업로드합니다.`);"
content = content.replace(bad_alert, good_alert)

# Fix 9: files table
bad_files = """                html += 
                    <tr>
                        <td style="padding: 1rem; font-weight: 500;">
                            📄 
                            
                        </td>
                        <td style="padding: 1rem;"></td>
                        <td style="padding: 1rem;"><a href="" onclick="alert('다운로드 데모입니다.')" style="color:var(--primary-color);">다운로드</a></td>
                        <td style="padding: 1rem;"><button class="btn-primary" style="background:#ef4444; padding:0.25rem 0.5rem;" onclick="window.delFile('')">삭제</button></td>
                    </tr>
                ;"""
good_files = """                html += `
                    <tr>
                        <td style="padding: 1rem; font-weight: 500;">
                            📄 ${data.name || '알 수 없는 파일'}
                            ${data.isAiGenerated ? '<br><span style="font-size:0.75rem; color:#10b981;">(AI 분석 리포트)</span>' : ''}
                        </td>
                        <td style="padding: 1rem;">${data.uploader || '알 수 없음'}</td>
                        <td style="padding: 1rem;"><a href="${data.url}" onclick="alert('다운로드 데모입니다.')" style="color:var(--primary-color);">다운로드</a></td>
                        <td style="padding: 1rem;"><button class="btn-primary" style="background:#ef4444; padding:0.25rem 0.5rem;" onclick="window.delFile('${d.id}')">삭제</button></td>
                    </tr>
                `;"""
content = content.replace(bad_files, good_files)

with open('admin/project-detail.html', 'w', encoding='utf-8') as f:
    f.write(content)
