type Notice = { text: string; priority: number };
let current: Notice | undefined;
const queue: Notice[] = [];
const recent = new Map<string, number>();
const element = (id: string) => document.getElementById(id)!;
export function renderNotices() {
  const modal = element('modal') as HTMLDialogElement | null;
  const playing = document.body.classList.contains('playing');
  const destination = modal?.open ? 'modal-notice' : playing ? 'notifications' : 'welcome-notice';
  for (const id of ['notifications', 'modal-notice', 'welcome-notice']) {
    const node = element(id); if (!node) continue;
    const show = !!current && id === destination;
    node.hidden = !show;
    const text = show ? `${current!.priority ? 'ⓘ' : '✓'} ${current!.text}` : '';
    if (node.textContent !== text) node.textContent = text;
  }
  const tutorial = element('tutorial'), advice = element('tutorial-advice');
  if (tutorial && advice) { tutorial.hidden = advice.hidden && !(current && destination === 'notifications'); tutorial.classList.toggle('advice-open', !advice.hidden); }
}
export function setTutorialVisible(visible: boolean) { element('tutorial-advice').hidden = !visible; renderNotices(); }
function next() {
  current = queue.shift(); renderNotices();
  if (current) setTimeout(next, 4000);
}
export function enqueueNotice(text: string) {
  const now = Date.now();
  if (text === current?.text || queue.some(n => n.text === text) || now - (recent.get(text) ?? 0) < 4500) return;
  recent.set(text, now); if (recent.size > 40) recent.delete(recent.keys().next().value!);
  const notice = { text, priority: /no |inválid|necesit|acércate|elige|zona segura|lleno|fuera|requiere|error|compra y vende/i.test(text) ? 1 : 0 };
  queue.push(notice); queue.sort((a, b) => b.priority - a.priority); queue.splice(3);
  if (!current) next();
}
export function observeNoticeLocation() {
  new MutationObserver(renderNotices).observe(element('modal'), { attributes: true, attributeFilter: ['open'] });
}
