import { db } from './firebase-config.js';
import {
    collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';
import { getCurrentStoreInfo, getStoreSubcollection, getStoreDocRef } from './tenant-router.js';

function resolveStoreId(customStoreId) {
    if (customStoreId && customStoreId !== 'ALL') return String(customStoreId);
    return getCurrentStoreInfo().storeId;
}

// 업무 생성 (가맹점별 전용 DB 테이블 merchants/{storeId}/tasks 에 저장)
export const createTask = async (taskData, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId || taskData.merchantId || taskData.tenantId);
        const payload = {
            ...taskData,
            tenantId: storeId,
            merchantId: storeId,
            status: taskData.status || 'PENDING',
            progress: (taskData.progress !== undefined) ? taskData.progress : 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // 1. Save to dedicated store table: merchants/{storeId}/tasks
        const storeTasksRef = getStoreSubcollection('tasks', storeId);
        const docRef = await addDoc(storeTasksRef, payload);

        // 2. Also keep mirrored in root tasks for backwards compatibility
        try {
            await setDoc(doc(db, 'tasks', docRef.id), payload);
        } catch (e) {}

        // 타임라인 로그 기록
        await logTaskAction(docRef.id, taskData.createdBy || '', 'CREATE', '', 'Task Created', storeId);

        return docRef.id;
    } catch (error) {
        console.error("Error creating task:", error);
        throw error;
    }
};

// 상위 업무에 하위 업무 추가 (팀장 -> 직원)
export const createSubTask = async (parentTaskId, taskData, explicitStoreId) => {
    return await createTask({
        ...taskData,
        parentTaskId
    }, explicitStoreId);
};

// 내 업무 또는 팀 업무 조회
export const getTasks = async (queryConstraints = [], explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        const storeTasksRef = getStoreSubcollection('tasks', storeId);
        const q = query(storeTasksRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw error;
    }
};

// 업무 상세 조회
export const getTaskDetails = async (taskId, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        const taskSnap = await getDoc(getStoreDocRef('tasks', taskId, storeId));
        if (taskSnap.exists()) {
            return { id: taskSnap.id, ...taskSnap.data() };
        }
        // Fallback to root collection
        const rootSnap = await getDoc(doc(db, 'tasks', taskId));
        if (rootSnap.exists()) {
            return { id: rootSnap.id, ...rootSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching task details:", error);
        throw error;
    }
};

// 업무 상태/진행률 변경
export const updateTask = async (taskId, userId, updates, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        updates.updatedAt = serverTimestamp();

        // 1. Update in dedicated store table
        try {
            await updateDoc(getStoreDocRef('tasks', taskId, storeId), updates);
        } catch (e) {}

        // 2. Update in root table
        try {
            await updateDoc(doc(db, 'tasks', taskId), updates);
        } catch (e) {}

        // 로그 기록
        await logTaskAction(taskId, userId || '', 'UPDATE', '', JSON.stringify(updates), storeId);

        return true;
    } catch (error) {
        console.error("Error updating task:", error);
        throw error;
    }
};

// 결과 보고서 작성
export const submitTaskReport = async (taskId, reportData, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        await addDoc(collection(db, 'task_reports'), {
            ...reportData,
            taskId,
            tenantId: storeId,
            merchantId: storeId,
            submittedBy: reportData.submittedBy || '',
            submittedByName: reportData.submittedByName || '직원',
            createdAt: serverTimestamp()
        });

        // 메인 업무 상태를 '완료(대기)' 또는 진행률 업데이트 (보고서와 동기화)
        if (reportData.progress !== undefined) {
            const updates = {
                progress: reportData.progress,
                status: reportData.progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
                updatedAt: serverTimestamp()
            };
            try {
                await updateDoc(getStoreDocRef('tasks', taskId, storeId), updates);
            } catch (e) {}
            try {
                await updateDoc(doc(db, 'tasks', taskId), updates);
            } catch (e) {}
        }

        return true;
    } catch (error) {
        console.error("Error submitting report:", error);
        throw error;
    }
};

// 타임라인(Audit Log) 추가
export const logTaskAction = async (taskId, userId, action, prevValue, newValue, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        await addDoc(collection(db, 'task_logs'), {
            taskId: taskId || '',
            tenantId: storeId,
            merchantId: storeId,
            userId: userId || '',
            action: action || '',
            previousValue: prevValue || '',
            newValue: newValue || '',
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Logging error", e);
    }
};

// 댓글 작성
export const addTaskComment = async (taskId, userId, content, explicitStoreId) => {
    try {
        const storeId = resolveStoreId(explicitStoreId);
        await addDoc(collection(db, 'task_comments'), {
            taskId,
            tenantId: storeId,
            merchantId: storeId,
            userId,
            content,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};
