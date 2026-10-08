import { db } from './firebase-config.js';
import {
    collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';

// 업무 생성
export const createTask = async (taskData) => {
    try {
        const docRef = await addDoc(collection(db, 'tasks'), {
            ...taskData,
            status: taskData.status || 'PENDING',
            progress: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 타임라인 로그 기록
        await logTaskAction(docRef.id, taskData.createdBy, 'CREATE', null, 'Task Created');

        return docRef.id;
    } catch (error) {
        console.error("Error creating task:", error);
        throw error;
    }
};

// 상위 업무에 하위 업무 추가 (팀장 -> 직원)
export const createSubTask = async (parentTaskId, taskData) => {
    return await createTask({
        ...taskData,
        parentTaskId
    });
};

// 내 업무 또는 팀 업무 조회
export const getTasks = async (queryConstraints = []) => {
    try {
        const q = query(collection(db, 'tasks'), ...queryConstraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw error;
    }
};

// 업무 상세 조회
export const getTaskDetails = async (taskId) => {
    try {
        const taskSnap = await getDoc(doc(db, 'tasks', taskId));
        if (!taskSnap.exists()) return null;
        return { id: taskSnap.id, ...taskSnap.data() };
    } catch (error) {
        console.error("Error fetching task details:", error);
        throw error;
    }
};

// 업무 상태/진행률 변경
export const updateTask = async (taskId, userId, updates) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        updates.updatedAt = serverTimestamp();
        await updateDoc(taskRef, updates);

        // 로그 기록
        await logTaskAction(taskId, userId, 'UPDATE', null, JSON.stringify(updates));

        return true;
    } catch (error) {
        console.error("Error updating task:", error);
        throw error;
    }
};

// 결과 보고서 작성
export const submitTaskReport = async (taskId, reportData) => {
    try {
        await addDoc(collection(db, 'task_reports'), {
            ...reportData,
            taskId,
            createdAt: serverTimestamp()
        });

        // 메인 업무 상태를 '완료(대기)' 또는 진행률 업데이트 (보고서와 동기화)
        if (reportData.progress !== undefined) {
            await updateDoc(doc(db, 'tasks', taskId), {
                progress: reportData.progress,
                status: reportData.progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
                updatedAt: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error("Error submitting report:", error);
        throw error;
    }
};

// 타임라인(Audit Log) 추가
export const logTaskAction = async (taskId, userId, action, prevValue, newValue) => {
    try {
        await addDoc(collection(db, 'task_logs'), {
            taskId,
            userId,
            action,
            previousValue: prevValue || '',
            newValue: newValue || '',
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Logging error", e);
    }
};

// 댓글 작성
export const addTaskComment = async (taskId, userId, content) => {
    try {
        await addDoc(collection(db, 'task_comments'), {
            taskId,
            userId,
            content,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};
