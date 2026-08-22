// 内存任务存储（Render 单实例，重启即清空，符合无状态部署）
const tasks = new Map();

export function createTask() {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const task = {
    id,
    status: 'pending', // pending | running | done | error
    progress: 0,
    step: '',
    result: null,
    error: null,
  };
  tasks.set(id, task);
  return task;
}

export function getTask(id) {
  return tasks.get(id) || null;
}

export function updateTask(id, patch) {
  const t = tasks.get(id);
  if (!t) return;
  Object.assign(t, patch);
}

export function setProgress(id, progress, step) {
  const t = tasks.get(id);
  if (!t) return;
  t.progress = progress;
  if (step !== undefined) t.step = step;
}
