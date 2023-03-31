import {
  unstable_IdlePriority as IdlePriority,
  unstable_LowPriority as LowPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_cancelCallback as cancelCallback,
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  CallbackNode,
} from "scheduler";
import "./style.css";

type Priority =
  | typeof IdlePriority
  | typeof LowPriority
  | typeof NormalPriority
  | typeof UserBlockingPriority
  | typeof ImmediatePriority;

// 本次 scheduler 进行时，正在执行的 调度的优先级, 相对于本次的上一次
let prevPriority: Priority = IdlePriority;
// 当前被调度的回调函数
let curCallback: CallbackNode | null = null;
interface Work {
  count: number;
  priority: Priority;
}
// const work: Work = { count: 100 };
const workList: Work[] = [];
const app = document.querySelector<HTMLDivElement>("#app");
const btn = document.createElement("button");
btn.innerHTML = "执行更新";
app!.appendChild(btn);

const insertItem = (content: number) => {
  const span = document.createElement("span");
  span.innerHTML = `${content}`;
  app?.appendChild(span);
};

// 调度
function scheduler() {
  // 当前可能存在正在调度的回调
  const cbNode = getFirstCallbackNode();

  // 之前 const curWork1 = workList.pop();
  // 取出最高的优先级
  const curWork = workList.sort((a, b) => {
    return a.priority - b.priority;
  })[0];
  // 策略逻辑
  if (!curWork) {
    // 没有任务，取消调度
    cbNode && cancelCallback(cbNode);
    return;
  }
  const { priority: curPriority } = curWork;
  if (curPriority === prevPriority) {
    // 优先级相同，不用打断
    return;
  }

  // 已经到这里了  肯定是高优先级  所以下面的条件可以没有   直接执行  cbNode && cancelCallback(cbNode)
  if (curPriority > prevPriority) {
    // 优先级更高，打断
    cbNode && cancelCallback(cbNode);
  }
  // 之前的逻辑  perform(curWork);
  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

// 更新流程
function perform(work: Work, didTimeout?: boolean) {
  // needSync 同步执行
  // didTimeout = true 当前任务已经过期，需要同步执行
  const needSync = work.priority === ImmediatePriority || didTimeout;
  while ((needSync || !shouldYield()) && work.count) {
    // 1. 调度器只给 5mm 的时间，如果超过了，就会被打断
    // 2. work.count === 0 说明任务已经完成, 被打断
    work.count--;
    insertItem(work.priority);
  }

  // 此时中断了, prevPriority 重新赋值
  prevPriority = work.priority;

  if (!work.count) {
    // 当前 work 任务完成
    // 从 workList 中移除
    workList.splice(workList.indexOf(work), 1);
    prevPriority = IdlePriority;
  }

  const prevCallback = curCallback;
  // 再次调度
  scheduler();
  const newCallback = curCallback;
  if (newCallback && prevCallback === prevCallback) {
    /**
     * 同一个 work
     * 不用的再次进入 调度器
     * 同一个任务，不用再次进入调度器
     * 这里同步执行
     * 当 时间 5mm 时，打断此流程，会再次进入调度器
     */
    return perform.bind(null, work);
  }
}

// 交互
btn.onclick = () => {
  const newWork: Work = { count: 100 };
  workList.unshift(newWork);
  scheduler();
};
